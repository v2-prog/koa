import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { findAmount, findDate, findSupplier, parseReceipt, tidyOcrText } from "./receipt-parse.ts";

const TODAY = "2026-11-11";

const GROCER = `
  CORNER GROCER
  12 High Street Katoomba
  TAX INVOICE
  ABN [number removed]
  Date: 09/11/2026   Time 14:02

  Milk 2L            4.60
  Sourdough          7.50
  Apples 1kg         5.90
  SUBTOTAL          18.00
  TOTAL             18.00
  GST included in total 0.68
  EFTPOS            18.00
  ~~~~
  Thank you
`;

describe("receipt reading", () => {
  it("finds the date, total and supplier on a plain supermarket docket", () => {
    const fields = parseReceipt(GROCER, TODAY);
    assert.equal(fields.date, "2026-11-09");
    assert.equal(fields.amount, "18.00");
    assert.equal(fields.supplier, "Corner Grocer");
    assert.equal(fields.title, "Corner Grocer receipt");
    assert.deepEqual(fields.found, { date: true, amount: true, supplier: true });
  });

  it("falls back to today and empty fields when the paper says nothing", () => {
    const fields = parseReceipt("~~ ..\n--", TODAY);
    assert.equal(fields.date, TODAY);
    assert.equal(fields.amount, "");
    assert.equal(fields.supplier, "");
    assert.deepEqual(fields.found, { date: false, amount: false, supplier: false });
  });
});

describe("findDate", () => {
  it("reads day first, as Australian papers print", () => {
    assert.equal(findDate("03/04/2026", TODAY), "2026-04-03");
    assert.equal(findDate("3.4.26", TODAY), "2026-04-03");
    assert.equal(findDate("Issued 2026-10-31", TODAY), "2026-10-31");
    assert.equal(findDate("9 Nov 2026", TODAY), "2026-11-09");
    assert.equal(findDate("9th November, 2026", TODAY), "2026-11-09");
    assert.equal(findDate("November 9, 2026", TODAY), "2026-11-09");
  });

  it("only swaps day and month when the month cannot be a month", () => {
    assert.equal(findDate("11/25/2025", TODAY), "2025-11-25");
  });

  it("ignores dates that cannot be right, and prefers a labelled one", () => {
    assert.equal(findDate("31/02/2026", TODAY), "");
    assert.equal(findDate("01/01/2031", TODAY), "");
    assert.equal(findDate("01/01/1999", TODAY), "");
    assert.equal(findDate("Member since 01/02/2020\nDate 05/11/2026", TODAY), "2026-11-05");
  });

  it("does not mistake a price for a date", () => {
    assert.equal(findDate("Milk 4.60\nTOTAL 18.00", TODAY), "");
  });
});

describe("findAmount", () => {
  it("prefers the total over the subtotal, the tax and the cash handed over", () => {
    assert.equal(findAmount("SUBTOTAL 45.00\nDISCOUNT 5.00\nTOTAL 40.00\nCASH 50.00\nCHANGE 10.00"), "40.00");
    assert.equal(findAmount("Total 110.00\nTotal includes GST 10.00"), "110.00");
    assert.equal(findAmount("Item 9.00\nAMOUNT DUE $1,234.50\nTotal savings 3.00"), "1234.50");
  });

  it("reads a total printed under its label", () => {
    assert.equal(findAmount("Coffee 4.50\nTOTAL\n$9.00\nCASH 20.00"), "9.00");
  });

  it("falls back to the largest plain price, and to nothing", () => {
    assert.equal(findAmount("Coffee 4.50\nMuffin 5.50"), "5.50");
    assert.equal(findAmount("GST 1.00\nChange 3.00"), "");
    assert.equal(findAmount("No prices here"), "");
  });

  it("repairs letters misread inside a price", () => {
    assert.equal(findAmount("TOTAL 1O.5O"), "10.50");
    assert.equal(findAmount("TOTAL 42,50"), "42.50");
  });
});

describe("findSupplier", () => {
  it("skips headings and contact lines", () => {
    assert.equal(findSupplier("TAX INVOICE\nwww.example.com.au\nPh [number removed]\nBLUE WREN CAFE\nTable 4"), "Blue Wren Cafe");
    assert.equal(findSupplier("Hall's Hardware & Timber\n1 Main Rd"), "Hall's Hardware & Timber");
    assert.equal(findSupplier("12.50\n---"), "");
  });
});

describe("tidyOcrText", () => {
  it("drops stray marks and squeezes blank lines", () => {
    assert.equal(tidyOcrText("  A   B \n\n\n ~~ \n\n C\t D \r\n"), "A B\n\nC D");
  });
});
