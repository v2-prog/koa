import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AttachedCaptures, AttachedCount } from "@/components/attached";
import { ExplainThis, SimplifyNote } from "@/components/explain";
import { OutLink } from "@/components/out-link";
import { Card, Chip, ConfirmClear, GeneralInfo, Heading, INPUT, NoteExport, Primary, Problem, Screen, Verify, Warn } from "@/components/ui";
import { attachValue, titlesByTarget } from "@/lib/captures";
import { formatDate, todayISO } from "@/lib/dates";
import { looksLikeTfn, TFN_REFUSAL } from "@/lib/guards";
import { useLibrary, useTax } from "@/lib/stores";
import {
  buildTaxNote,
  changesForFlag,
  flagProblem,
  LAW_CHANGES,
  markedCount,
  MAX_NIGHTS,
  MAX_WORDS,
  OUTCOME_LABEL,
  SOURCES_CHECKED,
  STAGE_LABEL,
  stageBadge,
  TAX_FLAGS,
  type FlagState,
  type Outcome,
  type TaxFlag,
} from "@/lib/tax";

export const Route = createFileRoute("/tax")({ component: TaxPage });

const OUTCOMES: Outcome[] = ["ato", "agent", "na"];

function FlagCard({ flag, index }: { flag: TaxFlag; index: number }) {
  const { tax, setTax } = useTax();
  const saved = tax.flags[flag.id] ?? {};
  const [words, setWords] = useState(saved.words ?? "");
  const [problem, setProblem] = useState<string | null>(null);

  function save(change: Partial<FlagState>) {
    const next: FlagState = { ...saved, ...change };
    const reason = flagProblem(next);
    if (reason) {
      setProblem(reason);
      return;
    }
    const wrote = setTax({ ...tax, flags: { ...tax.flags, [flag.id]: next } });
    setProblem(wrote.ok ? null : wrote.reason);
  }

  function nights(key: "nightsLet" | "nightsPrivate", value: string) {
    const digits = value.replace(/\D/g, "").slice(0, 3);
    save({ [key]: digits === "" ? undefined : Math.min(MAX_NIGHTS, Number(digits)) });
  }

  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-lg font-semibold text-ink">
          <span className="text-muted">{index + 1}. </span>
          {flag.title}
        </h3>
        <AttachedCount target={attachValue("tax", flag.id)} />
      </div>
      <p className="mt-1 text-lg leading-relaxed text-ink">{flag.question}</p>
      <p className="mt-2 text-base leading-relaxed text-muted">{flag.rule}</p>
      <ul className="mt-2 grid list-disc gap-1 pl-6 text-base leading-relaxed text-ink">
        {flag.notice.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
      <ExplainThis>{flag.explain}</ExplainThis>

      {flag.input === "words" && (
        <div className="mt-4">
          <label className="block text-base font-semibold text-ink" htmlFor={`words-${flag.id}`}>
            In your own words
          </label>
          <p className="text-base leading-relaxed text-muted">{flag.inputHint}</p>
          <textarea
            id={`words-${flag.id}`}
            rows={3}
            value={words}
            maxLength={MAX_WORDS}
            onChange={(event) => {
              setWords(event.target.value);
              setProblem(looksLikeTfn(event.target.value) ? TFN_REFUSAL : null);
            }}
            onBlur={() => save({ words: words.trim() || undefined })}
            className={INPUT}
          />
          <SimplifyNote
            text={words}
            onUse={(short) => {
              setWords(short);
              save({ words: short });
            }}
          />
        </div>
      )}
      {flag.input === "nights" && (
        <div className="mt-4 grid grid-cols-2 gap-3">
          {(
            [
              ["nightsLet", "Nights let to guests"],
              ["nightsPrivate", "Nights used privately"],
            ] as const
          ).map(([key, label]) => (
            <div key={key}>
              <label className="block text-base font-semibold text-ink" htmlFor={`${key}-${flag.id}`}>
                {label}
              </label>
              <input
                id={`${key}-${flag.id}`}
                inputMode="numeric"
                value={saved[key] ?? ""}
                onChange={(event) => nights(key, event.target.value)}
                className={INPUT}
              />
            </div>
          ))}
          <p className="col-span-2 text-base leading-relaxed text-muted">{flag.inputHint}</p>
        </div>
      )}
      <Problem>{problem}</Problem>

      <fieldset className="mt-4">
        <legend className="text-base font-semibold text-ink">Where this question goes</legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {OUTCOMES.map((outcome) => (
            <Chip
              key={outcome}
              on={saved.outcome === outcome}
              onClick={() => save({ outcome: saved.outcome === outcome ? undefined : outcome })}
            >
              {OUTCOME_LABEL[outcome]}
            </Chip>
          ))}
        </div>
      </fieldset>
      <p className="mt-3">
        <OutLink href={flag.ato.url}>{flag.ato.label}</OutLink>
      </p>
      <Verify who={flag.verify.who}>{flag.verify.what}</Verify>
      {changesForFlag(flag.id).map((change) => (
        <p key={change.id} className="mt-3 text-base leading-relaxed text-ink">
          <span className="mr-2 inline-block rounded-full border border-ink px-2 py-0.5 text-sm font-bold">{stageBadge(change.stage)}</span>
          {change.title}. See the list of changes below.
        </p>
      ))}
      <AttachedCaptures target={attachValue("tax", flag.id)} action="Attach a receipt or paper" />
    </Card>
  );
}

function TaxPage() {
  const { tax, setTax, clear } = useTax();
  const { captures } = useLibrary();
  const [exporting, setExporting] = useState(false);
  const note = buildTaxNote(tax, titlesByTarget(captures, "tax"), todayISO());

  return (
    <Screen
      side="personal"
      kicker="Tax questions"
      title="Five questions to carry to someone who can answer them"
      intro="Each flag ends at the ATO's own page, a registered tax agent, or not applicable. koa works nothing out and lodges nothing."
    >
      <Warn className="mt-5">
        koa never asks for a tax file number and refuses to save text that looks like one. Keep it for the ATO,
        your employer and your tax agent.
      </Warn>
      <p className="mt-4 text-base text-muted">
        {markedCount(tax)} of {TAX_FLAGS.length} flags marked.
      </p>

      <ol className="mt-4 grid gap-3">
        {TAX_FLAGS.map((flag, index) => (
          <li key={flag.id}>
            <FlagCard flag={flag} index={index} />
          </li>
        ))}
      </ol>

      <Heading>Changes in the law</Heading>
      <p className="mt-2 text-base leading-relaxed text-muted">
        Read from the ATO on {formatDate(SOURCES_CHECKED)}. An announcement is not law, and a law that has not
        started does not change today's rules.
      </p>
      <ul className="mt-4 grid gap-3">
        {LAW_CHANGES.map((change) => (
          <li key={change.id}>
            <Card>
              <p>
                <span className="inline-block rounded-full border border-ink px-2.5 py-0.5 text-sm font-bold text-ink">
                  {stageBadge(change.stage)}
                </span>
              </p>
              <h3 className="mt-2 text-lg font-semibold text-ink">{change.title}</h3>
              <p className="mt-1 text-base leading-relaxed text-ink">{change.summary}</p>
              <p className="mt-1 text-base text-muted">
                {STAGE_LABEL[change.stage]}
                {change.starts ? ` Start date given: ${formatDate(change.starts)}.` : ""}
              </p>
              <p className="mt-2">
                <OutLink href={change.source.url}>{change.source.label}</OutLink>
              </p>
              <Verify who={change.verifyWho}>Whether and how this touches your own situation.</Verify>
            </Card>
          </li>
        ))}
      </ul>

      <Heading>Take the questions to an agent</Heading>
      {exporting ? (
        <NoteExport
          text={note}
          filename={`tax-questions-draft-${tax.drafts + 1}.txt`}
          onCopied={() => setTax({ ...tax, drafts: tax.drafts + 1 })}
        />
      ) : (
        <Primary className="mt-3" onClick={() => setExporting(true)}>
          Show the questions as a note
        </Primary>
      )}

      <ConfirmClear
        ask="Clear the tax questions"
        body="This removes the marks, words and night counts from this device. Captures stay in their folders."
        confirm="Clear the questions"
        onConfirm={() => {
          clear();
          setExporting(false);
        }}
      />
      <GeneralInfo>Tax law changes. Check the ATO's page or a registered tax agent before you rely on anything.</GeneralInfo>
    </Screen>
  );
}
