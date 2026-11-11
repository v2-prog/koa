import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ENTRIES } from "../data/bench.ts";
import { BEQUEST_DOCS, bequestProblem, buildBequestNote, EMPTY_BEQUEST, markedDocs, reviveBequest } from "./bequest.ts";
import { deepRefusal, findIdentifier, TFN_REFUSAL } from "./guards.ts";
import { SEED } from "./ledger-core.ts";
import { emptyDraft, minutesProblem, minutesText, reviveMinutes, tidyDraft, type Minutes } from "./minutes.ts";
import { AGE_BANDS, emptySlots, initials, reviveRings, ringsText, shiftBand, slotPosition, slotProblem, stageForBand, stageMoves, RING_VIEW } from "./rings.ts";
import { buildSupportDoc } from "./support-doc.ts";
import { buildTaxNote, EMPTY_TAX, flagProblem, markedCount, reviveTax, TAX_FLAGS } from "./tax.ts";
import { crc32, makeZip, uniqueNames } from "./zip.ts";
import { readScale, stretchContrast } from "./ai/image-prep.ts";
import { buildBackup } from "./backup.ts";

const TODAY = "2026-11-11";
const NOTICE = /General information, not tax, legal or financial advice/;
const PROMISE = /you(?:'ll| will| would| could| can| may| might) save\b/i;

function assertSafeNote(text: string) {
  assert.match(text, NOTICE);
  assert.doesNotMatch(text, /\$\s?\d/);
  assert.doesNotMatch(text, PROMISE);
  assert.equal(findIdentifier(text), null);
}

describe("the bequest support pack", () => {
  it("exports a note that names documents and is not a will", () => {
    const note = buildBequestNote(
      { focus: "Nan", notes: "Wants the garden tools to go to the shed.", docs: { will: "have", attorney: "missing", super: "unsure" }, drafts: 1 },
      { will: ["Photo of the will cover (2 May 2026)"] },
      TODAY,
    );
    assert.match(note, /DRAFT 2/);
    assert.match(note, /not a will and not a binding nomination/);
    assert.match(note, /Documents that exist\n- Will/);
    assert.match(note, /Papers kept in koa: Photo of the will cover/);
    assert.match(note, /VERIFY: .* Who checks: the super fund\./);
    assertSafeNote(note);
  });

  it("refuses an identifier and revives a damaged pack", () => {
    assert.equal(bequestProblem({ focus: "Nan", notes: "TFN 123 456 789" }), TFN_REFUSAL);
    assert.equal(bequestProblem({ focus: "Nan", notes: "fine" }), null);
    assert.deepEqual(reviveBequest({ focus: 5, docs: { will: "have", nope: "have", super: "maybe" }, drafts: -2 }), {
      focus: "",
      notes: "",
      docs: { will: "have" },
      drafts: 0,
    });
    assert.equal(reviveBequest(null), EMPTY_BEQUEST);
    assert.equal(markedDocs({ ...EMPTY_BEQUEST, docs: { will: "have", titles: "unsure" } }), 2);
  });
});

describe("the tax questions", () => {
  it("exports a question list that works nothing out", () => {
    const note = buildTaxNote(
      {
        flags: {
          deduction: { outcome: "agent", words: "Bought work boots myself." },
          "short-stay": { outcome: "ato", nightsLet: 40, nightsPrivate: 21 },
          super: { outcome: "na" },
        },
        drafts: 0,
      },
      { deduction: ["Work boots (3 Sep 2026)"] },
      TODAY,
    );
    assert.match(note, /Questions for a registered tax agent/);
    assert.match(note, /Nights let short-stay: 40\n {2}Nights used privately: 21/);
    assert.match(note, /Papers kept in koa: Work boots/);
    assert.match(note, /Not looked at yet\n- Cost-base note/);
    assert.match(note, /Law, not started: Negative gearing and capital gains tax/);
    assert.doesNotMatch(note, /%/);
    assertSafeNote(note);
  });

  it("counts marks, refuses identifiers and bad night counts", () => {
    assert.equal(markedCount(EMPTY_TAX), 0);
    assert.equal(markedCount({ flags: { cgt: { outcome: "ato" }, super: {} }, drafts: 0 }), 1);
    assert.equal(flagProblem({ words: "tax file number 123" }), TFN_REFUSAL);
    assert.match(flagProblem({ nightsLet: 400 }) ?? "", /whole number/);
    assert.equal(flagProblem({ words: "fine", nightsLet: 3 }), null);
    assert.deepEqual(reviveTax({ flags: { cgt: { outcome: "save-tax", words: "x", nightsLet: 1.5 }, nope: {} }, drafts: 2.7 }), {
      flags: { cgt: { words: "x" } },
      drafts: 2,
    });
  });
});

describe("meeting minutes", () => {
  const minutes: Minutes = {
    id: "min-a",
    meeting: "Shed committee",
    date: TODAY,
    present: "Ana, Bill, Chen",
    apologies: "Dee",
    quorum: "yes",
    items: [{ id: "itm-a", topic: "Ask for workshop power", outcome: "Passed, all in favour" }],
    next: "Second Tuesday",
    proposalId: "pro-a",
    savedOn: TODAY,
  };

  it("say who was present, what was asked and what passed", () => {
    const text = minutesText(minutes, { title: "Shed power", ask: 300, result: "Passed", receiptRef: "KOA-PASS-PASS" });
    assert.match(text, /MINUTES: Shed committee/);
    assert.match(text, /Quorum met/);
    assert.match(text, /1\. Ask for workshop power\n {3}Result: Passed, all in favour/);
    assert.match(text, /Ask: 300 Q from reserve interest\. Passed\.\nReceipt: KOA-PASS-PASS/);
    assertSafeNote(text);
  });

  it("need a name and a date, and refuse identifiers anywhere", () => {
    assert.match(minutesProblem(emptyDraft(TODAY)) ?? "", /Name the meeting/);
    assert.match(minutesProblem({ ...emptyDraft(TODAY), meeting: "x", date: "soon" }) ?? "", /date/);
    assert.equal(minutesProblem({ ...emptyDraft(TODAY), meeting: "x", items: [{ id: "itm-a", topic: "Bank", outcome: "BSB 062-000" }] }) !== null, true);
    assert.equal(minutesProblem({ ...emptyDraft(TODAY), meeting: "x", present: "123 456 789" }), TFN_REFUSAL);
    assert.match(minutesProblem({ ...emptyDraft(TODAY), meeting: "x", items: [{ id: "itm-a", topic: "", outcome: "Passed" }] }) ?? "", /what was asked/);
    assert.deepEqual(tidyDraft({ ...emptyDraft(TODAY), meeting: " x ", items: [{ id: "itm-a", topic: " ", outcome: "" }] }).items, []);
    assert.deepEqual(reviveMinutes([{ id: "min-a", meeting: "x", quorum: "maybe", items: [{}, { id: "i", topic: "t", outcome: "o" }] }, 5, null])[0].items.length, 1);
  });
});

describe("life-stage rings", () => {
  it("has two-year bands from birth to ninety", () => {
    assert.equal(AGE_BANDS[0], "0–1");
    assert.equal(AGE_BANDS[8], "16–17");
    assert.equal(AGE_BANDS.at(-1), "90+");
    assert.equal(AGE_BANDS.at(-2), "88–89");
    assert.equal(new Set(AGE_BANDS).size, AGE_BANDS.length);
  });

  it("starts empty with one focus slot and two rings around it", () => {
    const slots = emptySlots();
    assert.equal(slots.filter((slot) => slot.ring === "focus").length, 1);
    assert.equal(slots.filter((slot) => slot.ring === "family").length, 8);
    assert.equal(slots.filter((slot) => slot.ring === "community").length, 8);
    assert.ok(slots.every((slot) => slot.label === "" && slot.band === "" && !/\d/.test(slot.id)));
    assert.deepEqual(slotPosition(slots[0]), { x: RING_VIEW / 2, y: RING_VIEW / 2 });
    assert.equal(new Set(slots.map((slot) => JSON.stringify(slotPosition(slot)))).size, slots.length);
  });

  it("takes a first name or a role and nothing more", () => {
    assert.equal(slotProblem({ label: "Aunty May", band: "66–67" }), null);
    assert.equal(slotProblem({ label: "Tool library", band: "" }), null);
    assert.match(slotProblem({ label: "", band: "" }) ?? "", /first name or a role/);
    assert.match(slotProblem({ label: "May 1961", band: "" }) ?? "", /No numbers/);
    assert.match(slotProblem({ label: "May Elizabeth Jane Smith", band: "" }) ?? "", /surnames/);
    assert.match(slotProblem({ label: "may@example", band: "" }) ?? "", /contact details/);
    assert.match(slotProblem({ label: "May", band: "65" }) ?? "", /age band/);
    assert.equal(initials("aunty may"), "AM");
  });

  it("knows the life stage of a band and who changes stage two years on", () => {
    assert.equal(stageForBand("10–11"), "growing-up");
    assert.equal(stageForBand("12–13"), "teens");
    assert.equal(stageForBand("16–17"), "teens");
    assert.equal(stageForBand("18–19"), "starting-out");
    assert.equal(stageForBand("44–45"), "building");
    assert.equal(stageForBand("46–47"), "midlife");
    assert.equal(stageForBand("66–67"), "later-life");
    assert.equal(stageForBand("90+"), "later-life");
    assert.equal(stageForBand(""), null);
    assert.equal(shiftBand("16–17", 1), "18–19");
    assert.equal(shiftBand("90+", 1), "90+");
    const slots = reviveRings([
      { id: "focus-a", label: "Sam", band: "16–17" },
      { id: "family-a", label: "Nan", band: "70–71" },
      { id: "family-b", label: "Kai", band: "nonsense" },
      { id: "community-a", label: "Footy club", band: "" },
    ]);
    assert.deepEqual(stageMoves(slots, 1), [{ label: "Sam", from: "teens", to: "starting-out", band: "18–19" }]);
    const text = ringsText(slots);
    assert.match(text, /Focus person\n- Sam, 16–17, Teens/);
    assert.match(text, /- Kai\n/);
    assert.match(text, /Two years on\n- Sam moves from Teens to Starting out\./);
    assertSafeNote(text);
  });
});

describe("the community support note", () => {
  it("states the reserve rule, cites the bench, and passes the guard so it can be saved", () => {
    const doc = buildSupportDoc({
      title: "Shed power",
      ask: 800,
      purpose: "Panels for the shed.",
      modelIds: ENTRIES.map((entry) => entry.id),
      reserveInterest: SEED.reserveInterest,
      closes: "2026-12-09",
    });
    assert.match(doc, /Ask: 800 Q from reserve interest\. Principal is not touched\./);
    assert.match(doc, /Holders do not earn yield/);
    assert.match(doc, /Closes: 9 Dec 2026/);
    assert.match(doc, /VERIFY: .*Who checks: a solicitor and a registered tax agent\./);
    assert.match(doc, NOTICE);
    assert.equal(deepRefusal(doc), null);
    assert.match(buildSupportDoc({ title: "", ask: 0, purpose: "", modelIds: [], reserveInterest: 0, closes: "" }), /No global model was pinned/);
  });
});

describe("the backup copy", () => {
  it("holds what was written, leaves the shoebox and pictures out, and is plain JSON", () => {
    const text = buildBackup(
      { rings: [] },
      { folders: [{ id: "shoebox", name: "Shoebox", side: "personal", createdAt: "", fixed: true }, { id: "fol-a", name: "A", side: "community", createdAt: "" }], captures: [] },
      TODAY,
    );
    const parsed = JSON.parse(text) as { app: string; folders: { id: string }[]; note: string };
    assert.equal(parsed.app, "koa");
    assert.deepEqual(parsed.folders.map((folder) => folder.id), ["fol-a"]);
    assert.match(parsed.note, NOTICE);
  });
});

describe("zip", () => {
  it("writes an archive other tools can open", () => {
    const encoder = new TextEncoder();
    const hello = encoder.encode("hello");
    assert.equal(crc32(hello), 0x3610a686);
    const zip = makeZip([
      { name: "a.txt", data: hello, date: new Date(2026, 10, 11, 9, 30, 0) },
      { name: "ünï.txt", data: new Uint8Array(0) },
    ]);
    const view = new DataView(zip.buffer);
    assert.equal(view.getUint32(0, true), 0x04034b50);
    assert.equal(view.getUint32(14, true), 0x3610a686);
    assert.equal(view.getUint32(18, true), 5);
    const end = zip.length - 22;
    assert.equal(view.getUint32(end, true), 0x06054b50);
    assert.equal(view.getUint16(end + 10, true), 2);
    const centralOffset = view.getUint32(end + 16, true);
    assert.equal(view.getUint32(centralOffset, true), 0x02014b50);
    assert.equal(centralOffset + view.getUint32(end + 12, true), end);
  });

  it("gives clashing names a number", () => {
    assert.deepEqual(uniqueNames(["a.txt", "A.txt", "a.txt", "b", "b"]), ["a.txt", "A (2).txt", "a (3).txt", "b", "b (2)"]);
  });
});

describe("picture preparation", () => {
  it("turns pixels grey and pulls darks and lights apart", () => {
    const pixels = new Uint8ClampedArray(100 * 4);
    for (let index = 0; index < 100; index += 1) {
      const value = index < 50 ? 100 : 140;
      pixels.set([value, value, value, 255], index * 4);
    }
    stretchContrast(pixels);
    assert.equal(pixels[0], 0);
    assert.equal(pixels[99 * 4], 255);
    assert.equal(pixels[3], 255);
    stretchContrast(new Uint8ClampedArray(0));
  });

  it("scales a picture into the reader's range", () => {
    assert.equal(readScale(4000, 3000), 0.6);
    assert.equal(readScale(1600, 1200), 1);
    assert.equal(readScale(800, 600), 1.5);
    assert.equal(readScale(200, 100), 2);
  });
});

describe("content that ships with the app", () => {
  it("has ten bequest documents and five tax flags, each uncertain rule with someone to check it", () => {
    assert.equal(BEQUEST_DOCS.length, 10);
    assert.equal(TAX_FLAGS.length, 5);
    for (const doc of BEQUEST_DOCS) if (doc.verify) assert.ok(doc.verify.who.length > 3 && doc.verify.what.length > 3);
    for (const flag of TAX_FLAGS) {
      assert.ok(flag.verify.who.length > 3);
      assert.match(flag.ato.url, /^https:\/\/www\.ato\.gov\.au\//);
      for (const text of [flag.rule, flag.explain, flag.question, ...flag.notice]) {
        assert.doesNotMatch(text, /\$\s?\d|\d\s?%|per cent/);
        assert.doesNotMatch(text, PROMISE);
      }
    }
  });
});
