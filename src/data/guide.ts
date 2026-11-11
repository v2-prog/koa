/**
 * Useful information for all ages. One short card for each life stage.
 *
 * Every line is a thing to notice or a question to ask. Nothing here is a
 * calculation, a figure or advice, and anything that states a rule names who
 * checks it. The stages match the two-year age bands on the rings.
 */

import type { StageId } from "../lib/rings.ts";

export type GuideLink = "/capture" | "/tax" | "/bequest" | "/rings" | "/structures" | "/transfer" | "/fund" | "/minutes";

export type StageGuide = {
  id: StageId;
  /** The ages the stage covers, in words. */
  ages: string;
  /** One line on what this stage is about. */
  line: string;
  /** Things to notice. Plain statements, no amounts. */
  notice: string[];
  /** A question worth carrying to someone who can answer it. */
  ask: { question: string; who: string };
  /** Where in koa this stage usually starts. */
  start: { to: GuideLink; label: string };
};

export const STAGE_GUIDES: StageGuide[] = [
  {
    id: "growing-up",
    ages: "Birth to 11",
    line: "Children learn money by watching it move.",
    notice: [
      "Saying out loud what a thing costs and why it was chosen is a lesson.",
      "Two jars, one for spending and one for giving, teach the same split koa's ledger uses.",
      "A child cannot sign for themselves. The adults' papers are what protect them.",
    ],
    ask: {
      question: "Does a will name who would care for the children?",
      who: "a solicitor in the family's state or territory",
    },
    start: { to: "/rings", label: "Put the child in the middle of the rings" },
  },
  {
    id: "teens",
    ages: "12 to 17",
    line: "A first job, a first payslip, a first account.",
    notice: [
      "A first job usually comes with a tax file number and a super account. Both are private. koa never asks for either.",
      "A payslip shows pay, tax taken out, and super paid on top. Keeping payslips is the first record-keeping habit.",
      "A message that hurries you to pay or to share a code is how most scams start.",
    ],
    ask: {
      question: "Is super being paid for this job, and into which fund?",
      who: "the employer, then the super fund",
    },
    start: { to: "/capture", label: "Capture a payslip or a receipt" },
  },
  {
    id: "starting-out",
    ages: "18 to 25",
    line: "On your own paperwork for the first time.",
    notice: [
      "Each new job can open another super account. Several small accounts are easy to lose track of.",
      "A lease, a bond and a phone plan are contracts. Keep the signed copy of each.",
      "Buy now, pay later is credit, even when it does not feel like a loan.",
      "Receipts for things bought to do your job are worth keeping all year.",
    ],
    ask: {
      question: "Can I claim this work expense, and what record do I need?",
      who: "a registered tax agent, or the ATO's page on deductions",
    },
    start: { to: "/tax", label: "Open the tax questions" },
  },
  {
    id: "building",
    ages: "26 to 45",
    line: "Other people start to depend on your papers.",
    notice: [
      "A will, and a decision about who would care for children, matter most in these years.",
      "Super and any insurance inside it do not automatically follow a will. The fund has its own form.",
      "What a home or an investment cost, and what was spent improving it, will be asked about decades later.",
      "A business, a trust or a company each has its own papers that sit outside the will.",
    ],
    ask: {
      question: "Which of the documents beside a will do we actually have?",
      who: "a solicitor, with the super fund for the nomination",
    },
    start: { to: "/bequest", label: "Open the bequest support pack" },
  },
  {
    id: "midlife",
    ages: "46 to 65",
    line: "Looking both ways: parents ageing, children leaving.",
    notice: [
      "An enduring power of attorney can only be made while a person still has capacity. The conversation comes before the need.",
      "Super nominations can lapse. A nomination made years ago may no longer stand.",
      "How a property title is held decides whether it passes under a will at all.",
      "Giving to a cause through a will is a bequest. Giving to a body with an asset lock cannot be undone.",
    ],
    ask: {
      question: "If Mum or Dad could no longer decide, who is allowed to act, and on what paper?",
      who: "a solicitor in the parent's state or territory",
    },
    start: { to: "/rings", label: "Draw the rings around a parent" },
  },
  {
    id: "later-life",
    ages: "66 and over",
    line: "Making it easy for the people who will carry things on.",
    notice: [
      "The most useful gift to an executor is a list of what exists and where the papers are kept. Leave account numbers and passwords out of koa.",
      "Funeral wishes are not part of a will, and a will is often read after the funeral.",
      "Moving into care or changing who lives in a home can affect pensions and tax. Each has its own rules.",
      "A community group that relies on one person's memory needs minutes more than it needs money.",
    ],
    ask: {
      question: "Does someone I trust know which documents exist and where they are?",
      who: "the family first, then a solicitor",
    },
    start: { to: "/bequest", label: "Tick off the documents beside the will" },
  },
];

export function guideFor(id: StageId): StageGuide {
  return STAGE_GUIDES.find((guide) => guide.id === id) ?? STAGE_GUIDES[0];
}

/** Short answers to "what is this for", in everyday words. */
export const KOA_IN_SHORT: { title: string; body: string }[] = [
  {
    title: "Two sides, kept apart",
    body: "Personal is yours and your family's: receipts, the will papers, tax questions, the rings. Community is what a group decides together: proposals, minutes, the bench. koa shows both and never mixes their money.",
  },
  {
    title: "A demo ledger, not a bank",
    body: "The units on Home are a practice ledger. One unit stands for one Australian dollar held in reserve, and no real money moves. Spending units stay in the local circuit. Gifting units have to be given on before they expire.",
  },
  {
    title: "Questions, not answers",
    body: "koa helps you write the question down and keep the paper beside it. The answer comes from the ATO's own pages, a registered tax agent, a solicitor, or the fund.",
  },
];
