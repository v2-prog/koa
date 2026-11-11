import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, type Plugin } from "vite";
// @ts-expect-error plain JS module shared with the rules check
import { META_CSP } from "./scripts/csp.mjs";
// @ts-expect-error plain JS module
import { CDN, NO_CDN } from "./scripts/copy-ocr-assets.mjs";

/** Rewrites tesseract.js's CDN fallback to a dead path on this site. */
function noCdn(): Plugin {
  return {
    name: "koa:no-cdn",
    enforce: "pre",
    transform(code, id) {
      if (!id.includes("node_modules/tesseract.js/")) return null;
      return { code: code.replace(CDN as RegExp, NO_CDN as string), map: null };
    },
  };
}

/**
 * Writes the content-security policy into the built page. Dev is left alone,
 * because the dev server needs its own inline script and socket.
 */
function cspMeta(): Plugin {
  return {
    name: "koa:csp-meta",
    apply: "build",
    transformIndexHtml() {
      return [
        {
          tag: "meta",
          attrs: { "http-equiv": "Content-Security-Policy", content: META_CSP as string },
          injectTo: "head-prepend",
        },
      ];
    },
  };
}

export default defineConfig({
  optimizeDeps: { exclude: ["tesseract.js"] },
  plugins: [
    noCdn(),
    tanstackRouter({ target: "react", autoCodeSplitting: true }),
    react(),
    tailwindcss(),
    cspMeta(),
  ],
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  build: {
    target: "es2022",
    sourcemap: false,
  },
});
