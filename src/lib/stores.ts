/**
 * React hooks over the things kept on this device.
 *
 * The ledger, packs, rings and minutes are small and live in localStorage.
 * Captures, folders and kept pictures live in IndexedDB.
 */

import { useCallback, useEffect, useMemo, useSyncExternalStore } from "react";
import { BEQUEST_DOCS, reviveBequest, type Bequest } from "./bequest.ts";
import { ENTRIES } from "../data/bench.ts";
import { STRUCTURES } from "../data/structures.ts";
import { type AttachCatalogue, attachValue } from "./captures.ts";
import { addDays, formatDate, todayISO } from "./dates.ts";
import { openStore } from "./idb.ts";
import { makeId, makeMark, makeRef } from "./ids.ts";
import {
  addProposal,
  applyMove,
  decideProposal,
  expiryDaysLeft,
  receiptLabel,
  reviveLedger,
  SEED,
  toggleSupport,
  type DecisionResult,
  type Ledger,
  type MoveInput,
  type MoveResult,
  type Proposal,
  type ProposalInput,
  type ProposalResult,
} from "./ledger-core.ts";
import { createLibrary } from "./library.ts";
import { readRaw, write } from "./local-store.ts";
import { reviveMinutes, type Minutes } from "./minutes.ts";
import { reviveRings, type Slot } from "./rings.ts";
import { buildSupportDoc } from "./support-doc.ts";
import { reviveTax, TAX_FLAGS, type TaxState } from "./tax.ts";
import { useLocalStore } from "./use-local-store.ts";

export const KEYS = {
  ledger: "ledger",
  bequest: "bequest",
  tax: "tax",
  minutes: "minutes",
  rings: "rings",
} as const;

/* ------------------------------------------------------------------ ledger */

const SAMPLE = {
  title: "Workshop power for the shared shed",
  ask: 800,
  purpose:
    "Allocate reserve interest toward panels and install for the shared workshop. Members read the same note. The result and the receipt are shown.",
  modelIds: ["hum", "chiemgauer", "decidim", "mondragon"],
};

/** One made-up proposal so the community side is not empty on first open. */
function sampleProposals(today: string): Proposal[] {
  const closes = addDays(today, 28);
  return [
    {
      id: "pro-sample",
      ...SAMPLE,
      closes,
      document: buildSupportDoc({ ...SAMPLE, closes, reserveInterest: SEED.reserveInterest }),
      supported: false,
      status: "open",
      savedOn: today,
      sample: true,
    },
  ];
}

function reviveStoredLedger(stored: unknown): Ledger {
  const today = todayISO();
  return reviveLedger(stored, today, { mark: makeMark, ref: makeRef }, sampleProposals(today));
}

/** The demo ledger on this device. No account, no bank, no chain. */
export function useLedger() {
  const { state: ledger, set, clear } = useLocalStore(KEYS.ledger, reviveStoredLedger);
  const today = todayISO();

  // A fresh demo, or one whose gifting units have just expired, is written
  // down once so it reads the same on the next visit.
  useEffect(() => {
    if (JSON.stringify(readRaw(KEYS.ledger)) !== JSON.stringify(ledger)) write(KEYS.ledger, ledger);
  }, [ledger]);

  const move = useCallback(
    (input: MoveInput): MoveResult => {
      const result = applyMove(ledger, input, todayISO(), makeRef());
      if (!result.ok) return result;
      const wrote = set(result.ledger);
      return wrote.ok ? result : wrote;
    },
    [ledger, set],
  );

  const propose = useCallback(
    (input: ProposalInput): ProposalResult => {
      const result = addProposal(ledger, input, todayISO(), makeId("pro"));
      if (!result.ok) return result;
      const wrote = set(result.ledger);
      return wrote.ok ? result : wrote;
    },
    [ledger, set],
  );

  const support = useCallback((id: string) => set(toggleSupport(ledger, id)), [ledger, set]);

  const decide = useCallback(
    (id: string, passed: boolean): DecisionResult => {
      const result = decideProposal(ledger, id, passed, todayISO(), makeRef());
      if (!result.ok) return result;
      const wrote = set(result.ledger);
      return wrote.ok ? result : wrote;
    },
    [ledger, set],
  );

  return { ledger, today, daysLeft: expiryDaysLeft(ledger, today), move, propose, support, decide, reset: clear };
}

/* ------------------------------------------------------------------- packs */

export function useBequest() {
  const { state, set, clear } = useLocalStore<Bequest>(KEYS.bequest, reviveBequest);
  return { bequest: state, setBequest: set, clear };
}

export function useTax() {
  const { state, set, clear } = useLocalStore<TaxState>(KEYS.tax, reviveTax);
  return { tax: state, setTax: set, clear };
}

export function useMinutes() {
  const { state, set, clear } = useLocalStore<Minutes[]>(KEYS.minutes, reviveMinutes);
  return { minutes: state, setMinutes: set, clear };
}

export function useRings() {
  const { state, set, clear } = useLocalStore<Slot[]>(KEYS.rings, reviveRings);
  return { slots: state, setSlots: set, clear };
}

/* ----------------------------------------------------------------- library */

/** The one capture library for this tab. */
export const library = createLibrary(openStore);

export function useLibrary() {
  const state = useSyncExternalStore(library.subscribe, library.getState);
  useEffect(() => {
    void library.load();
  }, []);
  return state;
}

/** Everything a capture can be attached to, read from what is on this device. */
export function useAttachCatalogue(): AttachCatalogue {
  const { ledger } = useLedger();
  const { minutes } = useMinutes();
  return useMemo(
    () => ({
      tax: TAX_FLAGS.map((flag) => ({ value: attachValue("tax", flag.id), label: flag.title })),
      bequest: BEQUEST_DOCS.map((doc) => ({ value: attachValue("bequest", doc.id), label: doc.name })),
      ledger: ledger.receipts.slice(0, 30).map((receipt) => ({
        value: attachValue("ledger", receipt.ref),
        label: `${receipt.counterparty}, ${receipt.amount} Q, ${receiptLabel(receipt.kind)}, ${formatDate(receipt.date)}`,
      })),
      structure: STRUCTURES.map((item) => ({ value: attachValue("structure", item.id), label: item.name })),
      bench: ENTRIES.map((entry) => ({ value: attachValue("bench", entry.id), label: `${entry.name}, ${entry.place}` })),
      minutes: minutes.map((item) => ({
        value: attachValue("minutes", item.id),
        label: `${item.meeting}, ${formatDate(item.date)}`,
      })),
      proposal: ledger.proposals.map((item) => ({ value: attachValue("proposal", item.id), label: item.title })),
    }),
    [ledger, minutes],
  );
}
