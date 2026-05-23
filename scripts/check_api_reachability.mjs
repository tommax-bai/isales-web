#!/usr/bin/env node
// 端点可达性矩阵：扫 src/**/*.{ts,vue} 找所有 apiClient.{get,post,patch,put,delete}(...)
// 调用，提取 URL 模板，逐个 HTTP 探测。
// 用法:
//   node scripts/check_api_reachability.mjs                  # 默认 http://121.89.85.150/api
//   node scripts/check_api_reachability.mjs --endpoint=...   # 自定义
// 退出码: 0 = 全部 mount (200/401/422)，1 = 有 404 (dead link)。

import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SRC = join(ROOT, "src");

const endpointArg = process.argv.find((a) => a.startsWith("--endpoint="));
const ENDPOINT = endpointArg
  ? endpointArg.slice("--endpoint=".length).replace(/\/$/, "")
  : "http://121.89.85.150/api";

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

// match: apiClient[whitespace].<method>(<...>?(  "..."|'...'|`...`  ...))
// 用宽松匹配；apiClient 和 .method 之间允许 newline/缩进（多行链式调用常见）；
// type generics 可选；URL 可以是字符串或 template literal。
const CALL_RX =
  /apiClient\s*\.\s*(get|post|put|patch|delete)(?:<[^>]*>)?\s*\(\s*(["'`])([^"'`]+?)\2/g;

const calls = new Map(); // key = `${METHOD} ${path}`, value = {sourceFiles:Set, method, path}
let skipped = 0;

for (const file of walk(SRC)) {
  const src = readFileSync(file, "utf8");
  for (const m of src.matchAll(CALL_RX)) {
    const method = m[1].toUpperCase();
    let path = m[3];
    // template literal 含 ${...} → 简单 substitute 成 1
    if (path.includes("${")) {
      path = path.replace(/\$\{[^}]+\}/g, "1");
    }
    // 排除明显不是 URL 的（动态拼）
    if (!path.startsWith("/")) {
      skipped++;
      continue;
    }
    const key = `${method} ${path}`;
    if (!calls.has(key)) {
      calls.set(key, { method, path, files: new Set() });
    }
    calls.get(key).files.add(file.replace(ROOT + "/", "").replace(/\\/g, "/"));
  }
}

console.log(`扫到 ${calls.size} 个独立 (method, path) 调用，跳过 ${skipped} 个动态拼接\n`);
console.log(`探测端点: ${ENDPOINT} (未带 JWT — 401/422 算 mount OK; 404 = dead)\n`);

const rows = [];
for (const { method, path, files } of calls.values()) {
  const url = `${ENDPOINT}${path}`;
  let code;
  try {
    const res = await fetch(url, { method, signal: AbortSignal.timeout(8000) });
    code = res.status;
  } catch (err) {
    code = `ERR ${err.message.slice(0, 30)}`;
  }
  rows.push({ method, path, code, files: [...files] });
}

// 排序: 404 在前
rows.sort((a, b) => {
  const aIs404 = a.code === 404 ? 0 : 1;
  const bIs404 = b.code === 404 ? 0 : 1;
  return aIs404 - bIs404 || a.path.localeCompare(b.path);
});

const verdict = (code) => {
  if (code === 404) return "✗ DEAD";
  if (code === 401) return "✓ auth";
  if (code === 422) return "✓ body-required";
  if (code === 405) return "⚠ method";
  if (code >= 200 && code < 300) return "✓ open";
  if (typeof code === "string" && code.startsWith("ERR")) return "⚠ err";
  return `? ${code}`;
};

const padR = (s, n) => String(s).padEnd(n);
console.log(padR("VERDICT", 18) + padR("METHOD", 8) + "PATH");
console.log("─".repeat(70));
for (const r of rows) {
  console.log(padR(verdict(r.code), 18) + padR(r.method, 8) + r.path);
}

const dead = rows.filter((r) => r.code === 404);
console.log("\n汇总:");
console.log(`  ✗ DEAD (404): ${dead.length}`);
console.log(`  ✓ OK (401/422/2xx): ${rows.filter((r) => [401, 422].includes(r.code) || (r.code >= 200 && r.code < 300)).length}`);
console.log(`  其他 (5xx / 405 / 网络): ${rows.length - dead.length - rows.filter((r) => [401, 422].includes(r.code) || (r.code >= 200 && r.code < 300)).length}`);

if (dead.length > 0) {
  console.log("\nDEAD links 的源文件:");
  for (const r of dead) {
    console.log(`  ${r.method} ${r.path}`);
    for (const f of r.files) console.log(`    ← ${f}`);
  }
  process.exit(1);
}
process.exit(0);
