#!/usr/bin/env node
/**
 * Copies the on-device text reader into public/ocr so the app serves it from
 * its own origin. Nothing is fetched from a CDN at run time.
 *
 *   worker.min.js              tesseract.js browser worker
 *   core/*-lstm.wasm.js        the recogniser, three builds for three CPUs
 *   lang/eng.traineddata.gz    English model
 *
 * Runs on install and before dev and build. public/ocr is not checked in.
 */
import { copyFileSync, existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const modules = join(root, "node_modules");

export const OCR_FILES = [
  ["tesseract.js/dist/worker.min.js", "worker.min.js"],
  ["tesseract.js-core/tesseract-core-lstm.wasm.js", "core/tesseract-core-lstm.wasm.js"],
  ["tesseract.js-core/tesseract-core-simd-lstm.wasm.js", "core/tesseract-core-simd-lstm.wasm.js"],
  ["tesseract.js-core/tesseract-core-relaxedsimd-lstm.wasm.js", "core/tesseract-core-relaxedsimd-lstm.wasm.js"],
  ["@tesseract.js-data/eng/4.0.0_best_int/eng.traineddata.gz", "lang/eng.traineddata.gz"],
];

/**
 * tesseract.js falls back to the jsDelivr CDN when no path is given. koa
 * always gives its own paths, but the fallback is rewritten to a path on this
 * site that does not exist, so a mistake fails closed instead of calling out.
 */
export const CDN = /https:\/\/cdn\.jsdelivr\.net\/npm\//g;
export const NO_CDN = "/ocr/no-cdn/";

/** Cloudflare Pages refuses any single file larger than this. */
export const MAX_FILE_BYTES = 25 * 1024 * 1024;

function main() {
  if (!existsSync(join(modules, "tesseract.js"))) {
    // Installed with --omit or before dependencies exist. Dev and build run this again.
    console.log("ocr assets: tesseract.js is not installed yet, skipped.");
    return;
  }
  let bytes = 0;
  for (const [from, to] of OCR_FILES) {
    const source = join(modules, from);
    const target = join(root, "public", "ocr", to);
    if (!existsSync(source)) {
      console.error(`ocr assets: missing ${from}. Run npm install.`);
      process.exit(1);
    }
    const size = statSync(source).size;
    if (size > MAX_FILE_BYTES) {
      console.error(`ocr assets: ${from} is larger than the host allows for one file.`);
      process.exit(1);
    }
    mkdirSync(dirname(target), { recursive: true });
    if (target.endsWith(".js") && !target.includes("core")) {
      writeFileSync(target, readFileSync(source, "utf8").replace(CDN, NO_CDN));
    } else {
      copyFileSync(source, target);
    }
    bytes += size;
  }
  console.log(`ocr assets: ${OCR_FILES.length} files, ${(bytes / 1024 / 1024).toFixed(1)} MB, in public/ocr.`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main();
