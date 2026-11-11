/**
 * Turns the text read from a picture of a receipt into a date, an amount and
 * a supplier for a person to check.
 *
 * It is rule-based and runs on this device. It guesses, and the confirm
 * screen says so: nothing is saved until the person has looked at each field.
 * The amount is copied as printed. koa never adds to it or works with it.
 */

import { addDays, isISODate } from "../dates.ts";

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
const MONTH_NAMES = MONTHS.join("|");

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

/** Tidies spacing and drops lines that are only stray marks. */
export function tidyOcrText(raw: string): string {
  const lines = raw
    .replace(/\r/g, "")
    .split("\n")
    .map((line) => line.replace(/[ \t ]+/g, " ").trim())
    .filter((line) => line === "" || /[a-z\d]/i.test(line));
  const out: string[] = [];
  for (const line of lines) {
    if (line === "" && (out.length === 0 || out[out.length - 1] === "")) continue;
    out.push(line);
  }
  return out.join("\n").trim();
}

/** Letters a reader commonly mistakes for digits, fixed only inside prices. */
const DIGIT_FIXES: Record<string, string> = { O: "0", o: "0", l: "1", I: "1", S: "5", B: "8" };

function fixPriceDigits(line: string): string {
  return line.replace(/(?<![a-z\d])\$?[\dOolISB]{1,7}[.,][\dOolISB]{2}(?![a-z\d])/gi, (token) =>
    /\d/.test(token) ? token.replace(/[OolISB]/g, (letter) => DIGIT_FIXES[letter] ?? letter) : token,
  );
}

/* -------------------------------------------------------------------- date */

function fullYear(text: string, today: string): number {
  if (text.length === 4) return Number(text);
  const century = Math.floor(Number(today.slice(0, 4)) / 100) * 100;
  return century + Number(text);
}

function toISO(year: number, month: number, day: number): string {
  return `${year}-${pad(month)}-${pad(day)}`;
}

function plausible(iso: string, today: string): boolean {
  if (!isISODate(iso)) return false;
  const oldest = `${Number(today.slice(0, 4)) - 15}-01-01`;
  return iso >= oldest && iso <= addDays(today, 1);
}

/** Every date on a line, read day first as Australian papers print them. */
function datesOnLine(line: string, today: string): string[] {
  const found: string[] = [];
  const push = (iso: string) => {
    if (plausible(iso, today)) found.push(iso);
  };

  for (const match of line.matchAll(/(?<!\d)(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})(?!\d)/g)) {
    push(toISO(Number(match[1]), Number(match[2]), Number(match[3])));
  }
  for (const match of line.matchAll(/(?<![\d.])(\d{1,2})[-/.](\d{1,2})[-/.](\d{4}|\d{2})(?![\d.])/g)) {
    let day = Number(match[1]);
    let month = Number(match[2]);
    // Only a month above twelve shows the paper was printed month first.
    if (month > 12 && day <= 12) [day, month] = [month, day];
    push(toISO(fullYear(match[3], today), month, day));
  }
  const dayFirst = new RegExp(
    String.raw`(?<!\d)(\d{1,2})(?:st|nd|rd|th)?[ -]?(${MONTH_NAMES})[a-z]*\.?,?[ -]?(\d{4}|\d{2})(?!\d)`,
    "gi",
  );
  for (const match of line.matchAll(dayFirst)) {
    push(toISO(fullYear(match[3], today), MONTHS.indexOf(match[2].toLowerCase()) + 1, Number(match[1])));
  }
  const monthFirst = new RegExp(String.raw`\b(${MONTH_NAMES})[a-z]*\.? (\d{1,2})(?:st|nd|rd|th)?,? (\d{4})(?!\d)`, "gi");
  for (const match of line.matchAll(monthFirst)) {
    push(toISO(Number(match[3]), MONTHS.indexOf(match[1].toLowerCase()) + 1, Number(match[2])));
  }
  return found;
}

export function findDate(text: string, today: string): string {
  let first = "";
  for (const line of text.split("\n")) {
    const dates = datesOnLine(line, today);
    if (dates.length === 0) continue;
    if (/\b(date|dated|issued)\b/i.test(line)) return dates[0];
    first ||= dates[0];
  }
  return first;
}

/* ------------------------------------------------------------------ amount */

const PRICE = /(?<![\d.,])\$?\s?(\d{1,3}(?:,\d{3})+|\d{1,6})[.,](\d{2})(?![\d,]|\.\d)/g;

const STRONG_TOTAL =
  /\b(grand total|total due|amount due|balance due|total payable|amount payable|invoice total|total to pay|total aud|please pay)\b|\btotal\s*\(?inc(?:l|luding)?\.?\s+gst/i;
/** Lines that mention a total but carry a part of it, not the total itself. */
const NOT_THE_TOTAL =
  /\bsub\s*-?\s*total\b|\btotal\s+(?:savings?|saved|items?|qty|discount|points|includes?)\b|\bitems?\s+total\b|\bgst\s+(?:included|incl|amount|component)\b/i;
const PLAIN_TOTAL = /\btotal\b/i;
const PAID_BY = /\b(eftpos|visa|mastercard|amex|card|paid|payment|debit)\b/i;
const NEVER = /\b(change|tendered|cash|rounding|discount|savings?|saved|gst|tax|loyalty|points|deposit|tip)\b/i;

/** How strongly a line reads as the line that carries the total. */
function lineWeight(line: string): number {
  if (NOT_THE_TOTAL.test(line)) return 0;
  if (STRONG_TOTAL.test(line)) return 4;
  if (PLAIN_TOTAL.test(line)) return 3;
  if (NEVER.test(line)) return 0;
  if (PAID_BY.test(line)) return 2;
  return 1;
}

function pricesOnLine(line: string): number[] {
  const prices: number[] = [];
  for (const match of fixPriceDigits(line).matchAll(PRICE)) {
    prices.push(Number(`${match[1].replace(/,/g, "")}.${match[2]}`));
  }
  return prices;
}

/** The amount that reads most like the total, as printed, or empty. */
export function findAmount(text: string): string {
  const lines = text.split("\n");
  let best = { weight: 0, value: 0 };
  let carried = 0;
  for (const line of lines) {
    const prices = pricesOnLine(line);
    const own = lineWeight(line);
    // A label such as TOTAL on its own line lends its weight to the next line.
    const weight = prices.length > 0 && own <= 1 && carried > own ? carried : own;
    carried = prices.length === 0 && own >= 3 ? own : 0;
    for (const value of prices) {
      if (weight > best.weight || (weight === best.weight && weight > 0 && value > best.value)) {
        best = { weight, value };
      }
    }
  }
  return best.weight > 0 ? best.value.toFixed(2) : "";
}

/* ---------------------------------------------------------------- supplier */

const NOT_A_NAME =
  /tax invoice|invoice|receipt|docket|\babn\b|a\.b\.n|\bacn\b|phone|\btel\b|\bph\b|fax|www\.|http|@|\.com|gst|\bdate\b|\btime\b|order|table|served|operator|terminal|welcome|thank|customer copy|merchant copy|\bpty\b\.?$|\[number removed\]/i;

function titleCase(value: string): string {
  if (value !== value.toUpperCase()) return value;
  return value.toLowerCase().replace(/(^|[\s\-'&/])([a-z])/g, (_match, gap: string, letter: string) => gap + letter.toUpperCase());
}

/** The first line near the top that reads like a trading name. */
export function findSupplier(text: string): string {
  const lines = text.split("\n").filter(Boolean).slice(0, 8);
  for (const line of lines) {
    const letters = line.replace(/[^a-z]/gi, "").length;
    if (letters < 3 || letters < line.replace(/\s/g, "").length / 2) continue;
    if (NOT_A_NAME.test(line) || pricesOnLine(line).length > 0) continue;
    const cleaned = line
      .replace(/^[^a-z\d]+|[^a-z\d.)]+$/gi, "")
      .replace(/\s+/g, " ")
      .slice(0, 60)
      .trim();
    if (cleaned.replace(/[^a-z]/gi, "").length >= 3) return titleCase(cleaned);
  }
  return "";
}

/* ------------------------------------------------------------------- whole */

export type ReceiptFields = {
  date: string;
  amount: string;
  supplier: string;
  title: string;
  /** Which fields koa found on the paper. The rest are left for the person. */
  found: { date: boolean; amount: boolean; supplier: boolean };
};

export function parseReceipt(raw: string, today: string): ReceiptFields {
  const text = tidyOcrText(raw);
  const date = findDate(text, today);
  const amount = findAmount(text);
  const supplier = findSupplier(text);
  return {
    date: date || today,
    amount,
    supplier,
    title: supplier ? `${supplier} receipt` : "",
    found: { date: date !== "", amount: amount !== "", supplier: supplier !== "" },
  };
}
