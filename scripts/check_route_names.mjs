#!/usr/bin/env node
// Lint: router.push({ name: X }) / router.replace({ name: X }) / to: { name: X }
// 的 name 必须存在于 src/router/index.ts 的路由定义里。
// 用法: node scripts/check_route_names.mjs (exit 0 = clean, 1 = mismatch)

import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const ROUTER = join(ROOT, "src/router/index.ts");

// 1. 提取路由 name 定义
const routerSrc = readFileSync(ROUTER, "utf8");
const definedNames = new Set();
for (const m of routerSrc.matchAll(/^\s*name:\s*["']([\w-]+)["']/gm)) {
  definedNames.add(m[1]);
}

// 2. 扫 src/**/*.{ts,vue} 找 push 的 name
const SRC = join(ROOT, "src");
const SKIP_DIRS = new Set(["node_modules", ".git", "dist"]);
function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    if (SKIP_DIRS.has(name)) continue;
    const p = join(dir, name);
    const s = statSync(p);
    if (s.isDirectory()) out.push(...walk(p));
    else if (/\.(ts|vue)$/.test(name)) out.push(p);
  }
  return out;
}

// match `{ name: "foo" }` and `{ name: 'foo' }` even across whitespace,
// only when surrounded by router.push / router.replace / to: context
const PUSH_RX = /(?:router\.(?:push|replace)|to\s*:|to\s*=\s*)\s*\{\s*name\s*:\s*["']([\w-]+)["']/g;

const mismatches = [];
for (const file of walk(SRC)) {
  if (file === ROUTER) continue;
  const src = readFileSync(file, "utf8");
  for (const m of src.matchAll(PUSH_RX)) {
    const used = m[1];
    if (!definedNames.has(used)) {
      // 找行号
      const before = src.slice(0, m.index);
      const line = before.split("\n").length;
      mismatches.push({ file: file.replace(ROOT + "/", "").replace(/\\/g, "/"), line, used });
    }
  }
}

if (mismatches.length === 0) {
  console.log(`✓ route name lint clean — ${definedNames.size} 个定义 / 全部 router.push name 在定义集合中`);
  process.exit(0);
}

console.log(`✗ ${mismatches.length} 处 route name 不在路由定义中:`);
for (const m of mismatches) {
  console.log(`  ${m.file}:${m.line}  name: "${m.used}"`);
}
console.log("\n已定义的 name (前 20):", [...definedNames].slice(0, 20).join(", "));
process.exit(1);
