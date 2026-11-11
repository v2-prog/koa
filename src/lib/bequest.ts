/**
 * Bequest support pack. Material for a succession conversation.
 *
 * It is not a will and not a binding nomination. The documents below are
 * named so a family can say which ones exist. None of them is filled in here
 * as a legal form, and nothing is lodged with anyone.
 */
import { formatDate } from "./dates.ts";
import { refusalFor } from "./guards.ts";

export type DocId =
  | "will"
  | "attorney"
  | "guardian"
  | "directive"
  | "super"
  | "insurance"
  | "deeds"
  | "titles"
  | "register"
  | "wishes";

export type DocState = "have" | "missing" | "unsure";

export type BequestDoc = {
  id: DocId;
  name: string;
  purpose: string;
  /** An uncertain or state-specific rule, and who has to check it. */
  verify?: { what: string; who: string };
};

export const BEQUEST_DOCS: BequestDoc[] = [
  {
    id: "will",
    name: "Will",
    purpose: "Says who receives what the person owns when they die, and who carries that out.",
    verify: {
      what: "Signing and witnessing rules differ by state and territory.",
      who: "a solicitor in the focus person's state or territory",
    },
  },
  {
    id: "attorney",
    name: "Enduring power of attorney",
    purpose: "Names who can make money and property decisions if the person no longer can.",
    verify: {
      what: "The form, the name and the witnesses differ by state and territory.",
      who: "a solicitor in the focus person's state or territory",
    },
  },
  {
    id: "guardian",
    name: "Enduring guardianship or medical decision-maker appointment",
    purpose: "Names who can make health and living decisions if the person no longer can.",
    verify: {
      what: "Each state and territory has its own name and form for this.",
      who: "a solicitor in the focus person's state or territory",
    },
  },
  {
    id: "directive",
    name: "Advance care directive",
    purpose: "Sets out wishes for future medical treatment.",
    verify: {
      what: "Whether it binds, and in what form, differs by state and territory.",
      who: "a solicitor, with the person's doctor",
    },
  },
  {
    id: "super",
    name: "Super death benefit nomination",
    purpose:
      "Tells the super fund who should receive the super. Super does not automatically pass under a will.",
    verify: {
      what: "Whether the nomination is binding, and whether it has lapsed.",
      who: "the super fund",
    },
  },
  {
    id: "insurance",
    name: "Life insurance beneficiary details",
    purpose: "Says who an insurer pays. Cover held inside super is paid through the super fund.",
    verify: { what: "Who is named on each policy today.", who: "the insurer or the super fund" },
  },
  {
    id: "deeds",
    name: "Trust deeds and company papers",
    purpose:
      "Show who controls any trust or company after the person dies. That control often sits outside the will.",
    verify: { what: "What the deed or constitution actually says.", who: "a solicitor reading the document" },
  },
  {
    id: "titles",
    name: "Property title details",
    purpose:
      "Show how each property is held. How it is held affects whether it passes under the will at all.",
    verify: { what: "How each title is held.", who: "a solicitor, from a title search" },
  },
  {
    id: "register",
    name: "A list of accounts and where the papers are kept",
    purpose: "Helps an executor find things. Keep account numbers and passwords out of this app.",
  },
  {
    id: "wishes",
    name: "Funeral wishes and a personal letter",
    purpose: "Not legal documents. A will is often read after the funeral.",
  },
];

export const DOC_STATE_LABEL: Record<DocState, string> = {
  have: "Exists",
  missing: "Not yet",
  unsure: "Not sure",
};

export const ASSET_LOCK_STATEMENT =
  "A charity or community land trust with an asset lock cannot stand in for a family trust. What is given to it stays locked to its purpose and does not come back to the family.";

export const SOLICITOR_STILL_DOES = [
  "Take instructions from the focus person directly, and be satisfied they have capacity.",
  "Prepare the will and the other documents in the form the state or territory requires.",
  "Arrange proper witnessing.",
  "Lodge anything that has to be lodged.",
];

export const MAX_FOCUS = 40;
export const MAX_NOTES = 2000;

export type Bequest = {
  focus: string;
  notes: string;
  docs: Partial<Record<DocId, DocState>>;
  /** How many times the pack has been exported. */
  drafts: number;
};

export const EMPTY_BEQUEST: Bequest = { focus: "", notes: "", docs: {}, drafts: 0 };

export function isDocId(value: unknown): value is DocId {
  return typeof value === "string" && BEQUEST_DOCS.some((doc) => doc.id === value);
}

export function reviveBequest(stored: unknown): Bequest {
  if (!stored || typeof stored !== "object") return EMPTY_BEQUEST;
  const item = stored as Record<string, unknown>;
  const docs: Bequest["docs"] = {};
  const raw = item.docs && typeof item.docs === "object" ? (item.docs as Record<string, unknown>) : {};
  for (const doc of BEQUEST_DOCS) {
    const state = raw[doc.id];
    if (state === "have" || state === "missing" || state === "unsure") docs[doc.id] = state;
  }
  return {
    focus: typeof item.focus === "string" ? item.focus.slice(0, MAX_FOCUS) : "",
    notes: typeof item.notes === "string" ? item.notes.slice(0, MAX_NOTES) : "",
    docs,
    drafts: typeof item.drafts === "number" && item.drafts >= 0 ? Math.floor(item.drafts) : 0,
  };
}

/** Why the pack cannot be saved or exported, or null if it can. */
export function bequestProblem(bequest: Pick<Bequest, "focus" | "notes">): string | null {
  if (bequest.focus.length > MAX_FOCUS) return "Keep the focus person to a first name or a role.";
  if (bequest.notes.length > MAX_NOTES) return "Keep the notes shorter.";
  return refusalFor(bequest.focus, bequest.notes);
}

/** How many of the ten documents have been marked one way or another. */
export function markedDocs(bequest: Bequest): number {
  return BEQUEST_DOCS.filter((doc) => bequest.docs[doc.id]).length;
}

/**
 * The pack as a text note for the family and a solicitor. It names documents
 * and says which exist. It is not a will and holds no identifier.
 */
export function buildBequestNote(
  bequest: Bequest,
  papersByDoc: Partial<Record<DocId, string[]>>,
  today: string,
): string {
  const lines: string[] = [
    `BEQUEST SUPPORT PACK, DRAFT ${bequest.drafts + 1}`,
    `Written ${formatDate(today)} on this device.`,
    "",
    "Material for a conversation with the family and a solicitor.",
    "This is not a will and not a binding nomination. Nothing has been lodged.",
    "",
    `Focus person: ${bequest.focus.trim() || "(not named)"}`,
    "",
    "What they want noted:",
    bequest.notes.trim() || "(nothing written yet)",
  ];

  const groups: [DocState | "unchecked", string][] = [
    ["have", "Documents that exist"],
    ["missing", "Documents not yet made"],
    ["unsure", "Not sure whether these exist"],
    ["unchecked", "Not checked yet"],
  ];
  for (const [state, heading] of groups) {
    const docs = BEQUEST_DOCS.filter((doc) => (bequest.docs[doc.id] ?? "unchecked") === state);
    if (docs.length === 0) continue;
    lines.push("", heading);
    for (const doc of docs) {
      lines.push(`- ${doc.name}`);
      if (doc.verify) lines.push(`  VERIFY: ${doc.verify.what} Who checks: ${doc.verify.who}.`);
      const papers = papersByDoc[doc.id] ?? [];
      if (papers.length > 0) lines.push(`  Papers kept in koa: ${papers.join("; ")}`);
    }
  }

  lines.push("", "What a solicitor still has to do");
  for (const item of SOLICITOR_STILL_DOES) lines.push(`- ${item}`);
  lines.push(
    "",
    ASSET_LOCK_STATEMENT,
    "",
    "Australia only. General information, not tax, legal or financial advice.",
  );
  return lines.join("\n");
}
