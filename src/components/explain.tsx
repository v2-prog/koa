import { Lightbulb, WandSparkles } from "lucide-react";
import { useId, useState, type ReactNode } from "react";
import { CopyQuiet, Quiet } from "@/components/ui";
import { termsIn } from "@/data/glossary";
import { simplifyNote, type Simplified } from "@/lib/ai/simplify";

/**
 * "Explain this". Opens an everyday-language explanation that ships with the
 * app. It is text a person wrote into koa's source, shown on request. Nothing
 * is looked up and nothing is generated.
 */
export function ExplainThis({
  children,
  label = "Explain this",
  className = "mt-3",
}: {
  children: ReactNode;
  label?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const id = useId();
  return (
    <div className={className}>
      <Quiet aria-expanded={open} aria-controls={id} onClick={() => setOpen(!open)}>
        <Lightbulb className="size-5" aria-hidden="true" />
        {open ? "Hide the explanation" : label}
      </Quiet>
      {open && (
        <div id={id} className="mt-3 rounded-2xl bg-paper-deep px-4 py-3 text-base leading-relaxed text-ink">
          {children}
          <p className="mt-2 text-sm text-muted">In everyday words, from the app itself. General information only.</p>
        </div>
      )}
    </div>
  );
}

/** The jargon in some text, each with an everyday meaning from the glossary. */
export function TermList({ text }: { text: string }) {
  const terms = termsIn(text);
  if (terms.length === 0) return null;
  return (
    <dl className="mt-3 grid gap-2">
      {terms.map((item) => (
        <div key={item.term}>
          <dt className="font-semibold text-ink">{item.term}</dt>
          <dd className="text-base leading-relaxed text-ink">{item.plain}</dd>
        </div>
      ))}
    </dl>
  );
}

/**
 * "Simplify this note". Works only on the text handed to it, which is already
 * on this device, and shows a short version with any jargon explained. The
 * person decides whether to use it. The original is never changed for them.
 */
export function SimplifyNote({
  text,
  onUse,
  className = "mt-3",
}: {
  text: string;
  /** Called when the person chooses to replace their note with the short version. */
  onUse?: (short: string) => void;
  className?: string;
}) {
  const [result, setResult] = useState<Simplified | null>(null);
  const id = useId();
  const empty = text.trim().length === 0;

  return (
    <div className={className}>
      <Quiet
        disabled={empty}
        aria-expanded={result !== null}
        aria-controls={id}
        onClick={() => setResult(result ? null : simplifyNote(text))}
      >
        <WandSparkles className="size-5" aria-hidden="true" />
        {result ? "Hide the short version" : "Simplify this note"}
      </Quiet>
      {result && (
        <div id={id} className="mt-3 rounded-2xl bg-paper-deep px-4 py-3 text-base leading-relaxed text-ink">
          <p className="font-semibold">
            {result.alreadyShort
              ? "This note is already short. Here it is in plainer words."
              : `Short version: ${result.kept} of ${result.total} sentences, ${result.wordsAfter} of ${result.wordsBefore} words.`}
          </p>
          <p className="mt-2 whitespace-pre-wrap">{result.short}</p>
          {result.terms.length > 0 && (
            <>
              <p className="mt-4 font-semibold">Words explained</p>
              <TermList text={text} />
            </>
          )}
          <div className="mt-4 flex flex-wrap gap-2">
            {onUse && result.short !== text.trim() && (
              <Quiet
                onClick={() => {
                  onUse(result.short);
                  setResult(null);
                }}
              >
                Use the short version
              </Quiet>
            )}
            <CopyQuiet text={result.short} label="Copy the short version" />
          </div>
          <p className="mt-3 text-sm text-muted">
            Worked out on this device from your own words. The sentences are yours, picked and tidied, not written
            for you. Nothing was sent anywhere. Read it against the original before you rely on it.
          </p>
        </div>
      )}
    </div>
  );
}
