/**
 * Five tax questions. Each one ends at an ATO page, a registered tax agent, or
 * "not applicable". Nothing here works out a tax, a share or a saving.
 *
 * Changes in the law carry their stage. An announcement or a bill is labelled
 * "Not law yet" and is never treated as current law. `SOURCES_CHECKED` is the
 * day the ATO pages below were last read. Review this file when a stage moves.
 */

import { formatDate } from "./dates.ts";
import { refusalFor } from "./guards.ts";

/** The day the ATO pages in this file were last read. */
export const SOURCES_CHECKED = "2026-11-11";

export type FlagId = "deduction" | "cost-base" | "short-stay" | "cgt" | "super";

export type Outcome = "ato" | "agent" | "na";

export const OUTCOME_LABEL: Record<Outcome, string> = {
  ato: "Look at the ATO page",
  agent: "Ask a registered tax agent",
  na: "Not applicable",
};

export type TaxFlag = {
  id: FlagId;
  title: string;
  /** The question in one line. */
  question: string;
  /** A general statement of the rule. */
  rule: string;
  /** Things to notice. None of them is a calculation. */
  notice: string[];
  /** What the person can write. `none` means the flag is a label only. */
  input: "words" | "nights" | "none";
  inputHint?: string;
  /** Everyday-language explanation shown by "Explain this". Stored in the app. */
  explain: string;
  ato: { label: string; url: string };
  verify: { what: string; who: string };
};

export const TAX_FLAGS: TaxFlag[] = [
  {
    id: "deduction",
    title: "A deduction, in your own words",
    question: "Did you pay for something yourself in order to earn your income?",
    rule: "A work-related deduction is generally for money you spent yourself and were not paid back, that directly relates to earning your income, and that you have a record of.",
    notice: [
      "Who paid, and whether anyone paid you back.",
      "How the expense connects to the work.",
      "Whether there is a receipt or other record.",
    ],
    input: "words",
    inputHint: "Describe what you paid for and why. Leave the amount on the receipt.",
    explain:
      "A deduction is the tax office agreeing that some of your money went on doing your job, not on you. Three plain tests usually apply: you paid, it was for work, and you can prove it. If part of the thing was for home and part for work, only the work part can count. koa does not decide any of this. It helps you write the question down and keep the receipt beside it.",
    ato: {
      label: "ATO: Deductions you can claim",
      url: "https://www.ato.gov.au/individuals-and-families/income-deductions-offsets-and-records/deductions-you-can-claim",
    },
    verify: {
      what: "Whether this expense can be claimed, and how much of it.",
      who: "a registered tax agent",
    },
  },
  {
    id: "cost-base",
    title: "Cost-base note",
    question: "Did you buy or improve something that can change in value?",
    rule: "The cost base of an asset is generally what it cost to acquire, plus certain costs of holding, improving and disposing of it. It matters when the asset is sold or given away, which can be many years later.",
    notice: [
      "The contract or invoice from the day it was acquired.",
      "Costs of buying and selling, such as legal fees.",
      "Improvements, with their dates.",
    ],
    input: "words",
    inputHint: "Note what the asset is and which papers exist. Keep the papers themselves.",
    explain:
      "When you sell something like shares or a property, the tax office looks at what it cost you, not just what you sold it for. That cost is called the cost base. It includes the price and some of the costs along the way. People lose track because the buying and the selling can be decades apart. This flag is a reminder to keep the papers from day one, so the question can be answered later.",
    ato: {
      label: "ATO: Calculating your CGT, including the cost base",
      url: "https://www.ato.gov.au/individuals-and-families/investments-and-assets/capital-gains-tax/calculating-your-cgt",
    },
    verify: {
      what: "Which costs count towards the cost base of this asset.",
      who: "a registered tax agent",
    },
  },
  {
    id: "short-stay",
    title: "Short-stay nights and private nights",
    question: "Was a room or a home let to guests and also used by you or your family?",
    rule: "When a place is let for short stays and also used privately, the nights let and the nights used privately are kept apart. Rent is declared as income, and expenses are generally claimed only for the part and the time that was let.",
    notice: [
      "Nights let to paying guests.",
      "Nights you, family or friends stayed.",
      "Whether the place is also your home. Earning income from a home can matter when it is sold.",
    ],
    input: "nights",
    inputHint: "Write the two counts. koa keeps them side by side and does not work out a share.",
    explain:
      "If you rent out a room or a holiday place some of the time and use it yourself the rest, the tax office treats those nights differently. So the first job is just counting: how many nights did guests pay for, and how many nights was it yours. koa stores the two numbers next to each other. Turning them into a claim is a job for a registered tax agent. Some states and councils also have their own short-stay rules, which are separate from tax.",
    ato: {
      label: "ATO: Renting out all or part of your home",
      url: "https://www.ato.gov.au/businesses-and-organisations/income-deductions-and-concessions/sharing-economy-and-tax/renting-out-all-or-part-of-your-home",
    },
    verify: {
      what: "How income and expenses are split between let nights and private nights. State levies and council registration rules differ by place.",
      who: "a registered tax agent for the tax, and the state revenue office or local council for levies and registration",
    },
  },
  {
    id: "cgt",
    title: "A sale, a gift or an inheritance",
    question: "Did something that can change in value change hands?",
    rule: "Capital gains tax is part of income tax, not a separate tax. It can apply when an asset such as shares, crypto or property is sold, given away or otherwise disposed of. A person's main home is generally treated differently from other property.",
    notice: [
      "What happened: a sale, a gift, or an asset passing from someone who died.",
      "The date on the contract, which is often the date that counts.",
      "Whether a home was also rented out or used to earn income.",
    ],
    input: "words",
    inputHint: "Say what changed hands and when. Leave the price on the paperwork.",
    explain:
      "If you sell or give away something that has grown in value, the growth can count as income in that year. That is capital gains tax. It is not only for big investors: shares from a job, a block of land, crypto and an inherited flat can all raise the question. The family home is usually the exception, and even that has conditions. koa only helps you note that the question exists and keep the contract beside it.",
    ato: {
      label: "ATO: Capital gains tax",
      url: "https://www.ato.gov.au/individuals-and-families/investments-and-assets/capital-gains-tax",
    },
    verify: {
      what: "Whether this event counts, which date applies, and whether an exemption is available.",
      who: "a registered tax agent",
    },
  },
  {
    id: "super",
    title: "Super, as a label",
    question: "Is there a super question to carry to someone who can answer it?",
    rule: "Super is held by a fund for retirement. Super does not automatically pass under a will. This flag is a label only: koa does not take a balance, a member number or a fund login.",
    notice: [
      "Whether an employer is paying super for you.",
      "Whether you have more than one fund.",
      "Whether the fund knows who should receive your super if you die.",
    ],
    input: "none",
    explain:
      "Super is money set aside for when you stop working. Your employer usually pays it into a fund, and the fund looks after it until you are old enough to take it out. The questions worth asking are simple ones: is it being paid, is it scattered across several funds, and does the fund know who it should go to if you die. The fund or the tax office can answer the first two. koa only keeps the reminder.",
    ato: {
      label: "ATO: Super for individuals and families",
      url: "https://www.ato.gov.au/individuals-and-families/super-for-individuals-and-families/super",
    },
    verify: {
      what: "Anything about your own account, contributions or nomination.",
      who: "the super fund, or a licensed financial adviser",
    },
  },
];

export function flagById(id: string): TaxFlag | undefined {
  return TAX_FLAGS.find((flag) => flag.id === id);
}

export function isFlagId(value: unknown): value is FlagId {
  return typeof value === "string" && TAX_FLAGS.some((flag) => flag.id === value);
}

/* ------------------------------------------------------- changes in the law */

export type Stage = "not-law" | "law-not-started" | "law";

export const STAGE_LABEL: Record<Stage, string> = {
  "not-law": "Announced or before Parliament. Current law still applies.",
  "law-not-started": "Passed, with a start date that has not arrived. Today's rules apply until then.",
  law: "In force.",
};

export function stageBadge(stage: Stage): string {
  switch (stage) {
    case "not-law":
      return "Not law yet";
    case "law-not-started":
      return "Law, not started";
    case "law":
      return "Law";
  }
}

export type LawChange = {
  id: string;
  title: string;
  stage: Stage;
  /** The date the ATO gives for the change to apply, if any. */
  starts?: string;
  summary: string;
  source: { label: string; url: string };
  /** Structure-list entries this touches. */
  structures: string[];
  /** Tax flags this touches. */
  flags: FlagId[];
  verifyWho: string;
};

export const LAW_CHANGES: LawChange[] = [
  {
    id: "trust-minimum-tax",
    title: "Minimum tax on discretionary trusts",
    stage: "not-law",
    starts: "2028-07-01",
    summary:
      "Announced in the 2026–27 Budget. It would tax a discretionary trust at the trustee level. The ATO says this measure is not yet law, so current law applies.",
    source: {
      label: "ATO: Introducing a minimum tax on discretionary trusts",
      url: "https://www.ato.gov.au/about-ato/new-legislation/in-detail/businesses/tax-reform-introducing-a-minimum-tax-on-discretionary-trusts",
    },
    structures: ["family-trust"],
    flags: [],
    verifyWho: "a registered tax agent",
  },
  {
    id: "cgt-negative-gearing",
    title: "Negative gearing and capital gains tax",
    stage: "law-not-started",
    starts: "2027-07-01",
    summary:
      "Parliament has passed changes to negative gearing on residential property and to how capital gains are taxed. The ATO says these measures are now law and apply from 1 July 2027. Today's rules apply to today's events.",
    source: {
      label: "ATO: Reforming negative gearing and capital gains tax",
      url: "https://www.ato.gov.au/about-ato/new-legislation/in-detail/individuals/tax-reform-boosting-home-ownership-reforming-negative-gearing-and-capital-gains-tax",
    },
    structures: [],
    flags: ["cgt", "cost-base", "short-stay"],
    verifyWho: "a registered tax agent",
  },
  {
    id: "super-large-balances",
    title: "Extra tax on earnings of large super balances (Division 296)",
    stage: "law",
    starts: "2026-07-01",
    summary:
      "An extra tax on some super earnings for people whose total super balance is above a threshold set in the law. The ATO says it is law and applies from the 2026–27 financial year, with first assessments issued later. koa does not work out whether it applies to anyone.",
    source: {
      label: "ATO: Better Targeted Super Concessions is law",
      url: "https://www.ato.gov.au/individuals-and-families/super-for-individuals-and-families/self-managed-super-funds-smsf/smsf-newsroom/better-targeted-super-concessions-is-law",
    },
    structures: ["smsf"],
    flags: ["super"],
    verifyWho: "the super fund, or a registered tax agent",
  },
];

export function changesForFlag(id: FlagId): LawChange[] {
  return LAW_CHANGES.filter((change) => change.flags.includes(id));
}

export function changesForStructure(id: string): LawChange[] {
  return LAW_CHANGES.filter((change) => change.structures.includes(id));
}

/* ---------------------------------------------------------------- the state */

export const MAX_WORDS = 600;
export const MAX_NIGHTS = 366;

export type FlagState = {
  outcome?: Outcome;
  words?: string;
  nightsLet?: number;
  nightsPrivate?: number;
};

export type TaxState = {
  flags: Partial<Record<FlagId, FlagState>>;
  /** How many times the question list has been exported. */
  drafts: number;
};

export const EMPTY_TAX: TaxState = { flags: {}, drafts: 0 };

export function isNights(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= MAX_NIGHTS;
}

export function reviveTax(stored: unknown): TaxState {
  if (!stored || typeof stored !== "object") return EMPTY_TAX;
  const item = stored as Record<string, unknown>;
  const flags: TaxState["flags"] = {};
  const raw = item.flags && typeof item.flags === "object" ? (item.flags as Record<string, unknown>) : {};
  for (const flag of TAX_FLAGS) {
    const value = raw[flag.id];
    if (!value || typeof value !== "object") continue;
    const state = value as Record<string, unknown>;
    const outcome = state.outcome;
    flags[flag.id] = {
      ...(outcome === "ato" || outcome === "agent" || outcome === "na" ? { outcome } : {}),
      ...(typeof state.words === "string" ? { words: state.words.slice(0, MAX_WORDS) } : {}),
      ...(isNights(state.nightsLet) ? { nightsLet: state.nightsLet } : {}),
      ...(isNights(state.nightsPrivate) ? { nightsPrivate: state.nightsPrivate } : {}),
    };
  }
  return { flags, drafts: typeof item.drafts === "number" && item.drafts >= 0 ? Math.floor(item.drafts) : 0 };
}

/** Why what was written under a flag cannot be saved, or null if it can. */
export function flagProblem(state: FlagState): string | null {
  if (state.words && state.words.length > MAX_WORDS) return "Keep the note shorter.";
  for (const nights of [state.nightsLet, state.nightsPrivate]) {
    if (nights !== undefined && !isNights(nights)) return `A count of nights is a whole number up to ${MAX_NIGHTS}.`;
  }
  return refusalFor(state.words);
}

/** How many flags have an outcome marked. */
export function markedCount(state: TaxState): number {
  return TAX_FLAGS.filter((flag) => state.flags[flag.id]?.outcome).length;
}

/**
 * The question list as a text note. It lists questions and what the person
 * wrote. It holds no amount, no identifier and nothing worked out.
 */
export function buildTaxNote(
  state: TaxState,
  papersByFlag: Partial<Record<FlagId, string[]>>,
  today: string,
): string {
  const lines: string[] = [
    `TAX QUESTIONS, DRAFT ${state.drafts + 1}`,
    `Written ${formatDate(today)} on this device.`,
    "",
    "A list of questions to take to the ATO's pages or a registered tax agent.",
    "Nothing here is worked out, and nothing has been lodged.",
    "No tax file number is in this note.",
  ];

  const groups: [Outcome, string][] = [
    ["agent", "Questions for a registered tax agent"],
    ["ato", "To read on the ATO's site"],
    ["na", "Marked not applicable"],
  ];

  for (const [outcome, heading] of groups) {
    const flags = TAX_FLAGS.filter((flag) => state.flags[flag.id]?.outcome === outcome);
    if (flags.length === 0) continue;
    lines.push("", heading);
    for (const flag of flags) {
      const saved = state.flags[flag.id] ?? {};
      lines.push("", `- ${flag.title}`, `  ${flag.question}`);
      if (saved.words?.trim()) lines.push(`  In my words: ${saved.words.trim()}`);
      if (flag.input === "nights") {
        if (saved.nightsLet !== undefined) lines.push(`  Nights let short-stay: ${saved.nightsLet}`);
        if (saved.nightsPrivate !== undefined) lines.push(`  Nights used privately: ${saved.nightsPrivate}`);
      }
      const papers = papersByFlag[flag.id] ?? [];
      if (papers.length > 0) lines.push(`  Papers kept in koa: ${papers.join("; ")}`);
      if (outcome === "ato") lines.push(`  ${flag.ato.label}: ${flag.ato.url}`);
      if (outcome === "agent") lines.push(`  To check: ${flag.verify.what}`);
      for (const change of changesForFlag(flag.id)) {
        lines.push(`  ${stageBadge(change.stage)}: ${change.title}. Who checks: ${change.verifyWho}.`);
      }
    }
  }

  const unmarked = TAX_FLAGS.filter((flag) => !state.flags[flag.id]?.outcome);
  if (unmarked.length > 0) {
    lines.push("", "Not looked at yet");
    for (const flag of unmarked) lines.push(`- ${flag.title}`);
  }

  lines.push(
    "",
    "Australia only. General information, not tax, legal or financial advice.",
    `Law-change stages were read from the ATO on ${formatDate(SOURCES_CHECKED)} and can move.`,
  );
  return lines.join("\n");
}
