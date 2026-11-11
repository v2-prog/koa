/**
 * Everyday meanings for words that turn up on receipts, in wills and in
 * meeting papers. General information only.
 *
 * Each meaning is one or two sentences, holds no figure and no rate, and does
 * not say what anyone should do. "Explain this" and "Simplify this note" look
 * words up here. Nothing is looked up anywhere else.
 */

export type GlossaryEntry = {
  term: string;
  /** Other ways the word is written. Matched as whole words, any case. */
  also?: string[];
  /**
   * For everyday words that only sometimes carry the special meaning: the
   * phrases that do. When set, the bare term is not matched on its own.
   */
  only?: string[];
  plain: string;
};

export const GLOSSARY: GlossaryEntry[] = [
  { term: "ABN", also: ["Australian business number"], plain: "A public number that identifies a business. It is printed on tax invoices. koa removes it from text it reads, because the business name is enough." },
  { term: "GST", also: ["goods and services tax"], plain: "A tax that is included in the price of most goods and services." },
  { term: "tax invoice", plain: "A receipt from a seller registered for GST that shows the GST in the price." },
  { term: "deduction", also: ["deductions", "deductible"], plain: "A cost the tax law lets a person subtract from their income before tax is worked out. A record is needed." },
  { term: "CGT", also: ["capital gains tax", "capital gain", "capital gains"], plain: "Tax on the gain made when an asset such as shares or property is sold or given away. It is part of income tax, not a separate tax." },
  { term: "cost base", also: ["cost-base"], plain: "What an asset cost to buy, hold, improve and sell. It is used when a capital gain is worked out." },
  { term: "depreciation", also: ["decline in value"], plain: "Claiming the cost of an item over the years it is used, not all at once." },
  { term: "PAYG", also: ["pay as you go"], plain: "Tax taken out of pay, or paid in instalments, during the year." },
  { term: "BAS", also: ["business activity statement"], plain: "A form a business lodges to report GST and other amounts." },
  { term: "tax agent", also: ["registered tax agent"], plain: "A person registered with the Tax Practitioners Board to give tax advice and lodge returns for a fee." },
  { term: "super", also: ["superannuation"], plain: "Money set aside during working life for retirement, held by a super fund." },
  { term: "SMSF", also: ["self-managed super fund", "self managed super fund"], plain: "A super fund run by its own members as trustees." },
  { term: "concessional contribution", also: ["concessional contributions"], plain: "A super contribution made from income before tax, such as an employer's contribution." },
  { term: "binding nomination", also: ["death benefit nomination", "binding death benefit nomination"], plain: "An instruction to a super fund about who should receive the super when the member dies. Whether it binds depends on the fund's rules." },
  { term: "will", only: ["a will", "the will", "my will", "his will", "her will", "their will", "your will", "valid will", "wills"], plain: "A legal document that says who receives what a person owns when they die, and who carries that out." },
  { term: "executor", also: ["executors"], plain: "The person a will names to carry out the will." },
  { term: "probate", plain: "A court's confirmation that a will is valid and that the executor can act." },
  { term: "intestate", also: ["intestacy"], plain: "Dying without a valid will. State and territory law then sets who inherits." },
  { term: "bequest", also: ["bequests"], plain: "A gift left to a person or an organisation in a will." },
  { term: "beneficiary", also: ["beneficiaries"], plain: "A person or organisation that receives something from a will, a trust or a super fund." },
  { term: "enduring power of attorney", also: ["power of attorney"], plain: "A document naming who can make money and property decisions if the person no longer can." },
  { term: "enduring guardian", also: ["enduring guardianship", "medical decision-maker", "medical decision maker"], plain: "A person appointed to make health and living decisions if the person no longer can." },
  { term: "advance care directive", also: ["advance care plan"], plain: "A written statement of a person's wishes for future medical treatment." },
  { term: "trustee", also: ["trustees"], plain: "The person or company that holds a trust's assets and must follow the trust deed." },
  { term: "trust deed", plain: "The document that sets a trust's rules, including who controls it." },
  { term: "discretionary trust", also: ["family trust"], plain: "A trust where the trustee decides who in a group benefits, and by how much." },
  { term: "testamentary trust", plain: "A trust written into a will. It starts when the person dies." },
  { term: "asset lock", plain: "A rule that keeps an organisation's assets tied to its purpose, so they cannot be paid out to members or family." },
  { term: "DGR", also: ["deductible gift recipient"], plain: "An organisation endorsed to receive gifts that the giver may be able to claim as a deduction." },
  { term: "incorporated association", plain: "A members' body registered under state or territory law for a not-for-profit purpose." },
  { term: "co-operative", also: ["cooperative", "co-op"], plain: "A body owned and controlled by its members, usually one member, one vote." },
  { term: "quorum", plain: "The smallest number of members who must be present for a meeting's decisions to count. The group's own rules set it." },
  { term: "motion", only: ["a motion", "the motion", "motions", "moved a motion"], plain: "A proposal put to a meeting for a decision." },
  { term: "minutes", only: ["the minutes", "meeting minutes", "minutes of"], plain: "The written record of who was at a meeting and what was decided." },
  { term: "reserve", only: ["the reserve", "in reserve", "held in reserve"], plain: "Money set aside and not spent. In koa's demo, one unit stands for one Australian dollar held in reserve." },
  { term: "reserve interest", plain: "Interest earned on the reserve. In koa's demo it is the only pot a community proposal can ask from." },
  { term: "principal", only: ["the principal"], plain: "The amount set aside itself, as distinct from what it earns. In koa's demo the principal is never available to a proposal." },
  { term: "demurrage", plain: "A small loss of value on money left idle. Some local currencies use it to keep money moving." },
  { term: "main residence", also: ["principal place of residence", "family home"], plain: "The home a person lives in. Selling it is usually treated differently for capital gains tax, with conditions." },
  { term: "short-stay", also: ["short stay", "short-term rental"], plain: "Letting a room or a home for short periods, often through a booking platform." },
  { term: "negative gearing", also: ["negatively geared"], plain: "Where the costs of an investment are more than the income it earns, and the loss is set against other income." },
  { term: "stamp duty", also: ["transfer duty"], plain: "A state or territory tax on some transactions, such as buying property. The rules differ by state and territory." },
  { term: "title", only: ["property title", "certificate of title", "title search", "title deed", "on the title"], plain: "The official record of who owns a property and how it is held." },
  { term: "joint tenants", also: ["joint tenancy"], plain: "One way of owning property together. When one owner dies, their share passes to the other owners and not under the will." },
  { term: "tenants in common", plain: "One way of owning property together. Each owner holds a share that can be left under their will." },
  { term: "solicitor", plain: "A lawyer who can give legal advice and prepare documents such as wills." },
  { term: "financial adviser", also: ["financial advisor"], plain: "A person licensed to give advice about financial products such as super and investments." },
  { term: "public officer", plain: "The person an association or company names as its contact for a regulator." },
  { term: "constitution", only: ["the constitution", "its constitution", "our constitution", "rules of association"], plain: "The written rules a company or association runs by." },
];

function escape(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const MATCHERS: { entry: GlossaryEntry; pattern: RegExp }[] = GLOSSARY.map((entry) => ({
  entry,
  pattern: new RegExp(
    `(?<![a-z\\d-])(?:${(entry.only ?? [entry.term, ...(entry.also ?? [])]).map(escape).join("|")})(?![a-z\\d-])`,
    "i",
  ),
}));

export type FoundTerm = { term: string; plain: string };

/** The glossary words that appear in some text, in the order they appear. */
export function termsIn(text: string): FoundTerm[] {
  const found: { index: number; entry: GlossaryEntry }[] = [];
  for (const { entry, pattern } of MATCHERS) {
    const match = pattern.exec(text);
    if (match) found.push({ index: match.index, entry });
  }
  return found
    .sort((a, b) => a.index - b.index)
    .map(({ entry }) => ({ term: entry.term, plain: entry.plain }));
}
