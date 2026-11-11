/**
 * The community support note: the one copy of a proposal that the whole room
 * reads. It states the reserve rule, cites practice from the bench, and says
 * what the proposal is not.
 */

import { ENTRIES } from "../data/bench.ts";
import { formatDate } from "./dates.ts";

export function buildSupportDoc(input: {
  title: string;
  ask: number;
  purpose: string;
  modelIds: string[];
  reserveInterest: number;
  closes: string;
}): string {
  const cited = ENTRIES.filter((entry) => input.modelIds.includes(entry.id));
  const lines = [
    "COMMUNITY FUND SUPPORT NOTE",
    input.title.trim() || "Untitled proposal",
    `Ask: ${input.ask || 0} Q from reserve interest. Principal is not touched.`,
    `Closes: ${input.closes ? formatDate(input.closes) : "no close date set"}. After that date the note is the record, not a fresh ask.`,
    `Reserve interest on the demo ledger: ${input.reserveInterest} Q.`,
    "",
    "1. The rule",
    "Q units are a means of exchange inside a known community. One unit stands for one Australian dollar held in reserve. Holders do not earn yield. Only interest on the reserve can be allocated here. Purchasing power is for spending. Gifting power expires or is given on, so value keeps moving.",
    "",
    "2. What the room is asked to see together",
    input.purpose.trim() || "No purpose written yet.",
    "This note is the co-decision copy. There is no private version for a committee and another for members.",
    "",
    "3. How a decision is recorded",
    "One member, one vote. Status, ask, close and result stay visible. A passed ask is followed by a receipt. That pattern is hum.community and Open Collective: propose, vote, show the spend. Minutes, in the Cercles.coop sense, name who was present and what passed.",
    "",
    "4. Practice cited, in English",
  ];

  if (cited.length === 0) {
    lines.push("No global model was pinned. Add at least one before this note is used in a meeting.");
  }
  for (const entry of cited) {
    lines.push("");
    lines.push(`${entry.name}, ${entry.place} (${entry.originalLang})`);
    lines.push(`Original: ${entry.original}`);
    lines.push(`English: ${entry.englishLine}`);
    lines.push(`Take: ${entry.borrow}`);
    lines.push(`Do not take: ${entry.caution}`);
    lines.push(`Source: ${entry.sourceLabel}, ${entry.sourceUrl}`);
  }

  lines.push(
    "",
    "5. What this proposal is not",
    "It is not a community investment fund and it is not a labour-sponsored development fund. Local Return and the Fonds de solidarité FTQ raise capital under securities and tax-credit rules. A circulating unit is the opposite object. Do not mix them in one bank account. A support mark on a device buys nothing and is not a share.",
    "",
    "6. Australian public support, kept in its lane",
    "PLACE (Department of Social Services, announced 30 October 2024) funds the conditions for local decisions. It does not cast the vote. The Taxation Administration (Community Charity) Guidelines 2025 open a deductible-gift path for community foundations, which grant from earnings while principal stays. That rhyme is useful. DGR status is not a licence to run a payment unit.",
    "VERIFY: public-support and deductible-gift statements. Who checks: a solicitor and a registered tax agent.",
    "",
    "7. Where the other Woods rooms sit",
    "Concentric Circles plans who is in the ring. ARC is a tax-literacy interview, not a lodgment. Friends SMF is voluntary administration for a small society. Structure Lab is the twelve-room notebook for family, land and purpose. None of them is the reserve.",
    "",
    "8. Check before anyone relies on this",
    "Australia only. General information, not tax, legal or financial advice. Translations are editorial, not certified. Confirm the reserve rule, the association or charity form, and any gift deduction with a solicitor and a registered tax agent. Figures on the bench belong to the named source.",
  );

  return lines.join("\n");
}
