/**
 * Life-stage rings. A focus person in the middle, then a family ring and a
 * community ring. Every slot starts empty. First names or roles only, and
 * ages only as two-year bands.
 *
 * The rings are a picture for a conversation. Nothing is worked out from
 * them except which life stage a band falls in.
 */

import { refusalFor } from "./guards.ts";

export const MAX_SLOT_LABEL = 24;

/** Two-year bands from birth, then one open band at the top. */
export const AGE_BANDS: string[] = [
  ...Array.from({ length: 45 }, (_, index) => `${index * 2}–${index * 2 + 1}`),
  "90+",
];

export type RingId = "focus" | "family" | "community";

export type Ring = {
  id: RingId;
  name: string;
  hint: string;
  slots: number;
  /** Suggested roles. A person can type their own instead. */
  roles: string[];
  /** Everyday-language explanation shown by "Explain this". */
  explain: string;
};

export const RINGS: Ring[] = [
  {
    id: "focus",
    name: "Focus person",
    hint: "One person in the middle. The rings are drawn around them.",
    slots: 1,
    roles: ["Me", "Mum", "Dad", "Nan", "Pop"],
    explain:
      "Pick one person and put them in the middle. Everything else is drawn from where they stand. You can clear the rings and draw them again around someone else, for example a parent who needs more help, or a teenager about to start work.",
  },
  {
    id: "family",
    name: "Family",
    hint: "The people whose plans lean on each other.",
    slots: 8,
    roles: ["Partner", "Parent", "Child", "Sibling", "Grandparent", "Grandchild", "Carer", "Aunty", "Uncle", "Cousin"],
    explain:
      "The family ring is for the people whose lives and money lean on the focus person, or who the focus person leans on. It does not have to match a family tree. A carer or a close friend who is family in practice belongs here.",
  },
  {
    id: "community",
    name: "Community",
    hint: "Groups and people outside the household.",
    slots: 8,
    roles: ["Neighbour", "Friend", "School", "Club", "Workplace", "Faith group", "Co-op", "Volunteer group", "Mob"],
    explain:
      "The community ring is for the wider circle: a neighbour who checks in, a club, a school, a co-op. Community slots usually have no age band. The ring is a reminder that a family is held up by more than its own members, and that community money is kept apart from family money.",
  },
];

export type Slot = {
  /** `focus-a`, `family-c`, `community-h`. Letters, never digits. */
  id: string;
  ring: RingId;
  label: string;
  /** One of AGE_BANDS, or empty for a group or when the age is not known. */
  band: string;
};

const SLOT_LETTERS = "abcdefgh";

export function slotId(ring: RingId, index: number): string {
  return `${ring}-${SLOT_LETTERS[index]}`;
}

export function slotIndex(slot: Pick<Slot, "id">): number {
  return Math.max(0, SLOT_LETTERS.indexOf(slot.id.slice(-1)));
}

/** Every slot, empty. */
export function emptySlots(): Slot[] {
  return RINGS.flatMap((ring) =>
    Array.from({ length: ring.slots }, (_, index) => ({ id: slotId(ring.id, index), ring: ring.id, label: "", band: "" })),
  );
}

export function reviveRings(stored: unknown): Slot[] {
  const saved = Array.isArray(stored) ? (stored as Partial<Slot>[]) : [];
  return emptySlots().map((slot) => {
    const match = saved.find((item) => item && item.id === slot.id);
    if (!match) return slot;
    return {
      ...slot,
      label: typeof match.label === "string" ? match.label.slice(0, MAX_SLOT_LABEL) : "",
      band: typeof match.band === "string" && AGE_BANDS.includes(match.band) ? match.band : "",
    };
  });
}

export function isFilled(slot: Slot): boolean {
  return slot.label.trim().length > 0;
}

/** Why a slot cannot be saved, or null if it can. */
export function slotProblem(input: { label: string; band: string }): string | null {
  const label = input.label.trim();
  if (!label) return "Write a first name or a role.";
  if (label.length > MAX_SLOT_LABEL) return "Keep it to a first name or a role.";
  if (/\d/.test(label)) return "No numbers here. Use the age band instead.";
  if (/@/.test(label) || label.split(/\s+/).length > 3) return "A first name or a role is enough. Leave out surnames and contact details.";
  if (input.band && !AGE_BANDS.includes(input.band)) return "Choose an age band from the list.";
  return refusalFor(label);
}

export function initials(label: string): string {
  return label
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

/* ------------------------------------------------------------- the picture */

export const RING_VIEW = 340;
const CENTRE = RING_VIEW / 2;
export const RING_RADIUS: Record<RingId, number> = { focus: 0, family: 78, community: 138 };

/** Where a slot sits in the 340-unit drawing. */
export function slotPosition(slot: Pick<Slot, "id" | "ring">): { x: number; y: number } {
  const ring = RINGS.find((item) => item.id === slot.ring);
  const radius = RING_RADIUS[slot.ring];
  if (!ring || radius === 0) return { x: CENTRE, y: CENTRE };
  // The community ring is turned half a step so its slots sit between the family slots.
  const offset = slot.ring === "community" ? 0.5 : 0;
  const angle = ((slotIndex(slot) + offset) / ring.slots) * Math.PI * 2 - Math.PI / 2;
  return { x: CENTRE + Math.cos(angle) * radius, y: CENTRE + Math.sin(angle) * radius };
}

/* -------------------------------------------------------------- life stages */

export type StageId = "growing-up" | "teens" | "starting-out" | "building" | "midlife" | "later-life";

/** The first age of each stage. A stage runs until the next one starts. */
export const STAGE_STARTS: [StageId, number][] = [
  ["growing-up", 0],
  ["teens", 12],
  ["starting-out", 18],
  ["building", 26],
  ["midlife", 46],
  ["later-life", 66],
];

export const STAGE_NAME: Record<StageId, string> = {
  "growing-up": "Growing up",
  teens: "Teens",
  "starting-out": "Starting out",
  building: "Building",
  midlife: "Midlife",
  "later-life": "Later life",
};

/** The lower age of a band: `16–17` gives 16, `90+` gives 90. */
export function bandStart(band: string): number | null {
  const match = /^(\d+)/.exec(band);
  return match && AGE_BANDS.includes(band) ? Number(match[1]) : null;
}

/** The life stage an age band falls in, or null when no band is set. */
export function stageForBand(band: string): StageId | null {
  const start = bandStart(band);
  if (start === null) return null;
  let found: StageId = "growing-up";
  for (const [stage, from] of STAGE_STARTS) if (start >= from) found = stage;
  return found;
}

/** The band a person is in a number of bands later. Each band is two years. */
export function shiftBand(band: string, steps: number): string {
  const index = AGE_BANDS.indexOf(band);
  if (index < 0) return band;
  return AGE_BANDS[Math.min(AGE_BANDS.length - 1, Math.max(0, index + steps))];
}

export type StageMove = { label: string; from: StageId; to: StageId; band: string };

/** Who crosses into a new life stage if everyone moves on by `steps` bands. */
export function stageMoves(slots: Slot[], steps: number): StageMove[] {
  const moves: StageMove[] = [];
  for (const slot of slots) {
    if (!isFilled(slot) || !slot.band) continue;
    const from = stageForBand(slot.band);
    const band = shiftBand(slot.band, steps);
    const to = stageForBand(band);
    if (from && to && from !== to) moves.push({ label: slot.label.trim(), from, to, band });
  }
  return moves;
}

/** The rings as a text note for a family conversation. */
export function ringsText(slots: Slot[]): string {
  const lines = ["LIFE-STAGE RINGS", "First names or roles only. Ages are two-year bands.", ""];
  for (const ring of RINGS) {
    lines.push(ring.name);
    const filled = slots.filter((slot) => slot.ring === ring.id && isFilled(slot));
    if (filled.length === 0) lines.push("- (empty)");
    for (const slot of filled) {
      const stage = stageForBand(slot.band);
      const detail = slot.band ? `, ${slot.band}${stage ? `, ${STAGE_NAME[stage]}` : ""}` : "";
      lines.push(`- ${slot.label.trim()}${detail}`);
    }
    lines.push("");
  }
  const moves = stageMoves(slots, 1);
  if (moves.length > 0) {
    lines.push("Two years on");
    for (const move of moves) lines.push(`- ${move.label} moves from ${STAGE_NAME[move.from]} to ${STAGE_NAME[move.to]}.`);
    lines.push("");
  }
  lines.push("Kept on one device. Australia only. General information, not tax, legal or financial advice.");
  return lines.join("\n");
}
