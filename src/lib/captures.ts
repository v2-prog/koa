/**
 * Captures and folders, as plain data and plain functions.
 *
 * A capture is a receipt or a document a person photographed or picked. koa
 * reads the picture on this device, the person checks what it read, and the
 * capture is filed in a folder. It can also be attached to one thing: a tax
 * flag, a bequest item, a ledger receipt, a structure, a bench model, a set
 * of minutes or a proposal.
 *
 * Folders are virtual. They live in this browser's IndexedDB. Nothing leaves
 * the device unless the person copies or saves a file themselves.
 */

import { formatDate, isISODate } from "./dates.ts";
import { refusalFor } from "./guards.ts";

export const MAX_TITLE = 80;
export const MAX_SUPPLIER = 60;
export const MAX_NOTE = 2000;
export const MAX_TEXT = 6000;
export const MAX_FOLDER_NAME = 40;
/** The largest file koa will keep. A phone photo is shrunk well below this. */
export const MAX_FILE_BYTES = 10 * 1024 * 1024;

export type Side = "personal" | "community";

export const SIDE_LABEL: Record<Side, string> = { personal: "Personal", community: "Community" };

export type Folder = {
  id: string;
  name: string;
  side: Side;
  createdAt: string;
  /** The shoebox cannot be renamed or removed. */
  fixed?: boolean;
};

export const SHOEBOX_ID = "shoebox";

export const SHOEBOX: Folder = {
  id: SHOEBOX_ID,
  name: "Shoebox",
  side: "personal",
  createdAt: "",
  fixed: true,
};

export type KeptFile = { name: string; type: string; size: number };

export type Capture = {
  id: string;
  title: string;
  /** The date on the paper, or the day it was captured. */
  date: string;
  supplier: string;
  /** The amount as printed, digits only, such as `42.50`. Empty when there is none. */
  amount: string;
  note: string;
  /** What koa read from the picture, after identifiers were removed. */
  text: string;
  folderId: string;
  /** Empty, or `kind:id` such as `tax:cgt`. */
  attach: string;
  /** The picture or document, if the person chose to keep it. */
  file: KeptFile | null;
  createdAt: string;
  updatedAt: string;
};

export type CaptureDraft = Pick<Capture, "title" | "date" | "supplier" | "amount" | "note" | "text" | "folderId" | "attach">;

export function emptyDraft(today: string, folderId: string = SHOEBOX_ID, attach = ""): CaptureDraft {
  return { title: "", date: today, supplier: "", amount: "", note: "", text: "", folderId, attach };
}

/** `$1,234.5` becomes `1234.50`. Anything that is not an amount becomes empty. */
export function normaliseAmount(input: string): string {
  const cleaned = input.replace(/[$,\s]/g, "").replace(/^aud/i, "");
  if (!/^\d{1,7}(?:\.\d{1,2})?$/.test(cleaned)) return "";
  const [whole, cents = ""] = cleaned.split(".");
  return `${Number(whole)}.${cents.padEnd(2, "0")}`;
}

/** Why a capture cannot be saved, or null if it can. */
export function captureProblem(draft: CaptureDraft): string | null {
  if (!draft.title.trim()) return "Give the capture a title, such as the shop or the kind of paper.";
  if (draft.title.length > MAX_TITLE) return "Keep the title short.";
  if (!isISODate(draft.date)) return "Set the date on the paper.";
  if (draft.supplier.length > MAX_SUPPLIER) return "Keep the supplier name short.";
  if (draft.amount.trim() && !normaliseAmount(draft.amount)) {
    return "Write the amount as it is printed, digits only, such as 42.50. Or leave it empty.";
  }
  if (draft.note.length > MAX_NOTE) return "Keep the note shorter.";
  if (draft.attach && !parseAttach(draft.attach)) return "Choose what to attach this to, or leave it in the folder.";
  return refusalFor(draft.title, draft.supplier, draft.note, draft.text);
}

/** Trims a draft and cuts over-long read text, ready to save. */
export function tidyDraft(draft: CaptureDraft): CaptureDraft {
  return {
    ...draft,
    title: draft.title.trim(),
    supplier: draft.supplier.trim(),
    amount: normaliseAmount(draft.amount),
    note: draft.note.trim(),
    text: draft.text.trim().slice(0, MAX_TEXT),
  };
}

/* ---------------------------------------------------------------- folders */

/** Why a folder name cannot be used, or null if it can. */
export function folderProblem(name: string, existing: Folder[], ignoreId?: string): string | null {
  const trimmed = name.trim();
  if (!trimmed) return "Name the folder.";
  if (trimmed.length > MAX_FOLDER_NAME) return "Keep the folder name short.";
  if (/[\\/:*?"<>|]/.test(trimmed)) return "Leave out slashes and other filing symbols, so the folder can be saved as a real one.";
  const taken = existing.some(
    (folder) => folder.id !== ignoreId && folder.name.trim().toLowerCase() === trimmed.toLowerCase(),
  );
  if (taken) return "There is already a folder with that name.";
  return refusalFor(trimmed);
}

/** Shoebox first, then personal folders, then community folders, by name. */
export function sortFolders(folders: Folder[]): Folder[] {
  const rank = (folder: Folder) => (folder.id === SHOEBOX_ID ? 0 : folder.side === "personal" ? 1 : 2);
  return [...folders].sort((a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name));
}

/** Newest paper first. */
export function sortCaptures(captures: Capture[]): Capture[] {
  return [...captures].sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
}

export function capturesIn(captures: Capture[], folderId: string): Capture[] {
  return sortCaptures(captures.filter((capture) => capture.folderId === folderId));
}

export function capturesFor(captures: Capture[], attach: string): Capture[] {
  return sortCaptures(captures.filter((capture) => capture.attach === attach));
}

/** Titles of the captures attached to each id of one kind, for the text notes. */
export function titlesByTarget(captures: Capture[], kind: AttachKind): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const capture of sortCaptures(captures)) {
    const target = parseAttach(capture.attach);
    if (!target || target.kind !== kind) continue;
    (out[target.id] ??= []).push(`${capture.title} (${formatDate(capture.date)})`);
  }
  return out;
}

export function searchCaptures(captures: Capture[], query: string): Capture[] {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length === 0) return sortCaptures(captures);
  return sortCaptures(
    captures.filter((capture) => {
      const hay = [capture.title, capture.supplier, capture.note, capture.text, capture.date, formatDate(capture.date)]
        .join(" ")
        .toLowerCase();
      return words.every((word) => hay.includes(word));
    }),
  );
}

/* ------------------------------------------------------------- attachment */

export type AttachKind = "tax" | "bequest" | "ledger" | "structure" | "bench" | "minutes" | "proposal";

export const ATTACH_KIND_LABEL: Record<AttachKind, string> = {
  tax: "Tax flag",
  bequest: "Bequest item",
  ledger: "Ledger receipt",
  structure: "Structure",
  bench: "Bench model",
  minutes: "Meeting minutes",
  proposal: "Community proposal",
};

/** Which side of koa each kind of attachment belongs to. */
export const ATTACH_KIND_SIDE: Record<AttachKind, Side> = {
  tax: "personal",
  bequest: "personal",
  ledger: "personal",
  structure: "community",
  bench: "community",
  minutes: "community",
  proposal: "community",
};

const ATTACH_KINDS = Object.keys(ATTACH_KIND_LABEL) as AttachKind[];

export type AttachTarget = { kind: AttachKind; id: string };

export function attachValue(kind: AttachKind, id: string): string {
  return `${kind}:${id}`;
}

export function parseAttach(value: string): AttachTarget | null {
  const cut = value.indexOf(":");
  if (cut < 1) return null;
  const kind = value.slice(0, cut) as AttachKind;
  const id = value.slice(cut + 1);
  return ATTACH_KINDS.includes(kind) && id ? { kind, id } : null;
}

export type AttachOption = { value: string; label: string };

/** The things a capture can be attached to, by kind. Built by the screens. */
export type AttachCatalogue = Record<AttachKind, AttachOption[]>;

export function attachLabel(value: string, catalogue: AttachCatalogue): string {
  const target = parseAttach(value);
  if (!target) return "Not attached";
  const option = catalogue[target.kind].find((item) => item.value === value);
  return option ? `${ATTACH_KIND_LABEL[target.kind]}: ${option.label}` : `${ATTACH_KIND_LABEL[target.kind]} (no longer on this device)`;
}

/* ------------------------------------------------------------------ export */

/** A file name that is safe on any phone or computer. */
export function safeFileName(value: string, fallback = "capture"): string {
  const cleaned = value
    .normalize("NFKD")
    .replace(/[^\w\s.-]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 60);
  return cleaned || fallback;
}

export function fileExtension(file: KeptFile | null): string {
  if (!file) return "";
  const fromName = /\.([a-z\d]{2,5})$/i.exec(file.name)?.[1]?.toLowerCase();
  if (fromName) return fromName;
  if (file.type === "image/jpeg") return "jpg";
  if (file.type === "image/png") return "png";
  if (file.type === "application/pdf") return "pdf";
  return "bin";
}

/** `2026-11-11 Corner grocer`, the stem used for a capture's exported files. */
export function exportStem(capture: Capture): string {
  return safeFileName(`${capture.date} ${capture.title}`);
}

/** One capture as a text note. */
export function captureText(capture: Capture, folderName: string, attachedTo: string): string {
  const lines = [
    capture.title,
    `Date on the paper: ${formatDate(capture.date)}`,
    `Supplier: ${capture.supplier || "(not noted)"}`,
    `Amount as printed: ${capture.amount || "(not noted)"}`,
    `Folder: ${folderName}`,
    `Attached to: ${attachedTo}`,
    "",
    "Note:",
    capture.note || "(none)",
  ];
  if (capture.text) lines.push("", "Read from the picture on this device:", capture.text);
  lines.push(
    "",
    capture.file ? `Picture or document kept: ${capture.file.name}` : "No picture or document was kept.",
    "Kept on one device. Australia only. General information, not tax, legal or financial advice.",
  );
  return lines.join("\n");
}
