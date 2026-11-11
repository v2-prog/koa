/**
 * A short list of Australian structures. It is a reading list for a
 * conversation with a solicitor. Nothing here chooses one for anybody.
 */

export type AssetLock = "No" | "Often" | "Yes" | "Retirement purpose only";

export type Structure = {
  id: string;
  name: string;
  what: string;
  control: string;
  lock: AssetLock;
  lockNote?: string;
  /** Everyday-language explanation shown by "Explain this". Stored in the app. */
  explain: string;
  /** An uncertain or state-specific point, and who has to check it. */
  verify?: { what: string; who: string };
};

export const STRUCTURES: Structure[] = [
  {
    id: "sole-trader",
    name: "Sole trader",
    what: "One person trading in their own name. There is no separate legal person.",
    control: "The individual.",
    lock: "No",
    explain:
      "You and the business are the same person. It is the simplest way to start: a market stall, mowing lawns, freelance work. The other side of simple is that what the business owes, you owe.",
  },
  {
    id: "partnership",
    name: "Partnership",
    what: "Two or more people carrying on a business together.",
    control: "The partners, under their agreement.",
    lock: "No",
    explain:
      "Two or more people run one business and share what comes of it. A written agreement says who decides what and what happens if someone leaves. Without one, the law of the state or territory fills the gaps, and each partner can be answerable for what the others do.",
    verify: {
      what: "Partnership law is set by each state and territory.",
      who: "a solicitor in that state or territory",
    },
  },
  {
    id: "company",
    name: "Company (Pty Ltd)",
    what: "A separate legal person, owned by shareholders and run by directors.",
    control: "Directors day to day. Shareholders on the larger decisions.",
    lock: "No",
    explain:
      "A company is its own legal person. It can own things, owe money and be taken to court in its own name. Shareholders own it and directors run it, and in a small company those are often the same people. Directors carry legal duties that do not go away because the company is small.",
  },
  {
    id: "family-trust",
    name: "Discretionary (family) trust",
    what: "A trustee holds assets and decides who in a family group benefits.",
    control: "The trustee, and whoever the deed lets appoint or remove the trustee.",
    lock: "No",
    explain:
      "Someone, the trustee, holds things on behalf of a family group and decides each year who benefits. Nobody in the family owns a fixed slice. The trust deed is the rule book, and the person who can replace the trustee usually holds the real control. That control does not pass under a will, which surprises many families.",
  },
  {
    id: "testamentary-trust",
    name: "Testamentary trust",
    what: "A trust written into a will. It starts when the person dies.",
    control: "The trustee named in the will.",
    lock: "No",
    explain:
      "A trust that only exists on paper, inside a will, until the person dies. Then it comes alive and holds what the will puts into it for the people named. Families use it when they want someone steady looking after an inheritance, for example for young children.",
  },
  {
    id: "smsf",
    name: "Self-managed super fund",
    what: "A super fund run by its own members as trustees, for retirement benefits.",
    control: "The members, as trustees or as directors of a trustee company.",
    lock: "Retirement purpose only",
    explain:
      "A super fund you run yourself, with up to a handful of members who are all responsible for it. Everything in it has to be for retirement, and the rules about what it can buy and who it can deal with are strict. It is real work every year, not a set-and-forget account.",
    verify: {
      what: "Whether running a fund suits the people involved.",
      who: "a licensed financial adviser and a registered tax agent, as well as the solicitor",
    },
  },
  {
    id: "association",
    name: "Incorporated association",
    what: "A members' body registered under state or territory law for a not-for-profit purpose.",
    control: "A committee the members elect.",
    lock: "Often",
    lockNote: "Surplus is generally not paid out to members.",
    explain:
      "The usual home for a club, a community garden or a parents' group. Members join, elect a committee, and the association can hold a bank account and sign a lease in its own name. Money left over goes back into the purpose, not to the members.",
    verify: {
      what: "The Act, the regulator and the winding-up rules differ by state and territory.",
      who: "a solicitor, or that state or territory's regulator",
    },
  },
  {
    id: "co-operative",
    name: "Co-operative",
    what: "A body owned and controlled by its members, usually one member one vote.",
    control: "The members, through a board they elect.",
    lock: "Often",
    lockNote: "A non-distributing co-operative does not pay surplus to members.",
    explain:
      "A business or service owned by the people who use it or work in it. Each member gets one vote, however much they have put in. Some co-operatives share surplus with members and some never do. Which kind it is gets decided at the start and written into its rules.",
    verify: {
      what: "Which co-operatives law applies in the state or territory.",
      who: "a solicitor, or that state or territory's registrar",
    },
  },
  {
    id: "guarantee-company",
    name: "Company limited by guarantee",
    what: "A public company with members instead of shareholders. Common for charities and community bodies.",
    control: "A board the members elect.",
    lock: "Often",
    lockNote: "Its constitution usually stops surplus going to members.",
    explain:
      "A company with members and no shares, registered nationally. Larger charities and community organisations use it when they work across more than one state. Members promise a small fixed amount if it is ever wound up, and that promise is the guarantee in the name.",
  },
  {
    id: "charitable-trust",
    name: "Charitable trust or community land trust",
    what: "Holds assets for a charitable or community purpose, not for named people.",
    control: "Trustees or a board bound to the purpose.",
    lock: "Yes",
    lockNote: "What goes in stays locked to the purpose.",
    explain:
      "Something is given to a purpose instead of to people: a scholarship, a piece of bushland, homes that stay affordable. Whoever looks after it is bound to the purpose. That lock is the point, and it is also why this can never do the job of a family trust. What goes in does not come back.",
    verify: {
      what: "A community land trust is not one fixed legal form in Australia. It is built from one of the forms above.",
      who: "a solicitor",
    },
  },
];

export function structureById(id: string): Structure | undefined {
  return STRUCTURES.find((item) => item.id === id);
}
