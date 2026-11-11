import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { addDays } from "./dates.ts";
import { TFN_REFUSAL } from "./guards.ts";
import {
  addProposal,
  applyExpiry,
  applyMove,
  checkMove,
  checkProposal,
  decideProposal,
  expiryDaysLeft,
  GIFT_WINDOW_DAYS,
  inCirculation,
  proposalView,
  reviveLedger,
  SEED,
  seedLedger,
  toggleSupport,
  type Ledger,
} from "./ledger-core.ts";

const TODAY = "2026-11-11";
const make = { mark: () => "koa-test", ref: () => "KOA-TEST-REFS" };
const fresh = (): Ledger => seedLedger(TODAY, "koa-test");

describe("the device ledger", () => {
  it("starts as a demo with two sample receipts", () => {
    const ledger = fresh();
    assert.equal(inCirculation(ledger), SEED.purchasing + SEED.gifting);
    assert.equal(ledger.receipts.length, 2);
    assert.ok(ledger.receipts.every((receipt) => receipt.sample));
  });

  it("records a spend from purchasing units and writes a receipt", () => {
    const result = applyMove(fresh(), { kind: "Spend", amount: 20, counterparty: " Corner grocer " }, TODAY, "KOA-AAAA-BBBB");
    assert.ok(result.ok);
    assert.equal(result.ledger.purchasing, SEED.purchasing - 20);
    assert.equal(result.ledger.gifting, SEED.gifting);
    assert.deepEqual(result.receipt, { ref: "KOA-AAAA-BBBB", date: TODAY, counterparty: "Corner grocer", amount: 20, kind: "Spend" });
    assert.equal(result.ledger.receipts[0], result.receipt);
  });

  it("records a gift from gifting units and restarts the expiry clock", () => {
    const result = applyMove(fresh(), { kind: "Gift", amount: 50, counterparty: "Ana" }, TODAY, "KOA-AAAA-BBBB");
    assert.ok(result.ok);
    assert.equal(result.ledger.gifting, SEED.gifting - 50);
    assert.equal(result.ledger.purchasing, SEED.purchasing);
    assert.equal(expiryDaysLeft(result.ledger, TODAY), GIFT_WINDOW_DAYS);
  });

  it("refuses a move it cannot record", () => {
    const ledger = fresh();
    assert.match(checkMove(ledger, { kind: "Spend", amount: 0, counterparty: "x" }) ?? "", /whole number/);
    assert.match(checkMove(ledger, { kind: "Spend", amount: 1.5, counterparty: "x" }) ?? "", /whole number/);
    assert.match(checkMove(ledger, { kind: "Gift", amount: SEED.gifting + 1, counterparty: "x" }) ?? "", /only/);
    assert.match(checkMove(ledger, { kind: "Spend", amount: 5, counterparty: "  " }) ?? "", /who it is going to/);
    assert.equal(checkMove(ledger, { kind: "Spend", amount: 5, counterparty: "123 456 789" }), TFN_REFUSAL);
    assert.equal(applyMove(ledger, { kind: "Spend", amount: 5, counterparty: "" }, TODAY, "r").ok, false);
  });

  it("counts idle gifting units down and lets them leave with a receipt", () => {
    const ledger = { ...fresh(), giftClock: TODAY };
    assert.equal(expiryDaysLeft(ledger, addDays(TODAY, 10)), GIFT_WINDOW_DAYS - 10);
    assert.equal(applyExpiry(ledger, addDays(TODAY, GIFT_WINDOW_DAYS - 1), "r"), ledger);
    const expired = applyExpiry(ledger, addDays(TODAY, GIFT_WINDOW_DAYS), "KOA-GONE-GONE");
    assert.equal(expired.gifting, 0);
    assert.equal(expired.purchasing, SEED.purchasing);
    assert.deepEqual(expired.receipts[0], {
      ref: "KOA-GONE-GONE",
      date: addDays(TODAY, GIFT_WINDOW_DAYS),
      counterparty: "Left circulation",
      amount: SEED.gifting,
      kind: "Expired",
    });
    assert.equal(expiryDaysLeft(expired, addDays(TODAY, 400)), null);
  });

  it("revives a stored ledger and replaces anything that is not one", () => {
    const stored = JSON.parse(JSON.stringify(fresh())) as unknown;
    assert.deepEqual(reviveLedger(stored, TODAY, make), fresh());
    for (const junk of [null, 5, "x", {}, { version: 1, purchasing: -1 }, { ...fresh(), receipts: [{}] }]) {
      assert.equal(reviveLedger(junk, TODAY, make).purchasing, SEED.purchasing);
    }
  });
});

describe("community proposals", () => {
  const input = { title: "Shed power", ask: 300, purpose: "Panels for the shed.", closes: addDays(TODAY, 14), modelIds: ["hum"], document: "note" };

  it("can only ask for reserve interest, never the principal", () => {
    const ledger = fresh();
    assert.equal(checkProposal(ledger, input, TODAY), null);
    assert.match(checkProposal(ledger, { ...input, ask: SEED.reserveInterest + 1 }, TODAY) ?? "", /principal is not available/);
    assert.match(checkProposal(ledger, { ...input, ask: 0 }, TODAY) ?? "", /whole number/);
    assert.match(checkProposal(ledger, { ...input, closes: addDays(TODAY, -1) }, TODAY) ?? "", /already passed/);
    assert.match(checkProposal(ledger, { ...input, title: "" }, TODAY) ?? "", /title/);
    assert.equal(checkProposal(ledger, { ...input, purpose: "TFN 123 456 789" }, TODAY), TFN_REFUSAL);
  });

  it("keeps a support mark on this device that buys nothing", () => {
    const added = addProposal(fresh(), input, TODAY, "pro-a");
    assert.ok(added.ok);
    const marked = toggleSupport(added.ledger, "pro-a");
    assert.equal(marked.proposals[0].supported, true);
    assert.equal(marked.reserveInterest, SEED.reserveInterest);
    assert.equal(inCirculation(marked), inCirculation(fresh()));
    assert.equal(toggleSupport(marked, "pro-a").proposals[0].supported, false);
  });

  it("gives a passed ask the same kind of receipt as the ledger, out of reserve interest", () => {
    const added = addProposal(fresh(), input, TODAY, "pro-a");
    assert.ok(added.ok);
    const decided = decideProposal(added.ledger, "pro-a", true, addDays(TODAY, 3), "KOA-PASS-PASS");
    assert.ok(decided.ok);
    assert.deepEqual(decided.receipt, {
      ref: "KOA-PASS-PASS",
      date: addDays(TODAY, 3),
      counterparty: "Shed power",
      amount: 300,
      kind: "Ask",
    });
    assert.equal(decided.ledger.reserveInterest, SEED.reserveInterest - 300);
    assert.equal(decided.ledger.purchasing, SEED.purchasing);
    assert.equal(decided.ledger.gifting, SEED.gifting);
    assert.equal(decided.ledger.proposals[0].status, "passed");
    assert.equal(decided.ledger.proposals[0].receiptRef, "KOA-PASS-PASS");
    assert.equal(decideProposal(decided.ledger, "pro-a", true, TODAY, "r").ok, false);
  });

  it("records a result that did not pass without a receipt or any money moving", () => {
    const added = addProposal(fresh(), input, TODAY, "pro-a");
    assert.ok(added.ok);
    const decided = decideProposal(added.ledger, "pro-a", false, TODAY, "r");
    assert.ok(decided.ok);
    assert.equal(decided.receipt, null);
    assert.equal(decided.ledger.reserveInterest, SEED.reserveInterest);
    assert.equal(decided.ledger.receipts.length, 2);
    assert.equal(decided.ledger.proposals[0].status, "not-passed");
  });

  it("will not pass an ask the remaining interest cannot cover", () => {
    let ledger = fresh();
    for (const id of ["pro-a", "pro-b"]) {
      const added = addProposal(ledger, { ...input, ask: 700 }, TODAY, id);
      assert.ok(added.ok);
      ledger = added.ledger;
    }
    const first = decideProposal(ledger, "pro-a", true, TODAY, "KOA-AAAA-AAAA");
    assert.ok(first.ok);
    const second = decideProposal(first.ledger, "pro-b", true, TODAY, "KOA-BBBB-BBBB");
    assert.equal(second.ok, false);
  });

  it("says when a close date has passed with no result", () => {
    const added = addProposal(fresh(), input, TODAY, "pro-a");
    assert.ok(added.ok);
    assert.equal(proposalView(added.proposal, TODAY), "open");
    assert.equal(proposalView(added.proposal, addDays(TODAY, 15)), "past-close");
  });
});
