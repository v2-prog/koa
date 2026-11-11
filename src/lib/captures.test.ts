import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  attachLabel,
  attachValue,
  captureProblem,
  captureText,
  capturesFor,
  capturesIn,
  emptyDraft,
  exportStem,
  fileExtension,
  folderProblem,
  normaliseAmount,
  parseAttach,
  safeFileName,
  searchCaptures,
  SHOEBOX,
  SHOEBOX_ID,
  sortFolders,
  tidyDraft,
  titlesByTarget,
  type AttachCatalogue,
  type Capture,
  type Folder,
} from "./captures.ts";
import { findIdentifier, TFN_REFUSAL } from "./guards.ts";

const TODAY = "2026-11-11";

function capture(over: Partial<Capture>): Capture {
  return {
    id: "cap-a",
    title: "Corner grocer",
    date: TODAY,
    supplier: "Corner Grocer",
    amount: "18.00",
    note: "",
    text: "",
    folderId: SHOEBOX_ID,
    attach: "",
    file: null,
    createdAt: "2026-11-11T01:00:00.000Z",
    updatedAt: "2026-11-11T01:00:00.000Z",
    ...over,
  };
}

const CATALOGUE: AttachCatalogue = {
  tax: [{ value: "tax:cgt", label: "A sale, a gift or an inheritance" }],
  bequest: [{ value: "bequest:will", label: "Will" }],
  ledger: [],
  structure: [],
  bench: [],
  minutes: [],
  proposal: [],
};

describe("a capture", () => {
  it("needs a title and a real date, and nothing else", () => {
    assert.match(captureProblem(emptyDraft(TODAY)) ?? "", /title/);
    assert.equal(captureProblem({ ...emptyDraft(TODAY), title: "Receipt" }), null);
    assert.match(captureProblem({ ...emptyDraft(TODAY), title: "x", date: "11/11/2026" }) ?? "", /date/);
  });

  it("takes the amount as printed, with no currency sign and no sums", () => {
    assert.equal(normaliseAmount("42.5"), "42.50");
    assert.equal(normaliseAmount(" 1,234.50 "), "1234.50");
    assert.equal(normaliseAmount("007"), "7.00");
    assert.equal(normaliseAmount("about forty"), "");
    assert.equal(normaliseAmount("12.345"), "");
    assert.match(captureProblem({ ...emptyDraft(TODAY), title: "x", amount: "forty" }) ?? "", /as it is printed/);
  });

  it("is refused if any part of it looks like an identifier", () => {
    for (const field of ["title", "supplier", "note", "text"] as const) {
      assert.equal(captureProblem({ ...emptyDraft(TODAY), title: "x", [field]: "TFN 123 456 789" }), TFN_REFUSAL, field);
    }
  });

  it("is trimmed before it is saved", () => {
    const tidy = tidyDraft({ ...emptyDraft(TODAY), title: "  Receipt ", amount: "9", text: "a".repeat(7000) });
    assert.equal(tidy.title, "Receipt");
    assert.equal(tidy.amount, "9.00");
    assert.equal(tidy.text.length, 6000);
  });
});

describe("folders", () => {
  const folders: Folder[] = [
    SHOEBOX,
    { id: "fol-b", name: "Tool library", side: "community", createdAt: "" },
    { id: "fol-a", name: "Tax 2026", side: "personal", createdAt: "" },
  ];

  it("need a usable name that is not already taken", () => {
    assert.equal(folderProblem("Garden club", folders), null);
    assert.match(folderProblem("  ", folders) ?? "", /Name the folder/);
    assert.match(folderProblem("tax 2026", folders) ?? "", /already/);
    assert.equal(folderProblem("tax 2026", folders, "fol-a"), null);
    assert.match(folderProblem("a/b", folders) ?? "", /slashes/);
    assert.equal(folderProblem("123 456 789", folders), TFN_REFUSAL);
  });

  it("sort with the shoebox first, then personal, then community", () => {
    assert.deepEqual(sortFolders(folders).map((folder) => folder.id), [SHOEBOX_ID, "fol-a", "fol-b"]);
  });

  it("hold their captures newest paper first", () => {
    const all = [
      capture({ id: "cap-a", date: "2026-10-01" }),
      capture({ id: "cap-b", date: "2026-11-01" }),
      capture({ id: "cap-c", date: "2026-11-01", folderId: "fol-a" }),
    ];
    assert.deepEqual(capturesIn(all, SHOEBOX_ID).map((item) => item.id), ["cap-b", "cap-a"]);
    assert.deepEqual(capturesIn(all, "fol-a").map((item) => item.id), ["cap-c"]);
  });
});

describe("attaching", () => {
  it("round-trips a target and rejects anything else", () => {
    assert.deepEqual(parseAttach(attachValue("tax", "cgt")), { kind: "tax", id: "cgt" });
    assert.deepEqual(parseAttach("ledger:KOA-AAAA-BBBB"), { kind: "ledger", id: "KOA-AAAA-BBBB" });
    for (const bad of ["", "tax", "tax:", ":cgt", "bank:login"]) assert.equal(parseAttach(bad), null, bad);
    assert.match(captureProblem({ ...emptyDraft(TODAY), title: "x", attach: "bank:login" }) ?? "", /attach/);
  });

  it("finds the captures for a target and names them for a note", () => {
    const all = [
      capture({ id: "cap-a", attach: "tax:cgt", title: "Contract of sale", date: "2026-05-02" }),
      capture({ id: "cap-b", attach: "bequest:will" }),
      capture({ id: "cap-c" }),
    ];
    assert.deepEqual(capturesFor(all, "tax:cgt").map((item) => item.id), ["cap-a"]);
    assert.deepEqual(titlesByTarget(all, "tax"), { cgt: ["Contract of sale (2 May 2026)"] });
    assert.equal(attachLabel("tax:cgt", CATALOGUE), "Tax flag: A sale, a gift or an inheritance");
    assert.equal(attachLabel("", CATALOGUE), "Not attached");
    assert.match(attachLabel("minutes:min-gone", CATALOGUE), /no longer on this device/);
  });
});

describe("search and export", () => {
  const all = [
    capture({ id: "cap-a", title: "Corner grocer", note: "milk for the street party" }),
    capture({ id: "cap-b", title: "Hardware", supplier: "Hall's", text: "TIMBER 90x45", date: "2026-03-09" }),
  ];

  it("searches every written field", () => {
    assert.deepEqual(searchCaptures(all, "street milk").map((item) => item.id), ["cap-a"]);
    assert.deepEqual(searchCaptures(all, "timber").map((item) => item.id), ["cap-b"]);
    assert.deepEqual(searchCaptures(all, "9 mar").map((item) => item.id), ["cap-b"]);
    assert.equal(searchCaptures(all, "").length, 2);
    assert.equal(searchCaptures(all, "zebra").length, 0);
  });

  it("makes file names any device will accept", () => {
    assert.equal(safeFileName('a/b:c*?"<>| d'), "abc d");
    assert.equal(safeFileName("  "), "capture");
    assert.equal(exportStem(all[1]), "2026-03-09 Hardware");
    assert.equal(fileExtension({ name: "IMG_0001.JPG", type: "image/jpeg", size: 1 }), "jpg");
    assert.equal(fileExtension({ name: "scan", type: "application/pdf", size: 1 }), "pdf");
    assert.equal(fileExtension(null), "");
  });

  it("writes a capture as a text note with no currency sign and the notice", () => {
    const text = captureText(all[0], "Shoebox", "Not attached");
    assert.match(text, /Amount as printed: 18\.00/);
    assert.match(text, /General information, not tax, legal or financial advice/);
    assert.doesNotMatch(text, /\$/);
    assert.equal(findIdentifier(text), null);
  });
});
