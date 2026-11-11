/**
 * How koa sits beside the other Woods projects. Hosts and repos are the ones
 * those projects name; a live site can move.
 */

export type Room = {
  id: string;
  name: string;
  repo: string;
  host: string;
  hostUrl: string;
  repoUrl: string;
  holds: string;
  rhyme: string;
  global: string;
};

/** The split of jobs across the shelf. koa carries a small part of each. */
export const SHELF_STEPS: { title: string; where: string; inKoa: string }[] = [
  { title: "Name the people", where: "Concentric Circles", inKoa: "Life-stage rings" },
  { title: "Know the tax shape", where: "ARC, literacy only", inKoa: "Five tax questions" },
  { title: "Keep the minutes", where: "Friends SMF", inKoa: "Meeting minutes" },
  { title: "Read about structures", where: "Structure Lab", inKoa: "Structure list" },
  { title: "Move units", where: "Q units", inKoa: "Device ledger" },
  { title: "Allocate only interest", where: "Community fund", inKoa: "Community proposals" },
];

export const ROOMS: Room[] = [
  {
    id: "koa",
    name: "koa",
    repo: "v2-prog/koa",
    host: "tax.koa.au",
    hostUrl: "https://tax.koa.au",
    repoUrl: "https://github.com/v2-prog/koa",
    holds:
      "This app. A fork of Q units that adds paper capture with on-device reading, local folders, fuller life-stage rings and a plain-words helper. Personal and community in one place, on one device.",
    rhyme: "Kudumbashree nests a household circle inside a wider society. koa keeps both rings on the same page and never mixes their money.",
    global: "Kudumbashree",
  },
  {
    id: "q",
    name: "Q units",
    repo: "v2-prog/Qunit",
    host: "q.vilo.au",
    hostUrl: "https://q.vilo.au",
    repoUrl: "https://github.com/v2-prog/Qunit",
    holds:
      "Purchasing power and gifting, one-to-one with dollars held in reserve. koa's Home, ledger and community proposals are that ledger, carried over with its rules.",
    rhyme: "Chiemgauer lets idle value feed the commons. Banco Palmas maps the street before it issues. WIR stays inside a known member circuit.",
    global: "Chiemgauer · Banco Palmas · WIR",
  },
  {
    id: "cc",
    name: "Concentric Circles",
    repo: "v2-prog/cc",
    host: "cc.vilo.au",
    hostUrl: "https://cc.vilo.au",
    repoUrl: "https://github.com/v2-prog/cc",
    holds:
      "Family life-stage planner. Personal and community rings, two-year age bands, ledgers, cross-entity flags, and what-if scenarios.",
    rhyme: "A forty-unit gift should not need the general meeting. The rings say who is near enough to decide.",
    global: "Kudumbashree",
  },
  {
    id: "arc",
    name: "ARC Tax",
    repo: "v2-prog/arc",
    host: "t.vilo.au",
    hostUrl: "https://t.vilo.au",
    repoUrl: "https://github.com/v2-prog/arc",
    holds:
      "Guided Australian tax interview, review screen and worksheet. Direct ATO lodgment is out of scope. No real tax data in the repo.",
    rhyme: "A public rule has to be written down and checked. ARC is literacy. It is not the community fund and it does not move units.",
    global: "Public rule, verified",
  },
  {
    id: "fsmf",
    name: "Friends SMF",
    repo: "v2-prog/fsmf",
    host: "fsmf.vilo.au",
    hostUrl: "https://fsmf.vilo.au",
    repoUrl: "https://github.com/v2-prog/fsmf",
    holds:
      "Voluntary financial and administrative tools for a small society. Public site plus a member area. Related earlier repo: friendsmf.",
    rhyme: "Cercles.coop and Loomio: a meeting that can produce minutes and a vote. Administration is not the same thing as the reserve.",
    global: "Cercles.coop · Loomio",
  },
  {
    id: "lab",
    name: "Structure Lab",
    repo: "v2-prog/structure-lab",
    host: "acerlab.link",
    hostUrl: "https://acerlab.link",
    repoUrl: "https://github.com/v2-prog/structure-lab",
    holds:
      "Twelve-room notebook for family, land and purpose. Succession, structures, a charity and co-op studio, glossary. A charity with an asset lock is not a family trust.",
    rhyme: "Mondragón shows a federation of rooms with a solidarity fund kept apart from any one member’s spending money.",
    global: "Mondragón",
  },
  {
    id: "woods",
    name: "Woods",
    repo: "v2-prog/Woods",
    host: "Umbrella",
    hostUrl: "https://github.com/v2-prog/Woods",
    repoUrl: "https://github.com/v2-prog/Woods",
    holds:
      "Umbrella for the apps and the notes archive. Houses life-stage planning, CoEconomics and Structure Lab. Australia only. General information.",
    rhyme: "The bench is the evidence cupboard. Woods is the shelf they sit on. Neither one is a bank.",
    global: "Open Collective",
  },
];
