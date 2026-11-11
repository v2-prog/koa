import { Link } from "@tanstack/react-router";
import { ShieldCheck, User, Users } from "lucide-react";
import { useEffect, useState, type ButtonHTMLAttributes, type ReactNode } from "react";
import { Shell } from "@/components/shell";
import { SIDE_LABEL, type Side } from "@/lib/captures";
import { formatDate } from "@/lib/dates";
import { receiptLabel, type Receipt } from "@/lib/ledger-core";

export type ScreenSide = Side | "both";

/**
 * The one green thing on a screen. This line is the only place the leaf
 * colour is used in the whole app, and the rules check keeps it that way.
 */
const PRIMARY_CLASS = "flex min-h-14 w-full items-center justify-center rounded-2xl bg-leaf px-5 py-3.5 text-center text-lg font-semibold text-paper disabled:opacity-40";

/** The one primary action on a screen, as a button. */
export function Primary({ className = "", ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button type="button" data-primary="" {...props} className={`${PRIMARY_CLASS} ${className}`} />;
}

/** The one primary action on a screen, as props to spread on a link. */
export function primaryLink(className = "") {
  return { className: `${PRIMARY_CLASS} ${className}`, "data-primary": "" } as const;
}

const QUIET_CLASS =
  "inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-ink/70 bg-card px-4 py-2.5 text-base font-semibold text-ink disabled:opacity-40";

/** Everything that is not the primary action. */
export function Quiet({ className = "", ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button type="button" {...props} className={`${QUIET_CLASS} ${className}`} />;
}

export const QUIET_LINK = QUIET_CLASS;

export const TEXT_LINK = "font-semibold text-ink underline decoration-2 underline-offset-4";

export const INPUT =
  "mt-1.5 block min-h-12 w-full rounded-2xl border border-ink/50 bg-card px-4 py-3 text-base text-ink outline-none placeholder:text-muted/70 focus:border-ink focus:ring-2 focus:ring-ink";

/** In development, say so loudly if a screen ends up with two green actions. */
function usePrimaryCheck() {
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    const timer = window.setTimeout(() => {
      const count = document.querySelectorAll("main [data-primary]").length;
      if (count > 1) console.error(`koa: ${count} primary actions are on this screen. Green is for one.`);
    }, 250);
    return () => window.clearTimeout(timer);
  });
}

/** Says in words and with a mark which side of koa something belongs to. */
export function SideTag({ side, className = "" }: { side: Side; className?: string }) {
  const Icon = side === "personal" ? User : Users;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-sm font-semibold ${
        side === "personal" ? "border border-ink text-ink" : "bg-river text-paper"
      } ${className}`}
    >
      <Icon className="size-4" aria-hidden="true" />
      {SIDE_LABEL[side]}
    </span>
  );
}

/** A phone-width screen with a way back to the Home map. */
export function Screen({
  side,
  kicker,
  title,
  intro,
  wide = false,
  back = true,
  children,
}: {
  /** Whose activity this screen holds. It sets the strip under the header. */
  side: ScreenSide;
  kicker: string;
  title: string;
  intro?: ReactNode;
  /** Room for two columns on a larger screen. Phones are unaffected. */
  wide?: boolean;
  back?: boolean;
  children: ReactNode;
}) {
  usePrimaryCheck();
  return (
    <Shell side={side}>
      <main className={`mx-auto px-4 pt-5 pb-10 sm:px-6 ${wide ? "max-w-4xl" : "max-w-xl"}`}>
        {back && (
          <Link to="/" className={`${TEXT_LINK} inline-flex min-h-11 items-center`}>
            Back to Home
          </Link>
        )}
        <div className={`flex flex-wrap items-center gap-2 ${back ? "mt-3" : "mt-1"}`}>
          {side !== "both" && <SideTag side={side} />}
          {(side === "both" || kicker !== SIDE_LABEL[side]) && <p className="text-base font-semibold text-muted">{kicker}</p>}
        </div>
        <h1 className="mt-2 font-display text-4xl leading-[1.1] font-medium text-ink">{title}</h1>
        {intro && <p className="mt-3 text-lg leading-relaxed text-muted">{intro}</p>}
        {children}
      </main>
    </Shell>
  );
}

export function Field({
  label,
  hint,
  htmlFor,
  children,
}: {
  label: string;
  hint?: string;
  htmlFor: string;
  children: ReactNode;
}) {
  return (
    <div className="mt-5">
      <label className="block text-base font-semibold text-ink" htmlFor={htmlFor}>
        {label}
      </label>
      {hint && <p className="mt-0.5 text-base leading-relaxed text-muted">{hint}</p>}
      {children}
    </div>
  );
}

/** Shown on every screen that states a rule. */
export function GeneralInfo({ children, className = "mt-8" }: { children?: ReactNode; className?: string }) {
  return (
    <p className={`rounded-2xl border border-line px-4 py-3 text-base leading-relaxed text-muted ${className}`}>
      General information only. Not tax, legal or financial advice. Australia only.
      {children ? <> {children}</> : null}
    </p>
  );
}

/** Brass is for expiry and warnings. */
export function Warn({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div
      role="note"
      className={`rounded-2xl border border-brass bg-brass-soft px-4 py-3 text-base leading-relaxed text-ink ${className}`}
    >
      {children}
    </div>
  );
}

/** A refusal or a problem with what was typed. Announced to screen readers. */
export function Problem({ children, className = "mt-4" }: { children: ReactNode; className?: string }) {
  if (!children) return null;
  return (
    <div
      role="alert"
      className={`rounded-2xl border-2 border-brass bg-brass-soft px-4 py-3 text-base leading-relaxed font-medium text-ink ${className}`}
    >
      {children}
    </div>
  );
}

/** A calm statement of fact, such as where something is kept. */
export function Notice({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <p className={`flex gap-3 rounded-2xl bg-paper-deep px-4 py-3 text-base leading-relaxed text-ink ${className}`}>
      <ShieldCheck className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
      <span>{children}</span>
    </p>
  );
}

/** An uncertain rule, and who has to check it. */
export function Verify({ who, children, className = "mt-3" }: { who: string; children?: ReactNode; className?: string }) {
  return (
    <p className={`text-base leading-relaxed text-ink ${className}`}>
      <span className="mr-2 inline-block rounded-full border border-brass bg-brass-soft px-2 py-0.5 text-sm font-bold tracking-wide text-brass-deep">
        VERIFY
      </span>
      {children ? <>{children} </> : null}
      <span className="font-semibold">Who checks: {who}.</span>
    </p>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-card border border-line bg-card p-5 ${className}`}>{children}</section>;
}

/** A ruled list inside one panel. Each row is a full-width tap target. */
export function Rows({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <ul className={`divide-y divide-line overflow-hidden rounded-card border border-line bg-card ${className}`}>
      {children}
    </ul>
  );
}

/** The same paper slip for a spend, a gift, an expiry and a passed ask. */
export function ReceiptCard({ receipt, heading = "Receipt" }: { receipt: Receipt; heading?: string }) {
  const rows: [string, string][] = [
    ["Reference", receipt.ref],
    ["Date", formatDate(receipt.date)],
    ["Counterparty", receipt.counterparty],
    ["Amount", `${receipt.amount.toLocaleString("en-AU")} Q`],
    ["Type", receiptLabel(receipt.kind)],
  ];
  return (
    <div className="slip-edge">
      <section className="slip px-5" aria-label={heading}>
        <p className="text-base font-semibold text-muted">
          {heading}
          {receipt.sample ? " (sample)" : ""}
        </p>
        <p className="mt-1 font-display text-5xl font-medium text-ink">{receipt.amount.toLocaleString("en-AU")} Q</p>
        <dl className="mt-3 grid gap-2 text-base">
          {rows.map(([term, value]) => (
            <div key={term} className="flex justify-between gap-4 border-t border-dashed border-ink/40 pt-2">
              <dt className="text-muted">{term}</dt>
              <dd className="text-right font-medium text-ink">{value}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-3 text-sm leading-relaxed text-muted">Demo mark on this device. No real money moved.</p>
      </section>
    </div>
  );
}

/**
 * A text note the person can take away. Copy is the primary action, and a
 * plain .txt file is the alternative. Nothing is sent anywhere.
 */
export function NoteExport({
  text,
  filename,
  onCopied,
}: {
  text: string;
  filename: string;
  onCopied?: () => void;
}) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");
  const [href, setHref] = useState<string | null>(null);

  useEffect(() => {
    const url = URL.createObjectURL(new Blob([text], { type: "text/plain;charset=utf-8" }));
    setHref(url);
    setState("idle");
    return () => URL.revokeObjectURL(url);
  }, [text]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setState("copied");
      onCopied?.();
    } catch {
      setState("failed");
    }
  }

  return (
    <div>
      <pre
        tabIndex={0}
        className="mt-4 max-h-[26rem] overflow-auto rounded-card border border-line bg-card p-4 font-sans text-base leading-relaxed whitespace-pre-wrap text-ink"
      >
        {text}
      </pre>
      <Primary className="mt-4" onClick={copy}>
        {state === "copied" ? "Copied" : "Copy the note"}
      </Primary>
      {state === "failed" && (
        <Warn className="mt-3">
          This browser would not copy. Select the text above and copy it by hand, or save the file.
        </Warn>
      )}
      <p className="mt-3 text-base leading-relaxed text-muted">
        {href && (
          <a href={href} download={filename} className={TEXT_LINK}>
            Save as a text file
          </a>
        )}{" "}
        The note stays on this device until you send it yourself.
      </p>
    </div>
  );
}

/** A secondary copy button for a saved note. */
export function CopyQuiet({ text, label = "Copy the text" }: { text: string; label?: string }) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");
  return (
    <Quiet
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setState("copied");
        } catch {
          setState("failed");
        }
      }}
    >
      {state === "copied" ? "Copied" : state === "failed" ? "Copy did not work" : label}
    </Quiet>
  );
}

/** Clearing is always explicit: ask, then do it. */
export function ConfirmClear({
  ask,
  body,
  confirm,
  onConfirm,
  className = "mt-8",
}: {
  ask: string;
  body: string;
  confirm: string;
  onConfirm: () => void;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className={`${TEXT_LINK} min-h-11 text-left ${className}`}>
        {ask}
      </button>
    );
  }
  return (
    <Warn className={className}>
      <p>{body}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Quiet
          className="border-brass-deep"
          onClick={() => {
            onConfirm();
            setOpen(false);
          }}
        >
          {confirm}
        </Quiet>
        <Quiet onClick={() => setOpen(false)}>Keep it</Quiet>
      </div>
    </Warn>
  );
}

/** A choice chip. Selected is ink, never green. */
export function Chip({
  on,
  children,
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { on: boolean }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      {...props}
      className={`min-h-11 rounded-full border px-4 py-2 text-base font-medium ${
        on ? "border-ink bg-ink text-paper" : "border-ink/50 bg-card text-ink"
      } ${className}`}
    >
      {children}
    </button>
  );
}

/** A heading inside a screen. */
export function Heading({ children, className = "mt-10" }: { children: ReactNode; className?: string }) {
  return <h2 className={`font-display text-2xl leading-snug font-medium text-ink ${className}`}>{children}</h2>;
}
