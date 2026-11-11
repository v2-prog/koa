/**
 * Reads the words in a picture, on this device.
 *
 * The reader is Tesseract (through tesseract.js), compiled to WebAssembly. Its
 * worker, its engine and its English model are files in this app's own
 * /ocr folder, copied there at build time by scripts/copy-ocr-assets.mjs. The
 * picture is handed to a worker in this browser and goes nowhere else.
 *
 * The reader is loaded the first time a picture is read, so people who never
 * capture anything never download it.
 */

import type { Worker } from "tesseract.js";

export type ReadProgress = { stage: "starting" | "reading"; ratio: number };

type Listener = (progress: ReadProgress) => void;

let worker: Promise<Worker> | null = null;
let listener: Listener | null = null;

function assets(): string {
  return `${import.meta.env.BASE_URL}ocr`;
}

function getWorker(): Promise<Worker> {
  if (worker) return worker;
  const starting = (async () => {
    const { createWorker } = await import("tesseract.js");
    return createWorker("eng", 1, {
      workerPath: `${assets()}/worker.min.js`,
      corePath: `${assets()}/core`,
      langPath: `${assets()}/lang`,
      // Load the worker file directly. A blob worker would need a looser content-security policy.
      workerBlobURL: false,
      gzip: true,
      // Leave the model in the browser's ordinary cache. koa's own storage holds only what a person writes.
      cacheMethod: "none",
      logger: (message: { status: string; progress: number }) => {
        const reading = message.status === "recognizing text";
        listener?.({ stage: reading ? "reading" : "starting", ratio: message.progress });
      },
    });
  })();
  worker = starting;
  // A failed start should not poison the next try.
  starting.catch(() => {
    if (worker === starting) worker = null;
  });
  return starting;
}

export type ReadResult = { text: string; confidence: number };

/** Reads one picture. `onProgress` is called as the reader works. */
export async function readPicture(picture: Blob, onProgress?: Listener): Promise<ReadResult> {
  listener = onProgress ?? null;
  try {
    const reader = await getWorker();
    const { data } = await reader.recognize(picture);
    return { text: data.text ?? "", confidence: data.confidence ?? 0 };
  } finally {
    listener = null;
  }
}

/** Shuts the reader down and frees its memory. */
export async function stopReader(): Promise<void> {
  const current = worker;
  worker = null;
  if (!current) return;
  try {
    await (await current).terminate();
  } catch {
    // Already gone.
  }
}
