/**
 * The capture library: folders, captures and kept files on this device.
 *
 * A small store with no framework in it. Screens read it through the hook in
 * use-library.ts. Every change is written to IndexedDB first, and the screen
 * only changes once the write has succeeded.
 */

import {
  captureProblem,
  folderProblem,
  MAX_FILE_BYTES,
  SHOEBOX,
  SHOEBOX_ID,
  sortFolders,
  tidyDraft,
  type Capture,
  type CaptureDraft,
  type Folder,
  type Side,
} from "./captures.ts";
import { refusalFor } from "./guards.ts";
import type { RecordStore } from "./idb.ts";
import { makeId } from "./ids.ts";

export type LibraryState = {
  ready: boolean;
  /** False when the browser cannot keep captures after the tab closes. */
  durable: boolean;
  folders: Folder[];
  captures: Capture[];
};

export type FileInput = { blob: Blob; name: string; type: string };

type StoredFile = { id: string; blob: Blob; name: string; type: string };

export type Saved<T> = { ok: true; value: T } | { ok: false; reason: string };

function fail(reason: string): { ok: false; reason: string } {
  return { ok: false, reason };
}

export type Library = ReturnType<typeof createLibrary>;

export function createLibrary(open: () => Promise<RecordStore>, now: () => string = () => new Date().toISOString()) {
  let state: LibraryState = { ready: false, durable: true, folders: [SHOEBOX], captures: [] };
  let store: Promise<RecordStore> | null = null;
  let loading: Promise<void> | null = null;
  const listeners = new Set<() => void>();

  function set(next: Partial<LibraryState>) {
    state = { ...state, ...next };
    for (const listener of listeners) listener();
  }

  function db(): Promise<RecordStore> {
    store ??= open();
    return store;
  }

  /** Reads everything from the device once. Safe to call from every screen. */
  function load(): Promise<void> {
    loading ??= (async () => {
      const records = await db();
      const folders = await records.getAll<Folder>("folders");
      const known = new Set([SHOEBOX_ID, ...folders.map((folder) => folder.id)]);
      const captures = (await records.getAll<Capture>("captures")).map((capture) =>
        known.has(capture.folderId) ? capture : { ...capture, folderId: SHOEBOX_ID },
      );
      set({ ready: true, durable: records.durable, folders: sortFolders([SHOEBOX, ...folders]), captures });
    })();
    return loading;
  }

  async function addCapture(draft: CaptureDraft, file?: FileInput | null): Promise<Saved<Capture>> {
    await load();
    const reason = captureProblem(draft);
    if (reason) return fail(reason);
    if (file && file.blob.size > MAX_FILE_BYTES) {
      return fail("That file is too large to keep here. Save the details without it, and keep the file where it is.");
    }
    if (file) {
      const nameRefusal = refusalFor(file.name);
      if (nameRefusal) return fail(nameRefusal);
    }
    const records = await db();
    const stamp = now();
    const capture: Capture = {
      ...tidyDraft(draft),
      id: makeId("cap"),
      file: file ? { name: file.name, type: file.type, size: file.blob.size } : null,
      createdAt: stamp,
      updatedAt: stamp,
    };
    if (file) {
      const kept: StoredFile = { id: capture.id, blob: file.blob, name: file.name, type: file.type };
      const wroteFile = await records.put("files", kept);
      if (!wroteFile.ok) return wroteFile;
    }
    const wrote = await records.put("captures", capture);
    if (!wrote.ok) {
      if (file) await records.remove("files", capture.id);
      return wrote;
    }
    set({ captures: [capture, ...state.captures] });
    return { ok: true, value: capture };
  }

  async function updateCapture(id: string, draft: CaptureDraft): Promise<Saved<Capture>> {
    await load();
    const current = state.captures.find((capture) => capture.id === id);
    if (!current) return fail("That capture is not on this device.");
    const reason = captureProblem(draft);
    if (reason) return fail(reason);
    const next: Capture = { ...current, ...tidyDraft(draft), updatedAt: now() };
    const wrote = await (await db()).put("captures", next);
    if (!wrote.ok) return wrote;
    set({ captures: state.captures.map((capture) => (capture.id === id ? next : capture)) });
    return { ok: true, value: next };
  }

  /** Removes the picture or document but keeps what was written. */
  async function dropFile(id: string): Promise<Saved<Capture>> {
    await load();
    const current = state.captures.find((capture) => capture.id === id);
    if (!current) return fail("That capture is not on this device.");
    const records = await db();
    const next: Capture = { ...current, file: null, updatedAt: now() };
    const wrote = await records.put("captures", next);
    if (!wrote.ok) return wrote;
    await records.remove("files", id);
    set({ captures: state.captures.map((capture) => (capture.id === id ? next : capture)) });
    return { ok: true, value: next };
  }

  async function removeCapture(id: string): Promise<void> {
    await load();
    const records = await db();
    await records.remove("captures", id);
    await records.remove("files", id);
    set({ captures: state.captures.filter((capture) => capture.id !== id) });
  }

  async function fileFor(id: string): Promise<FileInput | null> {
    const kept = await (await db()).get<StoredFile>("files", id);
    return kept ? { blob: kept.blob, name: kept.name, type: kept.type } : null;
  }

  async function addFolder(name: string, side: Side): Promise<Saved<Folder>> {
    await load();
    const reason = folderProblem(name, state.folders);
    if (reason) return fail(reason);
    const folder: Folder = { id: makeId("fol"), name: name.trim(), side, createdAt: now() };
    const wrote = await (await db()).put("folders", folder);
    if (!wrote.ok) return wrote;
    set({ folders: sortFolders([...state.folders, folder]) });
    return { ok: true, value: folder };
  }

  async function changeFolder(id: string, change: { name: string; side: Side }): Promise<Saved<Folder>> {
    await load();
    const current = state.folders.find((folder) => folder.id === id);
    if (!current || current.fixed) return fail("The shoebox cannot be changed.");
    const reason = folderProblem(change.name, state.folders, id);
    if (reason) return fail(reason);
    const next: Folder = { ...current, name: change.name.trim(), side: change.side };
    const wrote = await (await db()).put("folders", next);
    if (!wrote.ok) return wrote;
    set({ folders: sortFolders(state.folders.map((folder) => (folder.id === id ? next : folder))) });
    return { ok: true, value: next };
  }

  /** Removes a folder. Its captures go back to the shoebox; nothing is lost. */
  async function removeFolder(id: string): Promise<Saved<number>> {
    await load();
    const current = state.folders.find((folder) => folder.id === id);
    if (!current || current.fixed) return fail("The shoebox cannot be removed.");
    const records = await db();
    const moved = state.captures.filter((capture) => capture.folderId === id);
    for (const capture of moved) {
      const wrote = await records.put("captures", { ...capture, folderId: SHOEBOX_ID });
      if (!wrote.ok) return wrote;
    }
    await records.remove("folders", id);
    set({
      folders: state.folders.filter((folder) => folder.id !== id),
      captures: state.captures.map((capture) => (capture.folderId === id ? { ...capture, folderId: SHOEBOX_ID } : capture)),
    });
    return { ok: true, value: moved.length };
  }

  /** Clears every folder, capture and kept file from this device. */
  async function erase(): Promise<void> {
    await (await db()).clear();
    set({ folders: [SHOEBOX], captures: [] });
  }

  return {
    getState: () => state,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    load,
    addCapture,
    updateCapture,
    dropFile,
    removeCapture,
    fileFor,
    addFolder,
    changeFolder,
    removeFolder,
    erase,
  };
}
