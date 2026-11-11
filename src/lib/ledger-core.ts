/**
 * The device ledger and the community proposals, as plain functions.
 *
 * This is a demo mark. One unit stands for one Australian dollar in reserve,
 * and no real money moves. Holders earn no yield. A proposal can only ask for
 * reserve interest: the principal is never available.
 */
import { addDays, daysBetween, isISODate } from "./dates.ts";
import { refusalFor } from "./guards.ts";

/** Idle gifting units leave circulation after this many days. */
export const GIFT_WINDOW_DAYS = 90;
export const MAX_COUNTERPARTY = 40;
export const MAX_AMOUNT = 99_999;
export const MAX_TITLE = 80;
export const MAX_PURPOSE = 1200;

export type MoveKind = "Spend" | "Gift";
export type ReceiptKind = MoveKind | "Ask" | "Expired";

export type Receipt = {
  ref: string;
  date: string;
  counterparty: string;
  amount: number;
  kind: ReceiptKind;
  /** Made-up entries that ship with the demo. */
  sample?: boolean;
};

export type ProposalStatus = "open" | "passed" | "not-passed";

export type Proposal = {
  id: string;
  title: string;
  ask: number;
  purpose: string;
  closes: string;
  modelIds: string[];
  /** The one copy of the support note, fixed when the proposal is saved. */
  document: string;
  /** A support mark on this device. It buys nothing. */
  supported: boolean;
  status: ProposalStatus;
  savedOn: string;
  decidedOn?: string;
  receiptRef?: string;
  sample?: boolean;
};

export type Ledger = {
  version: 1;
  mark: string;
  purchasing: number;
  gifting: number;
  reserveInterest: number;
  /** The day the gifting units last moved. The expiry window runs from here. */
  giftClock: string;
  receipts: Receipt[];
  proposals: Proposal[];
};

export const SEED = { purchasing: 420, gifting: 120, reserveInterest: 1200 } as const;

export function receiptLabel(kind: ReceiptKind): string {
  if (kind === "Ask") return "Passed ask, from reserve interest";
  if (kind === "Expired") return "Expired gifting units";
  return kind;
}

export function inCirculation(ledger: Ledger): number {
  return ledger.purchasing + ledger.gifting;
}

/** A fresh demo ledger with two made-up receipts. */
export function seedLedger(today: string, mark: string, proposals: Proposal[] = []): Ledger {
  return {
    version: 1,
    mark,
    ...SEED,
    giftClock: addDays(today, -3),
    receipts: [
      {
        ref: "KOA-SAMP-GIFT",
        date: addDays(today, -3),
        counterparty: "Sample neighbour",
        amount: 25,
        kind: "Gift",
        sample: true,
      },
      {
        ref: "KOA-SAMP-SHOP",
        date: addDays(today, -6),
        counterparty: "Sample bakery",
        amount: 18,
        kind: "Spend",
        sample: true,
      },
    ],
    proposals,
  };
}

function isCount(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0;
}

function isReceipt(value: unknown): value is Receipt {
  const item = value as Receipt;
  return (
    !!item &&
    typeof item.ref === "string" &&
    typeof item.date === "string" &&
    typeof item.counterparty === "string" &&
    isCount(item.amount) &&
    ["Spend", "Gift", "Ask", "Expired"].includes(item.kind)
  );
}

function isProposal(value: unknown): value is Proposal {
  const item = value as Proposal;
  return (
    !!item &&
    typeof item.id === "string" &&
    typeof item.title === "string" &&
    isCount(item.ask) &&
    typeof item.purpose === "string" &&
    typeof item.closes === "string" &&
    Array.isArray(item.modelIds) &&
    typeof item.document === "string" &&
    typeof item.supported === "boolean" &&
    ["open", "passed", "not-passed"].includes(item.status)
  );
}

/** Whole days until idle gifting units leave. Null when there are none. */
export function expiryDaysLeft(ledger: Ledger, today: string): number | null {
  if (ledger.gifting <= 0) return null;
  return Math.max(0, GIFT_WINDOW_DAYS - daysBetween(ledger.giftClock, today));
}

/** Idle gifting units that have run out of time leave, with a receipt. */
export function applyExpiry(ledger: Ledger, today: string, ref: string): Ledger {
  if (expiryDaysLeft(ledger, today) !== 0) return ledger;
  const receipt: Receipt = {
    ref,
    date: today,
    counterparty: "Left circulation",
    amount: ledger.gifting,
    kind: "Expired",
  };
  return { ...ledger, gifting: 0, receipts: [receipt, ...ledger.receipts] };
}

/**
 * Turns whatever was stored into a ledger. Anything that is not a ledger
 * becomes a fresh demo. Expiry is applied on the way in.
 */
export function reviveLedger(
  stored: unknown,
  today: string,
  make: { mark: () => string; ref: () => string },
  sampleProposals: Proposal[] = [],
): Ledger {
  const item = stored as Ledger | null;
  const valid =
    !!item &&
    item.version === 1 &&
    typeof item.mark === "string" &&
    isCount(item.purchasing) &&
    isCount(item.gifting) &&
    isCount(item.reserveInterest) &&
    isISODate(item.giftClock) &&
    Array.isArray(item.receipts) &&
    item.receipts.every(isReceipt) &&
    Array.isArray(item.proposals) &&
    item.proposals.every(isProposal);
  const ledger = valid ? item : seedLedger(today, make.mark(), sampleProposals);
  return applyExpiry(ledger, today, make.ref());
}

export type MoveInput = { kind: MoveKind; amount: number; counterparty: string };

export type MoveResult =
  | { ok: true; ledger: Ledger; receipt: Receipt }
  | { ok: false; reason: string };

/** Why a move cannot be recorded, or null if it can. */
export function checkMove(ledger: Ledger, input: MoveInput): string | null {
  if (!Number.isInteger(input.amount) || input.amount <= 0) return "Enter a whole number of units.";
  if (input.amount > MAX_AMOUNT) return "That is more than the demo ledger records in one move.";
  const bucket = input.kind === "Gift" ? ledger.gifting : ledger.purchasing;
  if (input.amount > bucket) {
    return input.kind === "Gift"
      ? `There are only ${bucket} gifting units on this device.`
      : `There are only ${bucket} purchasing units on this device.`;
  }
  const counterparty = input.counterparty.trim();
  if (!counterparty) return "Say who it is going to: a shop, a group or a first name.";
  if (counterparty.length > MAX_COUNTERPARTY) return "Keep the name short.";
  return refusalFor(counterparty);
}

export function applyMove(ledger: Ledger, input: MoveInput, today: string, ref: string): MoveResult {
  const reason = checkMove(ledger, input);
  if (reason) return { ok: false, reason };
  const receipt: Receipt = {
    ref,
    date: today,
    counterparty: input.counterparty.trim(),
    amount: input.amount,
    kind: input.kind,
  };
  const next: Ledger =
    input.kind === "Gift"
      ? { ...ledger, gifting: ledger.gifting - input.amount, giftClock: today }
      : { ...ledger, purchasing: ledger.purchasing - input.amount };
  return { ok: true, ledger: { ...next, receipts: [receipt, ...ledger.receipts] }, receipt };
}

export type ProposalInput = {
  title: string;
  ask: number;
  purpose: string;
  closes: string;
  modelIds: string[];
  document: string;
};

export type ProposalResult =
  | { ok: true; ledger: Ledger; proposal: Proposal }
  | { ok: false; reason: string };

export function checkProposal(ledger: Ledger, input: Omit<ProposalInput, "document">, today: string): string | null {
  const title = input.title.trim();
  if (!title) return "Give the proposal a title.";
  if (title.length > MAX_TITLE) return "Keep the title short.";
  if (!Number.isInteger(input.ask) || input.ask <= 0) return "Enter the ask as a whole number of units.";
  if (input.ask > ledger.reserveInterest) {
    return "That ask is larger than the reserve interest. The principal is not available.";
  }
  if (!isISODate(input.closes)) return "Set a close date.";
  if (daysBetween(today, input.closes) < 0) return "The close date has already passed.";
  if (!input.purpose.trim()) return "Write what everyone should see.";
  if (input.purpose.length > MAX_PURPOSE) return "Keep the purpose shorter.";
  return refusalFor(title, input.purpose);
}

export function addProposal(ledger: Ledger, input: ProposalInput, today: string, id: string): ProposalResult {
  const reason = checkProposal(ledger, input, today);
  if (reason) return { ok: false, reason };
  const proposal: Proposal = {
    id,
    title: input.title.trim(),
    ask: input.ask,
    purpose: input.purpose.trim(),
    closes: input.closes,
    modelIds: input.modelIds,
    document: input.document,
    supported: false,
    status: "open",
    savedOn: today,
  };
  return { ok: true, ledger: { ...ledger, proposals: [proposal, ...ledger.proposals] }, proposal };
}

/** A support mark on this device. It can be taken back, and it buys nothing. */
export function toggleSupport(ledger: Ledger, id: string): Ledger {
  return {
    ...ledger,
    proposals: ledger.proposals.map((item) =>
      item.id === id && item.status === "open" ? { ...item, supported: !item.supported } : item,
    ),
  };
}

export type DecisionResult =
  | { ok: true; ledger: Ledger; receipt: Receipt | null }
  | { ok: false; reason: string };

/**
 * Records the room's result. A passed ask comes out of reserve interest and
 * gets the same kind of receipt as a spend or a gift.
 */
export function decideProposal(
  ledger: Ledger,
  id: string,
  passed: boolean,
  today: string,
  ref: string,
): DecisionResult {
  const proposal = ledger.proposals.find((item) => item.id === id);
  if (!proposal) return { ok: false, reason: "That proposal is not on this device." };
  if (proposal.status !== "open") return { ok: false, reason: "A result is already recorded for this proposal." };
  if (!passed) {
    return {
      ok: true,
      receipt: null,
      ledger: {
        ...ledger,
        proposals: ledger.proposals.map((item) =>
          item.id === id ? { ...item, status: "not-passed", decidedOn: today } : item,
        ),
      },
    };
  }
  if (proposal.ask > ledger.reserveInterest) {
    return {
      ok: false,
      reason: "The reserve interest left is smaller than this ask. The principal is not available.",
    };
  }
  const receipt: Receipt = {
    ref,
    date: today,
    counterparty: proposal.title,
    amount: proposal.ask,
    kind: "Ask",
  };
  return {
    ok: true,
    receipt,
    ledger: {
      ...ledger,
      reserveInterest: ledger.reserveInterest - proposal.ask,
      receipts: [receipt, ...ledger.receipts],
      proposals: ledger.proposals.map((item) =>
        item.id === id ? { ...item, status: "passed", decidedOn: today, receiptRef: ref } : item,
      ),
    },
  };
}

export type ProposalView = "open" | "past-close" | "passed" | "not-passed";

/** How a proposal reads today. An open ask past its close date says so. */
export function proposalView(proposal: Proposal, today: string): ProposalView {
  if (proposal.status !== "open") return proposal.status;
  return isISODate(proposal.closes) && daysBetween(today, proposal.closes) < 0 ? "past-close" : "open";
}

export const PROPOSAL_VIEW_LABEL: Record<ProposalView, string> = {
  open: "Open",
  "past-close": "Close date passed, no result recorded",
  passed: "Passed",
  "not-passed": "Not passed",
};
