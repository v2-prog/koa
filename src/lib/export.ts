/**
 * Getting things off the device. Every function here runs only when a person
 * presses a button, and each one hands a file to the browser's own save
 * dialog. Nothing is uploaded and nothing is sent.
 */

import { captureText, exportStem, fileExtension, type Capture, type Folder } from "./captures.ts";
import type { FileInput } from "./library.ts";
import { makeZip, uniqueNames } from "./zip.ts";

export type OutFile = { name: string; blob: Blob };

/** Hands one file to the browser to save. */
export function saveFile(blob: Blob, name: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.rel = "noopener";
  document.body.append(link);
  link.click();
  link.remove();
  // Give the browser a moment to start the save before the link is withdrawn.
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

type DirectoryHandle = {
  getFileHandle(name: string, options: { create: boolean }): Promise<{
    createWritable(): Promise<{ write(data: Blob): Promise<void>; close(): Promise<void> }>;
  }>;
};

type PickerWindow = Window & {
  showDirectoryPicker?: (options?: { mode?: "readwrite" }) => Promise<DirectoryHandle>;
};

/** True when this browser can write straight into a folder the person picks. */
export function canPickFolder(): boolean {
  return typeof window !== "undefined" && typeof (window as PickerWindow).showDirectoryPicker === "function";
}

/** Writes files into a real folder the person chooses. */
export async function saveIntoPickedFolder(files: OutFile[]): Promise<"saved" | "cancelled"> {
  const picker = (window as PickerWindow).showDirectoryPicker;
  if (!picker) return "cancelled";
  let directory: DirectoryHandle;
  try {
    directory = await picker.call(window, { mode: "readwrite" });
  } catch {
    return "cancelled";
  }
  for (const file of files) {
    const handle = await directory.getFileHandle(file.name, { create: true });
    const writable = await handle.createWritable();
    await writable.write(file.blob);
    await writable.close();
  }
  return "saved";
}

/**
 * Everything in one folder as files: a text note for each capture, the kept
 * picture or document beside it, and a contents list.
 */
export async function folderFiles(
  folder: Folder,
  captures: Capture[],
  fileFor: (id: string) => Promise<FileInput | null>,
  attachedTo: (capture: Capture) => string,
): Promise<OutFile[]> {
  const out: OutFile[] = [];
  const contents = [`${folder.name}: ${captures.length} ${captures.length === 1 ? "capture" : "captures"}`, ""];
  for (const capture of captures) {
    const stem = exportStem(capture);
    out.push({
      name: `${stem}.txt`,
      blob: new Blob([captureText(capture, folder.name, attachedTo(capture))], { type: "text/plain;charset=utf-8" }),
    });
    contents.push(`${capture.date}  ${capture.title}${capture.amount ? `  ${capture.amount}` : ""}`);
    if (capture.file) {
      const kept = await fileFor(capture.id);
      if (kept) out.push({ name: `${stem}.${fileExtension(capture.file)}`, blob: kept.blob });
    }
  }
  contents.push("", "Saved from koa on one device. Australia only. General information, not tax, legal or financial advice.");
  out.unshift({ name: "contents.txt", blob: new Blob([contents.join("\n")], { type: "text/plain;charset=utf-8" }) });
  const names = uniqueNames(out.map((file) => file.name));
  return out.map((file, index) => ({ ...file, name: names[index] }));
}

/** The same files as one ZIP, for browsers that cannot write into a folder. */
export async function zipFiles(files: OutFile[]): Promise<Blob> {
  const entries = await Promise.all(
    files.map(async (file) => ({ name: file.name, data: new Uint8Array(await file.blob.arrayBuffer()) })),
  );
  return new Blob([makeZip(entries) as BlobPart], { type: "application/zip" });
}
