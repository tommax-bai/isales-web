import { fileURLToPath, URL } from "node:url";

import vue from "@vitejs/plugin-vue";
import AutoImport from "unplugin-auto-import/vite";
import { ElementPlusResolver } from "unplugin-vue-components/resolvers";
import Components from "unplugin-vue-components/vite";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [
    vue(),
    AutoImport({ resolvers: [ElementPlusResolver({ importStyle: "sass" })] }),
    Components({ resolvers: [ElementPlusResolver({ importStyle: "sass" })] }),
  ],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  css: {
    preprocessorOptions: {
      scss: {
        api: "modern-compiler",
        additionalData: `@use "@/styles/element-plus-theme.scss" as *;`,
      },
    },
  },
  server: {
    port: 5173,
    proxy: {
      "/api": { target: "http://localhost:8000", changeOrigin: true },
      "/ws": { target: "ws://localhost:8000", ws: true, changeOrigin: true },
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          // Pull the heaviest vendor packages into their own chunks so
          // initial-load pages don't drag in everything. echarts in
          // particular blew DashboardView past 500KB before this split.
          if (id.includes("node_modules/echarts") || id.includes("zrender")) {
            return "vendor-echarts";
          }
          if (id.includes("node_modules/element-plus")) {
            return "vendor-element-plus";
          }
          if (id.includes("node_modules/@codemirror") || id.includes("node_modules/@lezer")) {
            return "vendor-codemirror";
          }
          return undefined;
        },
      },
    },
    chunkSizeWarningLimit: 600,
  },
  test: {
    environment: "jsdom",
    globals: true,
    include: ["tests/**/*.{test,spec}.ts"],
    css: false,
    server: {
      // Force vitest to inline element-plus + auto-import shims so injected
      // CSS imports go through Vite's transform pipeline (which strips CSS
      // when `css: false`) instead of Node's native ESM loader.
      deps: { inline: [/element-plus/] },
    },
  },
});
