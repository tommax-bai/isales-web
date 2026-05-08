<template>
  <div ref="hostRef" class="code-editor" :style="{ height: height + 'px' }" />
</template>

<script setup lang="ts">
import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import { html as htmlLang } from "@codemirror/lang-html";
import { json as jsonLang } from "@codemirror/lang-json";
import { bracketMatching, foldGutter, foldKeymap } from "@codemirror/language";
import { Compartment, EditorState, type Extension, RangeSet } from "@codemirror/state";
import {
  Decoration,
  type DecorationSet,
  EditorView,
  highlightActiveLine,
  keymap,
  lineNumbers,
  ViewPlugin,
  type ViewUpdate,
} from "@codemirror/view";
import { onBeforeUnmount, onMounted, ref, watch } from "vue";

type Mode = "json" | "jinja2";

const props = withDefaults(
  defineProps<{
    modelValue: string;
    mode: Mode;
    height?: number;
    placeholder?: string;
  }>(),
  { height: 200, placeholder: "" },
);

const emit = defineEmits<{
  (e: "update:modelValue", value: string): void;
}>();

const hostRef = ref<HTMLDivElement | null>(null);
let view: EditorView | null = null;
const langCompartment = new Compartment();

onMounted(() => {
  if (!hostRef.value) return;
  view = new EditorView({
    parent: hostRef.value,
    state: EditorState.create({
      doc: props.modelValue,
      extensions: buildExtensions(props.mode),
    }),
  });
});

onBeforeUnmount(() => {
  view?.destroy();
  view = null;
});

watch(
  () => props.modelValue,
  (next) => {
    if (!view) return;
    if (next === view.state.doc.toString()) return;
    view.dispatch({
      changes: { from: 0, to: view.state.doc.length, insert: next },
    });
  },
);

watch(
  () => props.mode,
  (mode) => {
    if (!view) return;
    view.dispatch({
      effects: langCompartment.reconfigure(buildLangExtension(mode)),
    });
  },
);

function buildExtensions(mode: Mode): Extension[] {
  return [
    lineNumbers(),
    foldGutter(),
    history(),
    bracketMatching(),
    highlightActiveLine(),
    keymap.of([...defaultKeymap, ...historyKeymap, ...foldKeymap]),
    langCompartment.of(buildLangExtension(mode)),
    EditorView.updateListener.of((update: ViewUpdate) => {
      if (update.docChanged) {
        emit("update:modelValue", update.state.doc.toString());
      }
    }),
  ];
}

function buildLangExtension(mode: Mode): Extension {
  if (mode === "json") return jsonLang();
  // Jinja2 mode: use HTML grammar as the host plus a decoration plugin
  // that highlights {{ ... }} expressions and {% ... %} tags. lang-jinja
  // third-party packages are not actively maintained — this gives a
  // good-enough visual cue.
  return [htmlLang(), jinja2HighlightPlugin];
}

const jinja2Decorations: Decoration[] = [
  Decoration.mark({ class: "cm-jinja-expr" }),
  Decoration.mark({ class: "cm-jinja-tag" }),
];

const jinja2HighlightPlugin = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;
    constructor(view: EditorView) {
      this.decorations = buildJinjaDecorations(view);
    }
    update(update: ViewUpdate) {
      if (update.docChanged || update.viewportChanged) {
        this.decorations = buildJinjaDecorations(update.view);
      }
    }
  },
  {
    decorations: (v) => v.decorations,
  },
);

function buildJinjaDecorations(view: EditorView): DecorationSet {
  const ranges: { from: number; to: number; deco: Decoration }[] = [];
  const text = view.state.doc.toString();
  pushAll(ranges, text, /\{\{[^}]*\}\}/g, jinja2Decorations[0]);
  pushAll(ranges, text, /\{%[^%]*%\}/g, jinja2Decorations[1]);
  return RangeSet.of(
    ranges
      .sort((a, b) => a.from - b.from)
      .map((r) => r.deco.range(r.from, r.to)),
    true,
  );
}

function pushAll(
  out: { from: number; to: number; deco: Decoration }[],
  text: string,
  re: RegExp,
  deco: Decoration,
): void {
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    out.push({ from: m.index, to: m.index + m[0].length, deco });
  }
}
</script>

<style scoped>
.code-editor {
  border: 1px solid var(--el-border-color);
  border-radius: 4px;
  overflow: hidden;
  font-family:
    ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono",
    "Courier New", monospace;
  font-size: 13px;
}
.code-editor :deep(.cm-editor) {
  height: 100%;
}
.code-editor :deep(.cm-jinja-expr) {
  color: #c41d7f;
  background-color: #fff0f6;
  border-radius: 2px;
}
.code-editor :deep(.cm-jinja-tag) {
  color: #1d4eb8;
  background-color: #e6f4ff;
  border-radius: 2px;
}
</style>
