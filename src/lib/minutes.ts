/**
 * Local meeting minutes. Who was present, what was asked, what passed, and
 * what happens next. Kept on this device and exported as text.
 *
 * First names or roles only. The minutes are a community record, so they sit
 * on the community side of koa and never hold an identifier.
 */

import { formatDate, isISODate } from "./dates.ts";
import { refusalFor } from "./guards.ts";

export const MAX_MEETING = 80;
export const MAX_LINE = 400;
export const MAX_ITEMS = 12;

export type Quorum = "yes" | "no" | "";

export type MinuteItem = {
  id: string;
  /** What was asked. */
  topic: string;
  /** What the room decided. */
  outcome: string;
};

export type Minutes = {
  id: string;
  meeting: string;
  date: string;
  present: string;
  apologies: string;
  quorum: Quorum;
  items: MinuteItem[];
  next: string;
  /** A proposal on this device that the meeting decided, if any. */
  proposalId: string;
  savedOn: string;
};

export type MinutesDraft = Omit<Minutes, "id" | "savedOn">;

export const QUORUM_LABEL: Record<Quorum, string> = {
  yes: "Quorum met",
  no: "Quorum not met",
  "": "Quorum not noted",
};

export const QUORUM_VERIFY = {
  what: "What counts as a quorum is set by the group's own rules.",
  who: "the secretary or public officer, reading the group's rules",
};

export function emptyDraft(today: string): MinutesDraft {
  return { meeting: "", date: today, present: "", apologies: "", quorum: "", items: [], next: "", proposalId: "" };
}

function isItem(value: unknown): value is MinuteItem {
  const item = value as MinuteItem;
  return !!item && typeof item.id === "string" && typeof item.topic === "string" && typeof item.outcome === "string";
}

export function reviveMinutes(stored: unknown): Minutes[] {
  if (!Array.isArray(stored)) return [];
  const out: Minutes[] = [];
  for (const value of stored) {
    const item = value as Partial<Minutes> | null;
    if (!item || typeof item.id !== "string" || typeof item.meeting !== "string") continue;
    out.push({
      id: item.id,
      meeting: item.meeting,
      date: typeof item.date === "string" ? item.date : "",
      present: typeof item.present === "string" ? item.present : "",
      apologies: typeof item.apologies === "string" ? item.apologies : "",
      quorum: item.quorum === "yes" || item.quorum === "no" ? item.quorum : "",
      items: Array.isArray(item.items) ? item.items.filter(isItem) : [],
      next: typeof item.next === "string" ? item.next : "",
      proposalId: typeof item.proposalId === "string" ? item.proposalId : "",
      savedOn: typeof item.savedOn === "string" ? item.savedOn : "",
    });
  }
  return out;
}

/** Why the minutes cannot be saved, or null if they can. */
export function minutesProblem(draft: MinutesDraft): string | null {
  if (!draft.meeting.trim()) return "Name the meeting.";
  if (draft.meeting.length > MAX_MEETING) return "Keep the meeting name short.";
  if (!isISODate(draft.date)) return "Set the date of the meeting.";
  if (draft.items.length > MAX_ITEMS) return `Keep to ${MAX_ITEMS} items. Start a second set of minutes for the rest.`;
  const texts = [draft.meeting, draft.present, draft.apologies, draft.next];
  for (const item of draft.items) {
    if (!item.topic.trim() && !item.outcome.trim()) continue;
    if (!item.topic.trim()) return "Each item needs what was asked.";
    texts.push(item.topic, item.outcome);
  }
  if (texts.some((text) => text.length > MAX_LINE)) return "Keep each part shorter.";
  return refusalFor(...texts);
}

/** Drops empty items and trims the rest, ready to save. */
export function tidyDraft(draft: MinutesDraft): MinutesDraft {
  return {
    ...draft,
    meeting: draft.meeting.trim(),
    present: draft.present.trim(),
    apologies: draft.apologies.trim(),
    next: draft.next.trim(),
    items: draft.items
      .filter((item) => item.topic.trim())
      .map((item) => ({ ...item, topic: item.topic.trim(), outcome: item.outcome.trim() })),
  };
}

export type LinkedProposal = { title: string; ask: number; result: string; receiptRef?: string };

/** The minutes as a text note. */
export function minutesText(item: Minutes, proposal?: LinkedProposal | null): string {
  const lines = [
    `MINUTES: ${item.meeting}`,
    `Date: ${formatDate(item.date)}`,
    QUORUM_LABEL[item.quorum],
    "",
    "Present:",
    item.present || "(none noted)",
    "",
    "Apologies:",
    item.apologies || "(none noted)",
    "",
    "What was asked, and what passed:",
  ];
  if (item.items.length === 0) lines.push("(no items noted)");
  item.items.forEach((entry, index) => {
    lines.push(`${index + 1}. ${entry.topic}`);
    lines.push(`   Result: ${entry.outcome || "(not recorded)"}`);
  });
  if (proposal) {
    lines.push(
      "",
      "Community proposal decided at this meeting:",
      `${proposal.title}. Ask: ${proposal.ask} Q from reserve interest. ${proposal.result}.`,
    );
    if (proposal.receiptRef) lines.push(`Receipt: ${proposal.receiptRef}`);
  }
  lines.push(
    "",
    `Next: ${item.next || "(not set)"}`,
    "",
    "Kept on one device. Australia only. General information, not tax, legal or financial advice.",
  );
  return lines.join("\n");
}
