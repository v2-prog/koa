import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AttachedCaptures, AttachedCount } from "@/components/attached";
import { ExplainThis, SimplifyNote } from "@/components/explain";
import { Card, Chip, ConfirmClear, Field, GeneralInfo, Heading, INPUT, NoteExport, Primary, Problem, Screen, Verify, Warn } from "@/components/ui";
import {
  ASSET_LOCK_STATEMENT,
  BEQUEST_DOCS,
  bequestProblem,
  buildBequestNote,
  DOC_STATE_LABEL,
  markedDocs,
  MAX_FOCUS,
  MAX_NOTES,
  SOLICITOR_STILL_DOES,
  type DocState,
} from "@/lib/bequest";
import { attachValue, titlesByTarget } from "@/lib/captures";
import { todayISO } from "@/lib/dates";
import { useBequest, useLibrary } from "@/lib/stores";

export const Route = createFileRoute("/bequest")({ component: BequestPage });

const STATES: DocState[] = ["have", "missing", "unsure"];

function BequestPage() {
  const { bequest, setBequest, clear } = useBequest();
  const { captures } = useLibrary();
  const [focus, setFocus] = useState(bequest.focus);
  const [notes, setNotes] = useState(bequest.notes);
  const [problem, setProblem] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  function saveWords(next: { focus: string; notes: string }) {
    const reason = bequestProblem(next);
    if (reason) {
      setProblem(reason);
      return false;
    }
    const wrote = setBequest({ ...bequest, ...next });
    setProblem(wrote.ok ? null : wrote.reason);
    return wrote.ok;
  }

  function mark(id: (typeof BEQUEST_DOCS)[number]["id"], state: DocState) {
    const docs = { ...bequest.docs };
    if (docs[id] === state) delete docs[id];
    else docs[id] = state;
    setBequest({ ...bequest, docs });
  }

  const note = buildBequestNote({ ...bequest, focus, notes }, titlesByTarget(captures, "bequest"), todayISO());

  return (
    <Screen
      side="personal"
      kicker="Bequest support pack"
      title="The documents beside a will"
      intro="Material for a conversation with the family and a solicitor. It is not a will and not a binding nomination, and nothing here is lodged."
    >
      <Warn className="mt-5">
        Super does not automatically pass under a will, and nor does a trust or a jointly held home. That is why
        the documents beside the will matter.
      </Warn>

      <Field label="Focus person" hint="A first name or a role, such as Nan." htmlFor="bequest-focus">
        <input
          id="bequest-focus"
          value={focus}
          maxLength={MAX_FOCUS}
          autoComplete="off"
          onChange={(event) => setFocus(event.target.value)}
          onBlur={() => saveWords({ focus, notes })}
          className={INPUT}
        />
      </Field>
      <Field
        label="What they want noted"
        hint="Wishes in their own words. Leave out account numbers, passwords and amounts."
        htmlFor="bequest-notes"
      >
        <textarea
          id="bequest-notes"
          rows={5}
          value={notes}
          maxLength={MAX_NOTES}
          onChange={(event) => setNotes(event.target.value)}
          onBlur={() => saveWords({ focus, notes })}
          className={INPUT}
        />
      </Field>
      <SimplifyNote
        text={notes}
        onUse={(short) => {
          setNotes(short);
          saveWords({ focus, notes: short });
        }}
      />
      <Problem>{problem}</Problem>
      <p className="mt-2 text-base text-muted">Saved on this device when you leave each box.</p>

      <Heading>Ten documents</Heading>
      <p className="mt-2 text-base leading-relaxed text-muted">
        {markedDocs(bequest)} of 10 marked. Mark each one, and attach a photo of its cover page if that helps the
        family find it. Never photograph a page that shows an account or member number.
      </p>
      <ol className="mt-4 grid gap-3">
        {BEQUEST_DOCS.map((doc, index) => {
          const state = bequest.docs[doc.id];
          return (
            <li key={doc.id}>
              <Card>
                <div className="flex items-start justify-between gap-3">
                  <h3 className="text-lg font-semibold text-ink">
                    <span className="text-muted">{index + 1}. </span>
                    {doc.name}
                  </h3>
                  <AttachedCount target={attachValue("bequest", doc.id)} />
                </div>
                <p className="mt-1 text-base leading-relaxed text-ink">{doc.purpose}</p>
                {doc.verify && <Verify who={doc.verify.who}>{doc.verify.what}</Verify>}
                <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label={`Does the ${doc.name.toLowerCase()} exist`}>
                  {STATES.map((item) => (
                    <Chip key={item} on={state === item} onClick={() => mark(doc.id, item)}>
                      {DOC_STATE_LABEL[item]}
                    </Chip>
                  ))}
                </div>
                <AttachedCaptures target={attachValue("bequest", doc.id)} action="Attach a capture" />
              </Card>
            </li>
          );
        })}
      </ol>

      <Heading>What a solicitor still has to do</Heading>
      <ul className="mt-3 grid list-disc gap-1.5 pl-6 text-base leading-relaxed text-ink">
        {SOLICITOR_STILL_DOES.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
      <p className="mt-4 text-base leading-relaxed text-ink">{ASSET_LOCK_STATEMENT}</p>
      <ExplainThis>
        A family trust can be steered by the family over time. A charity or a community land trust cannot: once
        something is given to it, it belongs to the purpose for good. Both can be part of a plan, but they do
        different jobs, so one cannot stand in for the other.
      </ExplainThis>

      <Heading>Take the pack to the conversation</Heading>
      {exporting ? (
        <NoteExport
          text={note}
          filename={`bequest-support-pack-draft-${bequest.drafts + 1}.txt`}
          onCopied={() => setBequest({ ...bequest, focus, notes, drafts: bequest.drafts + 1 })}
        />
      ) : (
        <Primary className="mt-3" onClick={() => saveWords({ focus, notes }) && setExporting(true)}>
          Show the pack as a note
        </Primary>
      )}

      <ConfirmClear
        ask="Clear the bequest pack"
        body="This removes the focus person, the notes and the marks from this device. Captures stay in their folders."
        confirm="Clear the pack"
        onConfirm={() => {
          clear();
          setFocus("");
          setNotes("");
          setExporting(false);
        }}
      />
      <GeneralInfo>Every state and territory has its own rules for these documents.</GeneralInfo>
    </Screen>
  );
}
