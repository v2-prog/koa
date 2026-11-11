import { createFileRoute } from "@tanstack/react-router";
import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { AttachedCaptures, AttachedCount } from "@/components/attached";
import { SimplifyNote } from "@/components/explain";
import { Card, Chip, ConfirmClear, CopyQuiet, Field, GeneralInfo, Heading, INPUT, Primary, Problem, Quiet, Screen, Verify } from "@/components/ui";
import { attachValue } from "@/lib/captures";
import { formatDate, todayISO } from "@/lib/dates";
import { makeId } from "@/lib/ids";
import { PROPOSAL_VIEW_LABEL, proposalView, type Ledger } from "@/lib/ledger-core";
import {
  emptyDraft,
  MAX_ITEMS,
  MAX_LINE,
  MAX_MEETING,
  minutesProblem,
  minutesText,
  QUORUM_LABEL,
  QUORUM_VERIFY,
  tidyDraft,
  type Minutes,
  type MinutesDraft,
  type Quorum,
} from "@/lib/minutes";
import { useLedger, useMinutes } from "@/lib/stores";
import { useScrollTopOn } from "@/lib/use-scroll-top";

type Search = { proposal?: string; edit?: string };

export const Route = createFileRoute("/minutes")({
  validateSearch: (search: Record<string, unknown>): Search => ({
    ...(typeof search.proposal === "string" ? { proposal: search.proposal } : {}),
    ...(typeof search.edit === "string" ? { edit: search.edit } : {}),
  }),
  component: MinutesPage,
});

function linked(ledger: Ledger, id: string) {
  const proposal = ledger.proposals.find((item) => item.id === id);
  if (!proposal) return null;
  return { title: proposal.title, ask: proposal.ask, result: PROPOSAL_VIEW_LABEL[proposalView(proposal, todayISO())], receiptRef: proposal.receiptRef };
}

function Editor({ start, onDone }: { start: Minutes | null; onDone: () => void }) {
  const search = Route.useSearch();
  const { ledger } = useLedger();
  const { minutes, setMinutes } = useMinutes();
  const [draft, setDraft] = useState<MinutesDraft>(() => {
    if (start) return { ...start };
    const fresh = emptyDraft(todayISO());
    const proposal = ledger.proposals.find((item) => item.id === search.proposal);
    return proposal
      ? { ...fresh, proposalId: proposal.id, items: [{ id: makeId("itm"), topic: `Ask: ${proposal.title}, ${proposal.ask} Q from reserve interest`, outcome: "" }] }
      : { ...fresh, items: [{ id: makeId("itm"), topic: "", outcome: "" }] };
  });
  const [problem, setProblem] = useState<string | null>(null);

  const set = (change: Partial<MinutesDraft>) => {
    setDraft({ ...draft, ...change });
    setProblem(null);
  };

  function save() {
    const reason = minutesProblem(draft);
    if (reason) {
      setProblem(reason);
      return;
    }
    const tidy = tidyDraft(draft);
    const record: Minutes = start ? { ...start, ...tidy } : { ...tidy, id: makeId("min"), savedOn: todayISO() };
    const next = start ? minutes.map((item) => (item.id === start.id ? record : item)) : [record, ...minutes];
    const wrote = setMinutes(next);
    if (!wrote.ok) {
      setProblem(wrote.reason);
      return;
    }
    onDone();
  }

  const text = (key: "meeting" | "present" | "apologies" | "next", label: string, hint?: string, rows = 0) => (
    <Field label={label} hint={hint} htmlFor={`min-${key}`}>
      {rows ? (
        <textarea id={`min-${key}`} rows={rows} value={draft[key]} maxLength={MAX_LINE} onChange={(event) => set({ [key]: event.target.value })} className={INPUT} />
      ) : (
        <input id={`min-${key}`} value={draft[key]} maxLength={key === "meeting" ? MAX_MEETING : MAX_LINE} onChange={(event) => set({ [key]: event.target.value })} className={INPUT} />
      )}
    </Field>
  );

  return (
    <>
      {text("meeting", "Meeting", "Such as Shed committee, November.")}
      <Field label="Date" htmlFor="min-date">
        <input id="min-date" type="date" value={draft.date} onChange={(event) => set({ date: event.target.value })} className={INPUT} />
      </Field>
      {text("present", "Present", "First names or roles.", 2)}
      {text("apologies", "Apologies", "Who said they could not come.", 2)}
      <fieldset className="mt-5">
        <legend className="text-base font-semibold text-ink">Quorum</legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {(["yes", "no"] as Quorum[]).map((item) => (
            <Chip key={item} on={draft.quorum === item} onClick={() => set({ quorum: draft.quorum === item ? "" : item })}>
              {QUORUM_LABEL[item]}
            </Chip>
          ))}
        </div>
        <Verify who={QUORUM_VERIFY.who}>{QUORUM_VERIFY.what}</Verify>
      </fieldset>

      <Heading className="mt-8">What was asked, and what passed</Heading>
      <ol className="mt-3 grid gap-3">
        {draft.items.map((item, index) => (
          <li key={item.id} className="rounded-card border border-line bg-card p-4">
            <label className="block text-base font-semibold text-ink" htmlFor={`topic-${item.id}`}>
              Item {index + 1}: what was asked
            </label>
            <input
              id={`topic-${item.id}`}
              value={item.topic}
              maxLength={MAX_LINE}
              onChange={(event) => set({ items: draft.items.map((entry) => (entry.id === item.id ? { ...entry, topic: event.target.value } : entry)) })}
              className={INPUT}
            />
            <label className="mt-3 block text-base font-semibold text-ink" htmlFor={`outcome-${item.id}`}>
              What the meeting decided
            </label>
            <input
              id={`outcome-${item.id}`}
              value={item.outcome}
              maxLength={MAX_LINE}
              onChange={(event) => set({ items: draft.items.map((entry) => (entry.id === item.id ? { ...entry, outcome: event.target.value } : entry)) })}
              className={INPUT}
            />
            <Quiet className="mt-3" onClick={() => set({ items: draft.items.filter((entry) => entry.id !== item.id) })}>
              <Trash2 className="size-5" aria-hidden="true" />
              Remove this item
            </Quiet>
          </li>
        ))}
      </ol>
      {draft.items.length < MAX_ITEMS && (
        <Quiet className="mt-3" onClick={() => set({ items: [...draft.items, { id: makeId("itm"), topic: "", outcome: "" }] })}>
          <Plus className="size-5" aria-hidden="true" />
          Add an item
        </Quiet>
      )}

      <Field label="A proposal decided at this meeting" hint="Optional. The minutes will name its result and receipt." htmlFor="min-proposal">
        <select id="min-proposal" value={draft.proposalId} onChange={(event) => set({ proposalId: event.target.value })} className={INPUT}>
          <option value="">None</option>
          {ledger.proposals.map((proposal) => (
            <option key={proposal.id} value={proposal.id}>
              {proposal.title}
            </option>
          ))}
        </select>
      </Field>
      {text("next", "Next", "The next meeting, or who does what by when.", 2)}
      <SimplifyNote text={draft.next} onUse={(short) => set({ next: short })} />

      <Problem>{problem}</Problem>
      <Primary className="mt-6" onClick={save}>
        Save the minutes
      </Primary>
      <Quiet className="mt-3 w-full" onClick={onDone}>
        Cancel
      </Quiet>
    </>
  );
}

function MinutesPage() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const { ledger } = useLedger();
  const { minutes, setMinutes } = useMinutes();
  const [open, setOpen] = useState<string | null>(null);
  const editing = search.edit === "new" ? null : minutes.find((item) => item.id === search.edit);
  const inEditor = search.edit === "new" || !!editing || !!search.proposal;
  useScrollTopOn(inEditor);

  if (inEditor) {
    return (
      <Screen side="community" kicker="Meeting minutes" title={editing ? "Edit the minutes" : "New minutes"}>
        <Editor start={editing ?? null} onDone={() => navigate({ search: {} })} />
        <GeneralInfo>Minutes are a record of what a group decided. The group's own rules say what makes a decision valid.</GeneralInfo>
      </Screen>
    );
  }

  const sorted = [...minutes].sort((a, b) => b.date.localeCompare(a.date));
  return (
    <Screen
      side="community"
      kicker="Meeting minutes"
      title="Who was there, and what passed"
      intro="Kept on this device. Copy a set of minutes to share it with the group."
    >
      <Primary className="mt-5" onClick={() => navigate({ search: { edit: "new" } })}>
        Write new minutes
      </Primary>

      <Heading>On this device</Heading>
      {sorted.length === 0 ? (
        <p className="mt-3 text-base text-muted">No minutes yet. A set of minutes takes a few minutes to write after a meeting.</p>
      ) : (
        <ul className="mt-3 grid gap-3">
          {sorted.map((item) => {
            const text = minutesText(item, linked(ledger, item.proposalId));
            return (
              <li key={item.id}>
                <Card className="border-l-8 border-l-river">
                  <button type="button" className="w-full text-left" aria-expanded={open === item.id} onClick={() => setOpen(open === item.id ? null : item.id)}>
                    <span className="block text-lg font-semibold text-ink">{item.meeting}</span>
                    <span className="block text-base text-muted">
                      {formatDate(item.date)}, {QUORUM_LABEL[item.quorum].toLowerCase()}, {item.items.length} {item.items.length === 1 ? "item" : "items"}
                    </span>
                  </button>
                  <AttachedCount target={attachValue("minutes", item.id)} />
                  {open === item.id && (
                    <>
                      <NoteExportQuiet text={text} />
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Quiet onClick={() => navigate({ search: { edit: item.id } })}>Edit</Quiet>
                        <CopyQuiet text={text} label="Copy the minutes" />
                      </div>
                      <AttachedCaptures target={attachValue("minutes", item.id)} action="Attach the agenda or a paper" />
                      <ConfirmClear
                        className="mt-4"
                        ask="Remove these minutes"
                        body="This removes these minutes from this device. Attached captures stay in their folders."
                        confirm="Remove the minutes"
                        onConfirm={() => setMinutes(minutes.filter((entry) => entry.id !== item.id))}
                      />
                    </>
                  )}
                </Card>
              </li>
            );
          })}
        </ul>
      )}
      <GeneralInfo />
    </Screen>
  );
}

/** The minutes as text, without a second green button on the list screen. */
function NoteExportQuiet({ text }: { text: string }) {
  return (
    <pre tabIndex={0} className="mt-3 max-h-96 overflow-auto rounded-2xl border border-line bg-paper p-4 font-sans text-base leading-relaxed whitespace-pre-wrap text-ink">
      {text}
    </pre>
  );
}

