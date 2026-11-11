import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { AttachedCaptures, AttachedCount } from "@/components/attached";
import { ExplainThis } from "@/components/explain";
import { Card, Chip, CopyQuiet, Field, GeneralInfo, Heading, INPUT, Primary, Problem, Quiet, QUIET_LINK, ReceiptCard, Screen, Verify, Warn } from "@/components/ui";
import { ENTRIES } from "@/data/bench";
import { attachValue } from "@/lib/captures";
import { addDays, formatDate, todayISO } from "@/lib/dates";
import { MAX_PURPOSE, MAX_TITLE, PROPOSAL_VIEW_LABEL, proposalView, type Proposal, type Receipt } from "@/lib/ledger-core";
import { useLedger } from "@/lib/stores";
import { buildSupportDoc } from "@/lib/support-doc";
import { useScrollTopOn } from "@/lib/use-scroll-top";

type Search = { view?: "new" };

export const Route = createFileRoute("/fund")({
  validateSearch: (search: Record<string, unknown>): Search => (search.view === "new" ? { view: "new" } : {}),
  component: Fund,
});

function ProposalCard({ proposal }: { proposal: Proposal }) {
  const { ledger, support, decide } = useLedger();
  const [showNote, setShowNote] = useState(false);
  const [deciding, setDeciding] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const view = proposalView(proposal, todayISO());
  const passedReceipt = receipt ?? ledger.receipts.find((item) => item.ref === proposal.receiptRef) ?? null;

  return (
    <Card className="border-l-8 border-l-river">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className={`rounded-full px-2.5 py-1 text-sm font-semibold ${view === "open" ? "bg-river text-paper" : "border border-ink text-ink"}`}>
          {PROPOSAL_VIEW_LABEL[view]}
        </span>
        <AttachedCount target={attachValue("proposal", proposal.id)} />
      </div>
      <h3 className="mt-2 text-xl font-semibold text-ink">
        {proposal.title}
        {proposal.sample ? " (sample)" : ""}
      </h3>
      <p className="mt-1 font-display text-3xl font-medium text-ink">{proposal.ask.toLocaleString("en-AU")} Q</p>
      <p className="text-base text-muted">
        Asked from reserve interest. Closes {formatDate(proposal.closes)}.
      </p>
      <p className="mt-2 text-base leading-relaxed text-ink">{proposal.purpose}</p>

      {proposal.status === "open" && (
        <div className="mt-4 flex flex-wrap gap-2">
          <Chip on={proposal.supported} onClick={() => support(proposal.id)}>
            {proposal.supported ? "Support marked on this device" : "Mark my support"}
          </Chip>
          <Quiet onClick={() => setDeciding(!deciding)} aria-expanded={deciding}>
            Record the meeting's result
          </Quiet>
        </div>
      )}
      {proposal.status === "open" && (
        <p className="mt-2 text-base text-muted">A support mark stays on this device. It buys nothing and is not a vote count.</p>
      )}
      {deciding && proposal.status === "open" && (
        <Warn className="mt-3">
          <p>Record what the meeting decided. A passed ask takes {proposal.ask} Q from reserve interest and writes a receipt. This cannot be undone.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Quiet
              onClick={() => {
                const result = decide(proposal.id, true);
                if (!result.ok) setProblem(result.reason);
                else {
                  setReceipt(result.receipt);
                  setDeciding(false);
                }
              }}
            >
              It passed
            </Quiet>
            <Quiet
              onClick={() => {
                const result = decide(proposal.id, false);
                if (!result.ok) setProblem(result.reason);
                else setDeciding(false);
              }}
            >
              It did not pass
            </Quiet>
          </div>
        </Warn>
      )}
      <Problem>{problem}</Problem>
      {proposal.status === "passed" && passedReceipt && (
        <div className="mt-4">
          <ReceiptCard receipt={passedReceipt} heading="Receipt for the passed ask" />
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        <Quiet onClick={() => setShowNote(!showNote)} aria-expanded={showNote}>
          {showNote ? "Hide the support note" : "Read the support note"}
        </Quiet>
        <Link to="/minutes" search={{ proposal: proposal.id }} className={QUIET_LINK}>
          Minutes for this
        </Link>
      </div>
      {showNote && (
        <div className="mt-3">
          <pre className="max-h-96 overflow-auto rounded-2xl border border-line bg-paper p-4 font-sans text-base leading-relaxed whitespace-pre-wrap text-ink">
            {proposal.document}
          </pre>
          <div className="mt-2">
            <CopyQuiet text={proposal.document} label="Copy the support note" />
          </div>
        </div>
      )}
      <AttachedCaptures target={attachValue("proposal", proposal.id)} action="Attach a quote or invoice" />
    </Card>
  );
}

function NewProposal({ onDone }: { onDone: () => void }) {
  const { ledger, propose } = useLedger();
  const [title, setTitle] = useState("");
  const [ask, setAsk] = useState("");
  const [purpose, setPurpose] = useState("");
  const [closes, setCloses] = useState(addDays(todayISO(), 21));
  const [models, setModels] = useState<string[]>(["hum"]);
  const [problem, setProblem] = useState<string | null>(null);

  function save() {
    const input = { title, ask: Number(ask), purpose, closes, modelIds: models };
    const result = propose({ ...input, document: buildSupportDoc({ ...input, reserveInterest: ledger.reserveInterest }) });
    if (!result.ok) {
      setProblem(result.reason);
      return;
    }
    onDone();
  }

  return (
    <>
      <p className="mt-4 text-lg leading-relaxed text-muted">
        There are {ledger.reserveInterest.toLocaleString("en-AU")} Q of reserve interest. The principal is never
        available, so an ask cannot be larger than that.
      </p>
      <Field label="Title" htmlFor="pro-title">
        <input id="pro-title" value={title} maxLength={MAX_TITLE} onChange={(event) => setTitle(event.target.value)} className={INPUT} />
      </Field>
      <Field label="Ask, in units" hint="Whole units, from reserve interest only." htmlFor="pro-ask">
        <input id="pro-ask" inputMode="numeric" value={ask} onChange={(event) => setAsk(event.target.value.replace(/\D/g, "").slice(0, 5))} className={INPUT} />
      </Field>
      <Field label="What everyone should see" hint="The one copy the whole room reads. No private version." htmlFor="pro-purpose">
        <textarea id="pro-purpose" rows={4} value={purpose} maxLength={MAX_PURPOSE} onChange={(event) => setPurpose(event.target.value)} className={INPUT} />
      </Field>
      <Field label="Close date" htmlFor="pro-closes">
        <input id="pro-closes" type="date" value={closes} min={todayISO()} onChange={(event) => setCloses(event.target.value)} className={INPUT} />
      </Field>
      <fieldset className="mt-5">
        <legend className="text-base font-semibold text-ink">Practice to cite from the bench</legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {ENTRIES.map((entry) => (
            <Chip
              key={entry.id}
              on={models.includes(entry.id)}
              onClick={() => setModels(models.includes(entry.id) ? models.filter((id) => id !== entry.id) : [...models, entry.id])}
            >
              {entry.name}
            </Chip>
          ))}
        </div>
      </fieldset>
      <Problem>{problem}</Problem>
      <Primary className="mt-6" onClick={save}>
        Save the proposal
      </Primary>
      <Quiet className="mt-3 w-full" onClick={onDone}>
        Cancel
      </Quiet>
    </>
  );
}

function Fund() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const { ledger } = useLedger();
  const adding = search.view === "new";
  useScrollTopOn(adding);
  const open = ledger.proposals.filter((item) => item.status === "open");
  const decided = ledger.proposals.filter((item) => item.status !== "open");

  if (adding) {
    return (
      <Screen side="community" kicker="Community proposals" title="A new ask from reserve interest">
        <NewProposal onDone={() => navigate({ search: {} })} />
        <GeneralInfo>A support note is general information. A solicitor and a registered tax agent check the group's own rules.</GeneralInfo>
      </Screen>
    );
  }

  return (
    <Screen
      side="community"
      kicker="Community proposals"
      title="Asks from reserve interest"
      intro="A proposal can only ask for interest earned on the reserve. A passed ask gets a receipt like any spend or gift."
    >
      <div className="mt-5 rounded-card border border-river bg-river-soft p-5">
        <p className="text-base font-semibold text-river">Reserve interest available</p>
        <p className="mt-1 font-display text-5xl font-medium text-ink">{ledger.reserveInterest.toLocaleString("en-AU")} Q</p>
        <p className="mt-2 text-base leading-relaxed text-ink">The principal is never available. Holders earn no yield.</p>
      </div>
      <ExplainThis>
        Picture a jar of savings that belongs to the group. The jar itself is never opened. Only the interest it
        earns can be spent, and only when the group agrees. A proposal is someone asking the group for some of that
        interest, in writing, with a close date.
      </ExplainThis>
      <Primary className="mt-5" onClick={() => navigate({ search: { view: "new" } })}>
        Make a proposal
      </Primary>

      <Heading>Open</Heading>
      {open.length === 0 ? (
        <p className="mt-3 text-base text-muted">No open asks on this device.</p>
      ) : (
        <ul className="mt-3 grid gap-3">
          {open.map((proposal) => (
            <li key={proposal.id}>
              <ProposalCard proposal={proposal} />
            </li>
          ))}
        </ul>
      )}

      {decided.length > 0 && (
        <>
          <Heading>Decided</Heading>
          <ul className="mt-3 grid gap-3">
            {decided.map((proposal) => (
              <li key={proposal.id}>
                <ProposalCard proposal={proposal} />
              </li>
            ))}
          </ul>
        </>
      )}

      <Verify who="the group's secretary, a solicitor and a registered tax agent" className="mt-8">
        Whether a group can hold a reserve and allocate its interest depends on its own rules and legal form.
      </Verify>
      <GeneralInfo>Not a share offer, not an investment and not a bank. A demo on this device.</GeneralInfo>
    </Screen>
  );
}
