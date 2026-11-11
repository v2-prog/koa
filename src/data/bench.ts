export type Kind = "governance" | "fund" | "cooperative" | "public" | "currency";

export type Region = "Europe" | "Americas" | "Africa" | "Asia-Pacific" | "Global";

export type Entry = {
  id: string;
  name: string;
  place: string;
  region: Region;
  kinds: Kind[];
  founded: string;
  originalLang: string;
  original: string;
  englishLine: string;
  briefing: string;
  publicSupport: string;
  borrow: string;
  caution: string;
  sourceLabel: string;
  sourceUrl: string;
  relevance: number;
};

export const KIND_LABEL: Record<Kind, string> = {
  governance: "Governance",
  fund: "Community fund",
  cooperative: "Cooperative",
  public: "Public support",
  currency: "Circulating unit",
};

export const REGIONS: Region[] = [
  "Europe",
  "Americas",
  "Africa",
  "Asia-Pacific",
  "Global",
];

export const PATTERNS = [
  {
    title: "Map the street before you issue",
    body: "Banco Palmas interviewed thousands of neighbours before the Palma existed. Sarafu treats a unit as a promise of real goods. A fund that starts from a spreadsheet of needs beats one that starts from a token.",
  },
  {
    title: "One person, one vote",
    body: "Mondragón, Loomio, Local Return and WIR all refuse to let a larger cheque buy a larger say. Capital can sit in the reserve. It does not steer the room.",
  },
  {
    title: "Yield goes to the commons",
    body: "Chiemgauer’s demurrage and nonprofit share, and a 1:1 reserve whose interest is allocatable, keep the holder from being an investor. The unit circulates. The surplus is a decision.",
  },
  {
    title: "Publish the decision and the receipt",
    body: "Decidim, CONSUL, hum.community and Open Collective only work because the proposal, the vote and the spend are visible. A community fund that cannot show its last allocation is a private account.",
  },
];

export const ENTRIES: Entry[] = [
  {
    id: "chiemgauer",
    name: "Chiemgauer",
    place: "Chiemgau, Bavaria",
    region: "Europe",
    kinds: ["currency", "fund"],
    founded: "2003",
    originalLang: "German",
    original: "Regionales Zahlungsmittel für den Chiemgau.",
    englishLine: "A regional means of payment for the Chiemgau.",
    briefing:
      "A complementary currency used beside the euro by people, shops and nonprofits around Lake Chiemsee. Paper notes have historically carried demurrage, so value left idle is not a way to save. A share of turnover is directed to local nonprofits the participants choose. It is one of the better-documented regional currencies in the German-speaking solidarity-economy literature.",
    publicSupport:
      "Not legal tender and not a state benefit. It runs with municipal and business acceptance rather than a government appropriation. The useful public lesson is tolerance: a local circuit can sit beside the national currency if it does not pretend to be a bank.",
    borrow:
      "Closest cousin of a gift-or-expire rule. Loss of idle value can feed a community fund without paying interest to the person holding the unit.",
    caution:
      "Demurrage rates and the nonprofit share have changed over the years. Copy the principle, not a number from an old case study.",
    sourceLabel: "Socioeco dossier, Chiemgauer and Banco Palmas",
    sourceUrl: "https://www.socioeco.org/bdf_fiche-document-1501_en.html",
    relevance: 5,
  },
  {
    id: "hum",
    name: "hum.community",
    place: "Aotearoa New Zealand",
    region: "Asia-Pacific",
    kinds: ["fund", "governance"],
    founded: "2020s",
    originalLang: "English",
    original: "Community controlled funds.",
    englishLine: "Community controlled funds.",
    briefing:
      "A participatory microgranting platform from The Wellbeing Protocol. Local groups post a need, members vote, and funded work comes back with updates and receipts. Funders, councils, iwi and small community groups sit in the same flow. Published uses include Regen Melbourne’s urban-governance trial and Māori men’s health work.",
    publicSupport:
      "Built for public and private funders, including local councils, rather than as a ministry system. The government role is a participant with a budget, not the owner of the vote.",
    borrow:
      "The whole fund room in three beats: propose, vote, show the receipt. That is the interaction model, independent of any currency.",
    caution:
      "Hum moves grants. It does not issue a circulating unit or hold a 1:1 reserve. Do not treat a vote on a grant as a licence to operate a payment system.",
    sourceLabel: "hum.community",
    sourceUrl: "https://hum.community/",
    relevance: 5,
  },
  {
    id: "cobudget",
    name: "Cobudget",
    place: "Enspiral, then worldwide",
    region: "Global",
    kinds: ["fund", "governance"],
    founded: "2014",
    originalLang: "English",
    original: "Ideation, co-creation, and collective budgeting.",
    englishLine: "Ideation, co-creation, and collective budgeting.",
    briefing:
      "Open-source software for a group that already holds a shared pool. People post proposals and distribute the pool across them. The Scottish Government’s 2024 civic-tech review lists it among the tools that cover the path from an idea to a money decision.",
    publicSupport:
      "Named in a government market scan of civic technology, not funded as a national programme. Useful as a procurement reference: a public body has already described what this class of tool is for.",
    borrow:
      "If the reserve interest is a finite pot, allocate it like a budget, with a visible remainder. Do not open a second, quieter process for the same money.",
    caution:
      "The product has changed hands and pace since the Enspiral years. Treat it as a pattern, and check whether a given install is still maintained.",
    sourceLabel: "Scottish Government civic-tech review, 2024",
    sourceUrl:
      "https://www.gov.scot/publications/market-research-existing-civic-technologies-participation/pages/4/",
    relevance: 5,
  },
  {
    id: "palmas",
    name: "Banco Palmas",
    place: "Conjunto Palmeiras, Fortaleza",
    region: "Americas",
    kinds: ["fund", "currency", "cooperative"],
    founded: "1998",
    originalLang: "Portuguese",
    original: "Banco comunitário: o dinheiro circula no bairro.",
    englishLine: "A community bank: the money circulates in the neighbourhood.",
    briefing:
      "Residents of a peripheral neighbourhood in Fortaleza started a community development bank and a social currency, the Palma, after mapping how households actually earned and spent. Microcredit stayed tied to local production and local shops. Instituto Palmas later helped a national network of community banks, including Indigenous communities, fishing communities and other favelas.",
    publicSupport:
      "The Central Bank of Brazil spent years opposing the social currency, then in 2011 issued a technical note recognising community development banks and social currencies. The national solidarity-economy secretariat (SENAES) funded replication. Public money arrived after the practice, and it has also been withdrawn when governments changed.",
    borrow:
      "Survey the circuit first. Issue only against something the neighbourhood can redeem. Seek a written recognition from the regulator instead of hoping nobody notices.",
    caution:
      "A community bank that takes deposits or makes credit is a regulated activity in Australia. This is a design lesson, not a template you can copy into an ABN.",
    sourceLabel: "Accion, Banco Palmas field note",
    sourceUrl: "https://www.accion.org/banco-palmas-a-model-for-socially-embedded-financial-services/",
    relevance: 5,
  },
  {
    id: "decidim",
    name: "Decidim",
    place: "Barcelona, now worldwide",
    region: "Europe",
    kinds: ["governance", "public"],
    founded: "2016",
    originalLang: "Catalan",
    original: "Decidim és una plataforma digital per a la participació democràtica.",
    englishLine: "Decidim is a digital platform for democratic participation.",
    briefing:
      "Free software born at Barcelona City Council for proposals, debates, votes, participatory budgets and assemblies. Cities, cooperatives and the European Commission run their own instances. The software itself is steered by the Metadecidim community, which is the unusual part: the tool’s governance is a public process, not a vendor roadmap. A 2026 academic review of Decidim Barcelona and Decide Madrid treats the two as the reference municipal platforms of the last decade.",
    publicSupport:
      "Designed for public decision-making and paid for, in its first life, by a city council. The Scottish Government’s 2024 review singled it out for inter-organisational collaboration that other civic-tech tools do not match.",
    borrow:
      "A community-fund proposal needs a status (open, accepted, rejected), a public rationale, and a record that survives the meeting. Decidim is the record, not the money.",
    caution:
      "It will not hold a reserve or move units. Bolting a wallet onto it without a separate rulebook mixes a democracy tool with a payment service.",
    sourceLabel: "Decidim, first steps",
    sourceUrl: "https://decidim.org/first-steps/",
    relevance: 4,
  },
  {
    id: "consul",
    name: "CONSUL Democracy",
    place: "Madrid, now worldwide",
    region: "Europe",
    kinds: ["governance", "public"],
    founded: "2015",
    originalLang: "Spanish",
    original: "Software libre de participación ciudadana.",
    englishLine: "Free software for citizen participation.",
    briefing:
      "Open-source participation software from Madrid City Council, known there as Decide Madrid. It covers petitions, consultations, participatory budgets and collaborative legislation. Published directories describe adoption by well over a hundred public institutions in dozens of countries. It is simpler and less flexible than Decidim, which is often why a council can actually run it.",
    publicSupport:
      "A city-government product, relicensed so other governments can host it themselves. Support is the legal and budget authority of the institution using it, not a grant inside the software.",
    borrow:
      "Use a short petition path for small allocations and a heavier budget path for the reserve-interest pot. Two doors, one ledger.",
    caution:
      "Participatory budgeting fails when the amount is symbolic. If the room cannot move real money, do not borrow the ceremony.",
    sourceLabel: "OpenGov civic-tech directory",
    sourceUrl: "https://www.gov.ong/",
    relevance: 4,
  },
  {
    id: "cercles",
    name: "Cercles.coop",
    place: "Catalonia",
    region: "Europe",
    kinds: ["governance", "cooperative"],
    founded: "2026",
    originalLang: "Spanish",
    original: "Herramientas para la gobernanza digital cooperativa.",
    englishLine: "Tools for cooperative digital governance.",
    briefing:
      "A repository and platform from the tech cooperative Colectic, published in November 2026. It packages virtual assemblies, secure votes, automatic minutes and a participation guide for cooperatives, on free software and on Decidim, of which Colectic is an official partner. The point is a meeting a registrar could recognise, not a social feed.",
    publicSupport:
      "Cooperative infrastructure rather than a government portal. It inherits Decidim’s use by local governments, and it is explicit about legal traceability: privacy, an audit trail, and minutes.",
    borrow:
      "A fund vote should produce an acta. Who was present, what was asked, what passed, and where the receipt will be posted.",
    caution:
      "Spanish and Catalan cooperative law is not ACT associations law. The habit of minutes travels. The legal form does not.",
    sourceLabel: "Economía Solidaria, November 2026",
    sourceUrl:
      "https://www.economiasolidaria.org/recursos/cercles-coop-herramientas-para-la-gobernanza-digital-cooperativa/",
    relevance: 4,
  },
  {
    id: "loomio",
    name: "Loomio",
    place: "Wellington, Aotearoa",
    region: "Asia-Pacific",
    kinds: ["governance", "cooperative"],
    founded: "2012",
    originalLang: "English",
    original: "Decide together, across time and distance.",
    englishLine: "Decide together, across time and distance.",
    briefing:
      "A worker-owned cooperative’s decision tool: a thread, a proposal, and a vote (agree, abstain, disagree, block). Used by cooperatives, associations and some local governments. The Scottish Government review ranked it with the strongest open civic tools, and noted that its data policies are unusually clear.",
    publicSupport:
      "Not a government system. It shows up in public-sector scans because councils and public agencies already use cooperative software for board-level decisions.",
    borrow:
      "A fund proposal is a Loomio proposal with a dollar figure and an expiry. Block should mean “this would breach the reserve rule”, not “I dislike the project”.",
    caution:
      "Consent culture can stall a small pot. Set a close date on every allocation.",
    sourceLabel: "International Cooperative Alliance, tools list",
    sourceUrl: "https://www.ica.coop/en/tools-and-apps",
    relevance: 4,
  },
  {
    id: "goteo",
    name: "Goteo",
    place: "Spain",
    region: "Europe",
    kinds: ["fund", "public"],
    founded: "2011",
    originalLang: "Spanish",
    original: "Financiación colectiva para el procomún.",
    englishLine: "Crowdfunding for the commons.",
    briefing:
      "A civic crowdfunding foundation. Campaigns ask for community pledges and, on many calls, a public or philanthropic match. Rewards are often open: the thing funded has to be reusable. Platoniq, the cooperative behind it, has also wired Goteo’s logic into Decidim.",
    publicSupport:
      "Match-funding calls are the government instrument. The authority puts up a pot that only moves when residents have already pledged. That is a cleaner use of public money than a closed grants panel.",
    borrow:
      "Reserve interest can match gifts instead of replacing them. A proposal that nobody will co-fund with their own units is a weak claim on the commons.",
    caution:
      "Crowdfunding law and donation incentives differ in Australia. Matching is the idea. The campaign licence is not.",
    sourceLabel: "Platoniq / Decidim-Goteo",
    sourceUrl: "https://github.com/Platoniq/decidim-goteo",
    relevance: 4,
  },
  {
    id: "wir",
    name: "WIR",
    place: "Switzerland",
    region: "Europe",
    kinds: ["cooperative", "currency"],
    founded: "1934",
    originalLang: "German",
    original: "WIR Wirtschaftsring-Genossenschaft.",
    englishLine: "WIR means “we”: a cooperative economic circle.",
    briefing:
      "A member-owned business circle and cooperative bank. Small and medium firms trade and borrow in WIR alongside Swiss francs, so a slow season does not have to mean a stop in work. The Schumacher Center’s currency-model note describes annual turnover in the billions of francs and treats WIR as its own category: older and more institutional than a volunteer voucher.",
    publicSupport:
      "It is a regulated Swiss cooperative bank, not a grant programme. The public support is the legal form itself: a cooperative credit institution the supervisor can see.",
    borrow:
      "A circulating unit used between known members, with credit rules written down, is a different object from a coin the public can speculate on. Stay on that side of the line.",
    caution:
      "WIR’s scale took ninety years and a banking licence. Quoting its turnover as a target for a new Australian unit would be fantasy.",
    sourceLabel: "Schumacher Center, local currency models",
    sourceUrl:
      "https://centerforneweconomics.org/apply/local-currencies-program/local-currency-models/",
    relevance: 4,
  },
  {
    id: "mondragon",
    name: "Mondragón",
    place: "Basque Country",
    region: "Europe",
    kinds: ["cooperative", "fund"],
    founded: "1956",
    originalLang: "Spanish",
    original: "Una persona, un voto.",
    englishLine: "One person, one vote.",
    briefing:
      "A federation of worker cooperatives across industry, retail, finance and education. A 2026 Civic Blueprint digest, using 2024 figures, describes about 95 cooperatives, on the order of 81,000 workers and about €11 billion in revenue. Surplus does not only return to the firm that earned it. An inter-cooperative solidarity fund supports cooperatives in trouble and the group relocates worker-members to avoid unemployment. Laboral Kutxa is the cooperative bank. Lagun Aro is the mutual for health and retirement.",
    publicSupport:
      "Private cooperative law, not a ministry. The public lesson is that a solidarity fund can be mandatory inside the federation: successful members contribute by rule, not by annual mood.",
    borrow:
      "Keep the community fund constitutionally separate from any one member’s purchasing power. The fund is a rule about surplus. The unit is a rule about exchange.",
    caution:
      "These are worker-owners of trading businesses. A volunteer association does not have their wage bargain or their capital accounts. Do not import the whole corporation.",
    sourceLabel: "Civic Blueprint source digest, 2026",
    sourceUrl:
      "https://civicblueprint.org/docs/sources/source-cooperatives-mondragon-digest",
    relevance: 4,
  },
  {
    id: "sarafu",
    name: "Sarafu Network",
    place: "Kenya",
    region: "Africa",
    kinds: ["currency", "cooperative"],
    founded: "2010s",
    originalLang: "Swahili",
    original: "Sarafu.",
    englishLine: "The Swahili word means currency, or coins.",
    briefing:
      "Grassroots Economics supports communities to issue their own inclusion currencies: vouchers a group can redeem for goods and services its members actually have. A May 2022 research note reported on the order of 60,000 users and several million US dollars of recorded trade across dozens of villages, mostly for basic needs. Issuers are audited by the community and by the supporting organisation. The voucher is a claim on capacity, not a savings account.",
    publicSupport:
      "A community and NGO infrastructure, studied as an economic commons. It is not a central-bank currency. Kenyan authorities have variously tolerated and constrained community currencies; the operating rule has been to stay obviously redeemable.",
    borrow:
      "If a unit cannot be redeemed for something named, it is not ready to circulate. Redemption is the governance.",
    caution:
      "The 2022 volumes are a research snapshot, not a live dashboard. Blockchain was the rail, not the point.",
    sourceLabel: "Grassroots Economics, CIC research note, May 2022",
    sourceUrl: "https://grassrootseconomics.org/pdfs/CIC_Research_Findings-May-2022.pdf",
    relevance: 4,
  },
  {
    id: "local-return",
    name: "Local Return",
    place: "Rhode Island, United States",
    region: "Americas",
    kinds: ["fund", "cooperative"],
    founded: "2026",
    originalLang: "English",
    original: "A diversified community investment fund.",
    englishLine: "A diversified community investment fund.",
    briefing:
      "The Rhode Island Community Investment Cooperative opened a direct public offering in 2026 for what it calls the country’s first diversified community investment fund, described at launch as a 3.5 million dollar raise. Residents can subscribe. Each investor receives one voting share. The fund intends loans and equity, roughly 15,000 to 500,000 dollars, into local real estate and ventures that keep ownership in the neighbourhood. The board is elected from the investors.",
    publicSupport:
      "Early support from the Rhode Island Foundation and Bank Newport, plus the legal path of a direct public offering. This is public-offering law, not a grant.",
    borrow:
      "The people who live with the result hold the vote. That part travels. The investment part does not: a unit backed 1:1 and spent or gifted is the opposite of a share you hope will grow.",
    caution:
      "This is an investment fund. Copying it without a securities exemption would be unlawful in Australia. Use it as a warning label as much as a model.",
    sourceLabel: "Local Return, launch note, 2026",
    sourceUrl:
      "https://localreturn.org/introducing-the-local-return-diversified-community-investment-fund/",
    relevance: 3,
  },
  {
    id: "kudumbashree",
    name: "Kudumbashree",
    place: "Kerala, India",
    region: "Asia-Pacific",
    kinds: ["public", "cooperative", "fund"],
    founded: "1998",
    originalLang: "Malayalam",
    original: "കുടുംബശ്രീ",
    englishLine: "Kudumbashree: prosperity of the family.",
    briefing:
      "The Government of Kerala’s poverty-eradication mission. Women form neighbourhood groups that save, lend to each other, and federate upward into area and community development societies. The fund is thrift first, then credit, then small enterprise, inside a structure the state recognises. It is one of the largest women’s community networks in the world.",
    publicSupport:
      "A state mission: staff, law and a budget sit behind the neighbourhood groups, while the thrift itself is the members’ money. That split is the design.",
    borrow:
      "Nest the rooms. A household circle, a local fund, a wider assembly. Do not ask a general meeting to approve a forty-dollar gift.",
    caution:
      "Published membership figures vary by year and definition. The structure is the fact to trust; a headcount from a secondary blog is not.",
    sourceLabel: "Kerala state mission (name and mandate)",
    sourceUrl: "https://www.kudumbashree.org/",
    relevance: 4,
  },
  {
    id: "ftq",
    name: "Fonds de solidarité FTQ",
    place: "Québec",
    region: "Americas",
    kinds: ["fund", "public"],
    founded: "1983",
    originalLang: "French",
    original: "Fonds de solidarité de la Fédération des travailleurs et travailleuses du Québec.",
    englishLine: "Solidarity fund of the Quebec Federation of Labour.",
    briefing:
      "A labour-sponsored development fund. Workers subscribe savings, the fund invests in Quebec firms and jobs, and for decades a provincial tax credit has made the subscription rational for a household. It is development capital at national scale, governed through the labour movement rather than through a neighbourhood vote on each cheque.",
    publicSupport:
      "The government instrument is the tax credit and the statute that creates the fund. Public money arrives as forgone tax, not as a grant panel.",
    borrow:
      "A tax concession can capitalise a community fund. It should not be mistaken for member governance. If the state helps fill the reserve, the reserve rule still has to say who votes.",
    caution:
      "This is a large investment fund with securities rules. It is on the bench as public-support material, not as a currency.",
    sourceLabel: "Fonds de solidarité FTQ",
    sourceUrl: "https://www.fondsftq.com/",
    relevance: 2,
  },
  {
    id: "place",
    name: "PLACE",
    place: "Australia",
    region: "Asia-Pacific",
    kinds: ["public"],
    founded: "2024",
    originalLang: "English",
    original: "Partnerships for Local Action and Community Empowerment.",
    englishLine: "Partnerships for Local Action and Community Empowerment.",
    briefing:
      "A national backbone for place-based work, announced on 30 October 2024. The Australian Government contributes 19.31 million dollars over five years. Philanthropic partners (Minderoo, Paul Ramsay, Bryan, Dusseldorp and Ian Potter foundations) match that amount. PLACE is meant to help local partnerships use data, shift policy, and keep decisions in the community rather than in a single programme office.",
    publicSupport:
      "This is current Commonwealth support material: a matched public–philanthropic fund for the conditions of local decision-making. It does not itself allocate a neighbourhood’s money.",
    borrow:
      "Ask for backbone funding (facilitation, data, minutes) separately from the community fund. Mixing the two lets the funder who pays the staff quietly own the vote.",
    caution:
      "PLACE is an enabler, not a model of member voting. Do not cite it as evidence that a circulating unit is government policy.",
    sourceLabel: "Department of Social Services",
    sourceUrl:
      "https://www.dss.gov.au/supporting-community-change/partnerships-local-action-and-community-empowerment",
    relevance: 3,
  },
  {
    id: "foundations",
    name: "Community charity guidelines",
    place: "Australia",
    region: "Asia-Pacific",
    kinds: ["public", "fund"],
    founded: "2025",
    originalLang: "English",
    original: "Taxation Administration (Community Charity) Guidelines 2025.",
    englishLine: "A new deductible-gift path for community foundations.",
    briefing:
      "On 4 March 2025 the Australian Government published guidelines that open deductible gift recipient status to community foundations. These are permanent local trusts: donations are invested, and the earnings grant education, health, inclusion and recovery in a defined region. Named examples include Bass Coast, Geelong, Mackay, Alice Springs, the Eyre Peninsula, Albany and Fremantle.",
    publicSupport:
      "Treasury’s own reform. The support is tax status, which is what makes a local fund raisable. It is the closest current Commonwealth instrument to “a community fund with a legal home”.",
    borrow:
      "A permanent trust that grants from earnings is the public-law cousin of reserve interest. The earnings move. The principal stays. That rhyme is worth keeping, inside a charity structure if gifts are involved.",
    caution:
      "DGR status is not available to a payment unit. A foundation and a circulating credit are different objects and should not share a bank account.",
    sourceLabel: "Treasury ministers, 4 March 2025",
    sourceUrl:
      "https://ministers.treasury.gov.au/ministers/andrew-leigh-2022/media-releases/new-era-community-foundations",
    relevance: 3,
  },
  {
    id: "opencollective",
    name: "Open Collective",
    place: "Worldwide",
    region: "Global",
    kinds: ["fund", "governance"],
    founded: "2015",
    originalLang: "English",
    original: "Transparent budgets for groups.",
    englishLine: "Transparent budgets for groups.",
    briefing:
      "Fiscal hosting and public ledgers for open-source projects, mutual aid and associations. Income, expenses and the host’s fee are on the page. A collective can exist before it has its own legal entity, because a host organisation carries the compliance.",
    publicSupport:
      "Not a government platform. Public agencies and universities do use it where their own grant systems cannot host a small collective.",
    borrow:
      "Every allocation from reserve interest should be a line a non-member can read: who asked, who agreed, what it cost, what came back.",
    caution:
      "A fiscal host is a legal and tax relationship. Publishing a spreadsheet is not the same as having one.",
    sourceLabel: "Open Collective",
    sourceUrl: "https://opencollective.com/",
    relevance: 3,
  },
  {
    id: "fureai",
    name: "Fureai kippu",
    place: "Japan",
    region: "Asia-Pacific",
    kinds: ["currency", "public"],
    founded: "1990s",
    originalLang: "Japanese",
    original: "ふれあい切符",
    englishLine: "Tickets for a caring encounter.",
    briefing:
      "Local time-credit schemes in which an hour spent helping an older person becomes a credit the helper can use later, or sometimes send to a parent in another town. Municipalities, social-welfare councils and nonprofits have run versions of it. The unit is care, not cash, and it is difficult to hoard as an investment because the thing it buys is someone’s time.",
    publicSupport:
      "Often hosted by local government or a quasi-public welfare body. The national pension system does not clear these tickets. Support is local recognition and sometimes a small office.",
    borrow:
      "A unit can be a promise of a service the community actually has. Expiry, or a rule that unused credits are gifted on, keeps the promise from becoming property.",
    caution:
      "There is no single national platform called Fureai Kippu. It is a family of local schemes. Do not cite one city’s rules as Japan’s law.",
    sourceLabel: "Described in the complementary-currency literature as a care credit",
    sourceUrl: "https://centerforneweconomics.org/apply/local-currencies-program/local-currency-models/",
    relevance: 3,
  },
];
