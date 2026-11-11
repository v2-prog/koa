/**
 * A copy of everything written in koa, as one text file the person saves
 * themselves. Pictures are not in it: they leave folder by folder, from the
 * Folders screen.
 */

import type { Capture, Folder } from "./captures.ts";

export type Backup = {
  app: "koa";
  savedOn: string;
  note: string;
  /** The ledger, the packs, the rings and the minutes. */
  written: Record<string, unknown>;
  folders: Folder[];
  captures: Capture[];
};

export function buildBackup(
  written: Record<string, unknown>,
  library: { folders: Folder[]; captures: Capture[] },
  today: string,
): string {
  const backup: Backup = {
    app: "koa",
    savedOn: today,
    note: "Saved from koa on one device. It holds what was written, not the pictures. It holds no tax file number. Australia only. General information, not tax, legal or financial advice.",
    written,
    folders: library.folders.filter((folder) => !folder.fixed),
    captures: library.captures,
  };
  return JSON.stringify(backup, null, 2);
}

/** A one-line count of what is on the device, for the device screen. */
export function countWritten(written: Record<string, unknown>): number {
  return Object.values(written).filter((value) => value !== null && value !== undefined).length;
}
