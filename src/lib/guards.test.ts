import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { deepRefusal, findIdentifier, looksLikeTfn, refusalFor, REMOVED_MARK, scrubIdentifiers, TFN_REFUSAL } from "./guards.ts";
import { makeId, makeMark, makeRef } from "./ids.ts";

describe("tax file number refusal", () => {
  it("refuses nine digits however they are spaced", () => {
    for (const text of ["123456789", "123 456 789", "123-456-789", "my number is 123 456 789 ok", "x123456789y"]) {
      assert.equal(looksLikeTfn(text), true, text);
      assert.equal(refusalFor(text), TFN_REFUSAL);
    }
  });

  it("refuses any number the text itself calls a tax file number", () => {
    for (const text of ["TFN: 12 34", "tfn 8842", "Tax file number is 55", "tax file no. 123", "T.F.N. 99"]) {
      assert.equal(findIdentifier(text), "tfn", text);
    }
  });

  it("lets ordinary writing through", () => {
    for (const text of [
      "Asked the agent about the TFN declaration form. 3 things to bring.",
      "Meeting on 2026-11-11 at 7:30 pm, 14 people present",
      "Paid 42.50 at the bakery on 11/11/2026",
      "Phone 0412 345 678",
      "Invoice 2026-0417",
      "",
    ]) {
      assert.equal(findIdentifier(text), null, text);
    }
  });
});

describe("other identifiers", () => {
  it("refuses card numbers, bank details, balances, member numbers and logins", () => {
    assert.equal(findIdentifier("card 4111 1111 1111 1111"), "card");
    assert.equal(findIdentifier("BSB 062-000"), "bank");
    assert.equal(findIdentifier("Account number: 1234 5678"), "bank");
    assert.equal(findIdentifier("super balance is 250000"), "bank");
    assert.equal(findIdentifier("Member number 884213"), "member");
    assert.equal(findIdentifier("Medicare 2123 45670 1"), "member");
    assert.equal(findIdentifier("password: hunter22"), "login");
    assert.equal(findIdentifier("PIN = 4821"), "login");
  });

  it("does not trip on the words alone", () => {
    assert.equal(findIdentifier("Check the super balance with the fund"), null);
    assert.equal(findIdentifier("Ask about membership and the account"), null);
    assert.equal(findIdentifier("Never write a password in koa"), null);
  });
});

describe("deepRefusal", () => {
  it("finds an identifier anywhere inside a record", () => {
    assert.equal(deepRefusal({ a: [{ b: "fine" }, { c: { d: "tfn 123 456 789" } }] }), TFN_REFUSAL);
    assert.equal(deepRefusal({ a: ["fine", 123456789, null, { b: true }] }), null);
  });

  it("passes over files", () => {
    assert.equal(deepRefusal({ blob: new Blob(["123 456 789"]), name: "receipt.jpg" }), null);
  });
});

describe("scrubIdentifiers", () => {
  it("removes identifier-like numbers and keeps dates and prices", () => {
    const raw = [
      "CORNER GROCER PTY LTD",
      "ABN 12 345 678 901",
      "Date 11-11-2026  14:02",
      "TOTAL 42.50",
      "CARD 4111 1111 1111 1111",
      "Customer No 884213",
      "Ph 0412 345 678",
      "TFN 123 456 789",
    ].join("\n");
    const { text, removed } = scrubIdentifiers(raw);
    assert.equal(findIdentifier(text), null);
    assert.match(text, /11-11-2026/);
    assert.match(text, /TOTAL 42\.50/);
    assert.match(text, /CORNER GROCER/);
    assert.doesNotMatch(text, /345 678 901|4111|884213|123 456 789/);
    assert.ok(removed >= 5);
    assert.ok(text.includes(REMOVED_MARK));
  });

  it("always returns text that passes the guard", () => {
    for (const raw of ["tax file 1", "x 123456789 y", "pin: 9999 and password = abcdef", "2026-11-11 123456789"]) {
      assert.equal(findIdentifier(scrubIdentifiers(raw).text), null, raw);
    }
    assert.match(scrubIdentifiers("2026-11-11 123456789").text, /2026-11-11/);
  });

  it("leaves clean text alone", () => {
    assert.deepEqual(scrubIdentifiers("Milk 3.20\nBread 4.50"), { text: "Milk 3.20\nBread 4.50", removed: 0 });
  });
});

describe("ids", () => {
  it("never contain a digit, so they can never look like an identifier", () => {
    for (let index = 0; index < 200; index += 1) {
      for (const value of [makeId("cap"), makeRef(), makeMark()]) {
        assert.doesNotMatch(value, /\d/);
        assert.equal(findIdentifier(value), null);
      }
    }
    assert.match(makeRef(), /^KOA-[A-Z]{4}-[A-Z]{4}$/);
  });
});

describe("privatePaper", () => {
  it("spots papers whose picture should not be kept", async () => {
    const { privatePaper } = await import("./guards.ts");
    for (const text of ["PAYG payment summary\nTFN 123 456 789", "BSB: 062-000 Account No 1234 5678", "Medicare card 2123 45670 1", "Closing balance 1,204.11", "Your password is hunter22"]) {
      assert.equal(privatePaper(text), true, text);
    }
    for (const text of ["CORNER GROCER\nABN 12 345 678 901\nTOTAL 18.00\nCARD ************1234", "Customer No 884213\nThank you", "Balance due 40.00"]) {
      assert.equal(privatePaper(text), false, text);
    }
  });
});
