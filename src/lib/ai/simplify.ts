/**
 * "Simplify this note": a short version of a person's own note, in plainer
 * words, with any jargon explained.
 *
 * This is a small language engine in plain TypeScript, not a neural model. It
 * picks the sentences that carry the most of the note (extractive, so it
 * never invents a sentence), swaps a fixed list of stiff phrases for plain
 * ones, and looks jargon up in the glossary that ships with the app. It works
 * only on text already on this device and has no way to send it anywhere.
 */

import { termsIn, type FoundTerm } from "../../data/glossary.ts";

/** Stiff phrases and the plain words that mean the same. Style only. */
const PLAIN_PHRASES: [RegExp, string][] = [
  [/\bin order to\b/gi, "to"],
  [/\bprior to\b/gi, "before"],
  [/\bsubsequent to\b/gi, "after"],
  [/\bin the event that\b/gi, "if"],
  [/\bin the event of\b/gi, "if there is"],
  [/\bwith (?:regard|respect) to\b/gi, "about"],
  [/\bin (?:relation|respect) (?:to|of)\b/gi, "about"],
  [/\bat this point in time\b/gi, "now"],
  [/\bat the present time\b/gi, "now"],
  [/\bdue to the fact that\b/gi, "because"],
  [/\bfor the purpose of\b/gi, "to"],
  [/\bin the near future\b/gi, "soon"],
  [/\ba (?:large )?number of\b/gi, "many"],
  [/\bis able to\b/gi, "can"],
  [/\bare able to\b/gi, "can"],
  [/\bcommenced\b/gi, "started"],
  [/\bcommences\b/gi, "starts"],
  [/\bcommence\b/gi, "start"],
  [/\butili[sz]ed\b/gi, "used"],
  [/\butili[sz]es\b/gi, "uses"],
  [/\butili[sz]e\b/gi, "use"],
  [/\bascertain\b/gi, "find out"],
  [/\bendeavour\b/gi, "try"],
  [/\bapproximately\b/gi, "about"],
  [/\bsufficient\b/gi, "enough"],
  [/\badditional\b/gi, "more"],
  [/\bassistance\b/gi, "help"],
  [/\bobtained\b/gi, "got"],
  [/\bobtains\b/gi, "gets"],
  [/\bobtain\b/gi, "get"],
  [/\brequired\b/gi, "needed"],
  [/\brequires\b/gi, "needs"],
  [/\brequire\b/gi, "need"],
  [/\bnotwithstanding\b/gi, "despite"],
  [/\bforthwith\b/gi, "now"],
  [/\bregarding\b/gi, "about"],
  [/\bhowever,?\b/gi, "but"],
  [/\btherefore,?\b/gi, "so"],
];

const STOP_WORDS = new Set(
  "a an and are as at be been but by can did do does for from had has have he her his i if in into is it its me my no not of on or our she so than that the their them then there these they this to us was we were what when which who will with would you your about also just very really more most some any all each been being both after before over under up down out off again".split(
    " ",
  ),
);

/** Words that mark a sentence as something to act on. */
const ACTION = /\b(must|need|needs|due|by|before|deadline|ask|check|call|book|sign|send|bring|pay|renew|lodge|confirm|remember|decide|agreed|passed)\b/i;

function matchCase(original: string, replacement: string): string {
  return /^[A-Z]/.test(original) ? replacement.charAt(0).toUpperCase() + replacement.slice(1) : replacement;
}

/** Swaps stiff phrases for plain ones. The meaning is left alone. */
export function plainWords(text: string): string {
  let out = text;
  for (const [pattern, plain] of PLAIN_PHRASES) {
    out = out.replace(pattern, (match) => matchCase(match, plain));
  }
  return out.replace(/[ \t]{2,}/g, " ");
}

/** Splits a note into sentences. Line breaks and list marks also split. */
export function sentences(text: string): string[] {
  return text
    .split(/\n+/)
    .flatMap((line) => line.replace(/^\s*(?:[-*•]|\d+[.)])\s+/, "").split(/(?<=[.!?])\s+(?=[A-Z"'(\d])/))
    .map((sentence) => sentence.trim())
    .filter((sentence) => /[a-z\d]/i.test(sentence));
}

function contentWords(sentence: string): string[] {
  return (sentence.toLowerCase().match(/[a-z][a-z'-]{2,}/g) ?? []).filter((word) => !STOP_WORDS.has(word));
}

export type Simplified = {
  /** The short version: the note's own key sentences, in plain words. */
  short: string;
  kept: number;
  total: number;
  wordsBefore: number;
  wordsAfter: number;
  /** Jargon found in the note, with everyday meanings. */
  terms: FoundTerm[];
  /** True when the note was already as short as it can usefully be. */
  alreadyShort: boolean;
};

function countWords(text: string): number {
  return (text.match(/\S+/g) ?? []).length;
}

function endSentence(sentence: string): string {
  return /[.!?:]$/.test(sentence) ? sentence : `${sentence}.`;
}

/**
 * Makes the short version of a note.
 *
 * Sentences are scored by how many of the note's most used words they carry,
 * with a little extra for the opening sentence, for sentences that hold a
 * date or a number, and for sentences that ask for something to be done.
 * The best few are kept in their original order.
 */
export function simplifyNote(text: string, maxSentences = 3): Simplified {
  const all = sentences(text);
  const terms = termsIn(text);
  const wordsBefore = countWords(text);

  if (all.length <= 2 || wordsBefore < 40) {
    const short = plainWords(all.map(endSentence).join(" ")) || text.trim();
    return { short, kept: all.length, total: all.length, wordsBefore, wordsAfter: countWords(short), terms, alreadyShort: true };
  }

  const frequency = new Map<string, number>();
  for (const sentence of all) {
    for (const word of new Set(contentWords(sentence))) frequency.set(word, (frequency.get(word) ?? 0) + 1);
  }

  const scored = all.map((sentence, index) => {
    const words = [...new Set(contentWords(sentence))];
    const shared = words.reduce((total, word) => total + ((frequency.get(word) ?? 0) > 1 ? (frequency.get(word) ?? 0) : 0), 0);
    let score = words.length === 0 ? 0 : shared / Math.sqrt(words.length);
    if (index === 0) score += 1.5;
    if (/\d/.test(sentence)) score += 1;
    if (ACTION.test(sentence)) score += 1.5;
    return { sentence, index, score };
  });

  const keep = Math.max(1, Math.min(maxSentences, Math.ceil(all.length / 3)));
  const chosen = [...scored]
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .slice(0, keep)
    .sort((a, b) => a.index - b.index);

  const short = plainWords(chosen.map((item) => endSentence(item.sentence)).join(" "));
  return {
    short,
    kept: chosen.length,
    total: all.length,
    wordsBefore,
    wordsAfter: countWords(short),
    terms,
    alreadyShort: false,
  };
}
