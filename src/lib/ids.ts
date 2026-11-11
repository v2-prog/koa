/**
 * Ids and references made of letters only.
 *
 * Nothing koa generates contains a digit, so nothing it generates can ever be
 * mistaken for an identifier by the guards in guards.ts.
 */

const LETTERS = "abcdefghjkmnpqrstvwxyz";

function randomLetters(count: number): string {
  const bytes = new Uint8Array(count);
  globalThis.crypto.getRandomValues(bytes);
  let out = "";
  for (const byte of bytes) out += LETTERS[byte % LETTERS.length];
  return out;
}

/** A local id such as `cap-qhzkwmtrbvxa`. */
export function makeId(prefix: string): string {
  return `${prefix}-${randomLetters(12)}`;
}

/** A receipt reference such as `KOA-QHZK-WMTR`. */
export function makeRef(): string {
  const letters = randomLetters(8).toUpperCase();
  return `KOA-${letters.slice(0, 4)}-${letters.slice(4)}`;
}

/** The demo mark for the ledger on this device. */
export function makeMark(): string {
  return `koa-${randomLetters(4)}`;
}
