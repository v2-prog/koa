import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { termsIn } from "../../data/glossary.ts";
import { plainWords, sentences, simplifyNote } from "./simplify.ts";

const LONG = `Spoke with the solicitor about Mum's enduring power of attorney on Tuesday. The weather was awful and parking took ages. She said the form must be signed while Mum still has capacity, so we need to book a visit before 30 November. My brother thinks we should wait until after Christmas. The solicitor also asked whether the super has a binding nomination. I had a coffee afterwards. We need to ask the super fund to confirm the nomination. The office was nicely decorated.`;

describe("simplifyNote", () => {
  it("keeps the note's own key sentences, in order, and never invents one", () => {
    const result = simplifyNote(LONG);
    assert.equal(result.alreadyShort, false);
    assert.equal(result.total, 8);
    assert.equal(result.kept, 3);
    assert.ok(result.wordsAfter < result.wordsBefore);
    const original = sentences(LONG).map((sentence) => plainWords(sentence));
    const kept = sentences(result.short);
    for (const sentence of kept) assert.ok(original.includes(sentence), sentence);
    assert.deepEqual(kept, original.filter((sentence) => kept.includes(sentence)));
    assert.match(result.short, /30 November/);
    assert.doesNotMatch(result.short, /coffee|decorated|parking/);
  });

  it("explains the jargon it finds", () => {
    const terms = simplifyNote(LONG).terms.map((item) => item.term);
    assert.deepEqual(terms, ["solicitor", "enduring power of attorney", "super", "binding nomination"]);
  });

  it("leaves a short note alone apart from plainer words", () => {
    const result = simplifyNote("Prior to the meeting we require additional chairs.");
    assert.equal(result.alreadyShort, true);
    assert.equal(result.short, "Before the meeting we need more chairs.");
  });

  it("copes with nothing", () => {
    const result = simplifyNote("   ");
    assert.equal(result.short, "");
    assert.equal(result.total, 0);
  });
});

describe("plainWords", () => {
  it("swaps stiff phrases and keeps capitals", () => {
    assert.equal(plainWords("In order to commence, obtain assistance."), "To start, get help.");
    assert.equal(plainWords("We utilised approximately ten."), "We used about ten.");
  });
});

describe("termsIn", () => {
  it("matches whole words only, in the order they appear", () => {
    assert.deepEqual(termsIn("The executor paid GST.").map((item) => item.term), ["executor", "GST"]);
    assert.deepEqual(termsIn("Superb suggestion, gstaad").map((item) => item.term), []);
  });

  it("does not mistake everyday words for legal ones", () => {
    assert.deepEqual(termsIn("I will be there in ten minutes with the title of the book.").map((item) => item.term), []);
    assert.deepEqual(termsIn("She has a will. The minutes of the meeting are done.").map((item) => item.term), ["will", "minutes"]);
  });

  it("holds no figure, rate or promise", () => {
    for (const { plain } of termsIn("ABN GST CGT super SMSF DGR will probate reserve interest the principal demurrage")) {
      assert.doesNotMatch(plain, /\$|%|\bper cent\b|you (will|could|can) save/i);
    }
  });
});
