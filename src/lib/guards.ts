/**
 * Guards that keep identifiers out of koa.
 *
 * koa is not a place for identifiers. It does not ask for a tax file number,
 * a bank login, a balance or a member number, and it refuses to save text that
 * looks like one. The checks are deliberately blunt: if text looks like an
 * identifier it is refused, even when it might be something harmless such as
 * a business number. The person takes the number out and saves again.
 *
 * Every write to this device goes through `deepRefusal` (see local-store.ts
 * and idb.ts), so a screen cannot forget the check.
 */

export type IdentifierKind = "tfn" | "card" | "bank" | "member" | "login";

/** An optional "number", "no.", "#", then an optional "is", ":" or "=". */
const LABEL_GAP = String.raw`(?:\s*(?:number|num|no\.?|id|#))?(?:\s*(?:is|was|[:=#\-–]))?\s*`;

/** Nine digits, written together or in threes with spaces or hyphens. */
const TFN_SHAPED = /(?<!\d)\d{3}[  -]?\d{3}[  -]?\d{3}(?!\d)/;
/** Any number that the text itself calls a tax file number. */
const TFN_LABELLED = new RegExp(String.raw`\b(?:t\.?f\.?n\.?|tax\s+file)${LABEL_GAP}\d`, "i");

/** Thirteen to nineteen digits, with single spaces or hyphens allowed. */
const CARD_SHAPED = /(?<!\d)\d(?:[ -]?\d){12,18}(?!\d)/;

const BANK_LABELLED = new RegExp(
  [
    String.raw`\bbsb\b[\s:#=\-–]*\d{3}`,
    String.raw`\bacc(?:oun)?t\.?\s*(?:number|num|no\.?|#)\s*(?:is|was|[:=#\-–])?\s*\d{3}`,
    String.raw`\b(?:bank|account|super(?:annuation)?)\s+balance(?:\s*(?:is|was|of|[:=\-–]))?\s*\$?\s*\d`,
  ].join("|"),
  "i",
);

const MEMBER_LABELLED = new RegExp(
  [
    String.raw`\b(?:member(?:ship)?|customer|client|policy|medicare|centrelink)\s*(?:number|num|no\.?|#|id|ref(?:erence)?)\s*(?:is|was|[:=#\-–])?\s*[a-z]{0,3}\d{3,}`,
    String.raw`\b(?:medicare|crn)\b[\s:#=\-–]*\d{4,}`,
  ].join("|"),
  "i",
);

const LOGIN_LABELLED = /\b(?:password|passcode|passphrase|pin)\s*(?:is|was|[:=])\s*\S{3,}/i;

const CHECKS: [IdentifierKind, RegExp[]][] = [
  ["tfn", [TFN_LABELLED, TFN_SHAPED]],
  ["card", [CARD_SHAPED]],
  ["bank", [BANK_LABELLED]],
  ["member", [MEMBER_LABELLED]],
  ["login", [LOGIN_LABELLED]],
];

export function looksLikeTfn(value: string): boolean {
  return TFN_LABELLED.test(value) || TFN_SHAPED.test(value);
}

/** The first kind of identifier the text looks like, or null. */
export function findIdentifier(value: string): IdentifierKind | null {
  for (const [kind, patterns] of CHECKS) {
    if (patterns.some((pattern) => pattern.test(value))) return kind;
  }
  return null;
}

export const TFN_REFUSAL =
  "That looks like a tax file number. koa does not ask for one and will not save text that contains one. Take the number out, then save.";

export const REFUSALS: Record<IdentifierKind, string> = {
  tfn: TFN_REFUSAL,
  card: "That looks like a card number. koa is not a place for identifiers. Take the number out, then save.",
  bank: "That looks like bank account details or a balance. koa takes no bank details and no balances. Take them out, then save.",
  member:
    "That looks like a member, customer or Medicare number. koa is not a place for identifiers. Take the number out, then save.",
  login: "That looks like a password or PIN. koa takes no logins. Take it out, then save.",
};

/** A refusal message if any of the values looks like an identifier. */
export function refusalFor(...values: (string | null | undefined)[]): string | null {
  for (const value of values) {
    if (!value) continue;
    const kind = findIdentifier(value);
    if (kind) return REFUSALS[kind];
  }
  return null;
}

/**
 * Walks anything about to be stored and refuses if a string inside it looks
 * like an identifier. Files and numbers are passed over: a file cannot be
 * read here, and koa's own numbers are unit counts.
 */
export function deepRefusal(value: unknown, depth = 0): string | null {
  if (typeof value === "string") return refusalFor(value);
  if (value === null || typeof value !== "object" || depth > 12) return null;
  if (typeof Blob !== "undefined" && value instanceof Blob) return null;
  if (value instanceof ArrayBuffer || ArrayBuffer.isView(value) || value instanceof Date) return null;
  const children = Array.isArray(value) ? value : Object.values(value as Record<string, unknown>);
  for (const child of children) {
    const refusal = deepRefusal(child, depth + 1);
    if (refusal) return refusal;
  }
  return null;
}

const PRIVATE_PAPER = new RegExp(
  [
    TFN_LABELLED.source,
    String.raw`\bbsb\b[\s:#=\-–]*\d{3}`,
    String.raw`\bacc(?:oun)?t\.?\s*(?:number|num|no\.?|#)\s*(?:is|was|[:=#\-–])?\s*\d{3}`,
    String.raw`\b(?:medicare|centrelink|crn)\b[^\n]{0,24}\d{4,}`,
    String.raw`\b(?:account|closing|opening|available)\s+balance\b`,
    LOGIN_LABELLED.source,
  ].join("|"),
  "i",
);

/**
 * True when the words read from a picture say it is a private paper: one that
 * shows a tax file number, bank account details, a Medicare or Centrelink
 * number, or a login. koa keeps the cleaned-up text of such a paper but will
 * not keep the picture itself, because a picture cannot be cleaned.
 *
 * A reader can miss a label, so the confirm screen also asks the person to
 * look at the picture before keeping it.
 */
export function privatePaper(rawText: string): boolean {
  return PRIVATE_PAPER.test(rawText);
}

export const REMOVED_MARK = "[number removed]";

const DATE_LIKE = /(?<!\d)(?:\d{4}-\d{1,2}-\d{1,2}|\d{1,2}-\d{1,2}-\d{2,4})(?!\d)/g;
/** Eight or more digits in a row, single spaces or hyphens allowed. */
const LONG_DIGIT_RUN = /(?<!\d)\d(?:[  -]?\d){7,}(?!\d)/g;
/** A labelled number of any length: the label stays, the number goes. */
const LABELLED_NUMBER = new RegExp(
  String.raw`(\b(?:t\.?f\.?n\.?|tax\s+file|a\.?b\.?n\.?|a\.?c\.?n\.?|bsb|acc(?:oun)?t|member(?:ship)?|customer|client|policy|medicare|centrelink|crn|card|rrn|auth|terminal|merchant|stan)${LABEL_GAP})((?:[a-z]{0,3}[\d*x][\d*x  -]*\d|\d))`,
  "gi",
);
const LOGIN_VALUE = /(\b(?:password|passcode|passphrase|pin)\s*(?:is|was|[:=])\s*)\S{3,}/gi;
const BALANCE_VALUE =
  /(\b(?:bank|account|super(?:annuation)?)\s+balance(?:\s*(?:is|was|of|[:=\-–]))?\s*)\$?\s*[\d,.]+/gi;

export type Scrubbed = { text: string; removed: number };

/**
 * Takes numbers that look like identifiers out of text read from a picture,
 * before a person sees it and long before anything is saved. Dates and
 * prices are left alone. The result always passes `findIdentifier`.
 */
export function scrubIdentifiers(raw: string): Scrubbed {
  let removed = 0;
  const dates: string[] = [];
  // Hold dates aside so a hyphenated date is not mistaken for a long number.
  let text = raw.replace(DATE_LIKE, (match) => {
    dates.push(match);
    return `\u0001${String.fromCharCode(64 + ((dates.length - 1) % 26) + 1)}${dates.length - 1}\u0002`;
  });
  const drop = (keep: string) => {
    removed += 1;
    return `${keep}${REMOVED_MARK}`;
  };
  text = text.replace(LABELLED_NUMBER, (_match, label: string) => drop(label));
  text = text.replace(LOGIN_VALUE, (_match, label: string) => drop(label));
  text = text.replace(BALANCE_VALUE, (_match, label: string) => drop(label));
  text = text.replace(LONG_DIGIT_RUN, () => drop(""));
  text = text.replace(/\u0001[A-Z](\d+)\u0002/g, (_match, index: string) => dates[Number(index)] ?? "");

  // Anything a pattern above missed is removed a whole line at a time.
  if (findIdentifier(text)) {
    text = text
      .split("\n")
      .map((line) => {
        if (!findIdentifier(line)) return line;
        removed += 1;
        return REMOVED_MARK;
      })
      .join("\n");
  }
  if (findIdentifier(text)) {
    removed += 1;
    text = REMOVED_MARK;
  }
  return { text, removed };
}
