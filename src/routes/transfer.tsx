import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AttachedCaptures, AttachedCount } from "@/components/attached";
import { ExpiryRing } from "@/components/rings-mark";
import { Chip, ConfirmClear, Field, GeneralInfo, Heading, INPUT, Primary, Problem, ReceiptCard, Screen } from "@/components/ui";
import { attachValue } from "@/lib/captures";
import { formatDate } from "@/lib/dates";
import { GIFT_WINDOW_DAYS, MAX_COUNTERPARTY, receiptLabel, type MoveKind, type Receipt } from "@/lib/ledger-core";
import { useLedger } from "@/lib/stores";
import { useScrollTopOn } from "@/lib/use-scroll-top";

type Search = { mode?: "gift" | "spend" };

export const Route = createFileRoute("/transfer")({
  validateSearch: (search: Record<string, unknown>): Search =>
    search.mode === "gift" || search.mode === "spend" ? { mode: search.mode } : {},
  component: Transfer,
});

function Transfer() {
  const search = Route.useSearch();
  const { ledger, daysLeft, move, reset } = useLedger();
  const [kind, setKind] = useState<MoveKind>(search.mode === "spend" ? "Spend" : "Gift");
  const [amount, setAmount] = useState("");
  const [counterparty, setCounterparty] = useState("");
  const [problem, setProblem] = useState<string | null>(null);
  const [done, setDone] = useState<Receipt | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  useScrollTopOn(done);

  const bucket = kind === "Gift" ? ledger.gifting : ledger.purchasing;

  function record() {
    const result = move({ kind, amount: Number(amount), counterparty });
    if (!result.ok) {
      setProblem(result.reason);
      return;
    }
    setDone(result.receipt);
    setAmount("");
    setCounterparty("");
    setProblem(null);
  }

  if (done) {
    return (
      <Screen side="personal" kicker="Device ledger" title={done.kind === "Gift" ? "Gift recorded" : "Spend recorded"}>
        <div className="mt-6">
          <ReceiptCard receipt={done} />
        </div>
        <Primary className="mt-6" onClick={() => setDone(null)}>
          Record another
        </Primary>
        <AttachedCaptures target={attachValue("ledger", done.ref)} action="Capture the paper receipt for this" className="mt-3" />
        <GeneralInfo>A demo mark on this device. No real money moved, and holders earn no yield.</GeneralInfo>
      </Screen>
    );
  }

  return (
    <Screen
      side="personal"
      kicker="Device ledger"
      title="Spend or gift units"
      intro="Purchasing units are for spending in the local circuit. Gifting units have to be given on before they expire."
    >
      <div className="mt-6 flex gap-2" role="group" aria-label="Kind of move">
        <Chip on={kind === "Gift"} onClick={() => setKind("Gift")} className="flex-1">
          Gift ({ledger.gifting} Q)
        </Chip>
        <Chip on={kind === "Spend"} onClick={() => setKind("Spend")} className="flex-1">
          Spend ({ledger.purchasing} Q)
        </Chip>
      </div>

      {kind === "Gift" && daysLeft !== null && (
        <div className="mt-4 flex items-center gap-3 rounded-2xl border border-brass bg-brass-soft px-4 py-3">
          <ExpiryRing daysLeft={daysLeft} className="size-11 shrink-0" />
          <p className="text-base leading-snug text-ink">
            {daysLeft} {daysLeft === 1 ? "day" : "days"} before idle gifting units leave circulation. Giving restarts
            the {GIFT_WINDOW_DAYS}-day count.
          </p>
        </div>
      )}

      <Field label="How many units" hint={`Whole units. There are ${bucket} on this device.`} htmlFor="move-amount">
        <input
          id="move-amount"
          inputMode="numeric"
          value={amount}
          autoComplete="off"
          onChange={(event) => {
            setAmount(event.target.value.replace(/\D/g, "").slice(0, 5));
            setProblem(null);
          }}
          className={INPUT}
        />
      </Field>
      <Field
        label={kind === "Gift" ? "Who is it for" : "Where was it spent"}
        hint="A shop, a group, a first name or a role. No account details."
        htmlFor="move-to"
      >
        <input
          id="move-to"
          value={counterparty}
          maxLength={MAX_COUNTERPARTY}
          autoComplete="off"
          onChange={(event) => {
            setCounterparty(event.target.value);
            setProblem(null);
          }}
          className={INPUT}
        />
      </Field>
      <Problem>{problem}</Problem>
      <Primary className="mt-6" onClick={record} disabled={bucket === 0}>
        {kind === "Gift" ? "Record the gift" : "Record the spend"}
      </Primary>

      <Heading>Receipts on this device</Heading>
      {ledger.receipts.length === 0 ? (
        <p className="mt-3 text-base text-muted">No receipts yet. A spend or a gift writes one.</p>
      ) : (
        <ul className="mt-3 grid gap-2">
          {ledger.receipts.map((receipt) => (
            <li key={receipt.ref}>
              <button
                type="button"
                aria-expanded={open === receipt.ref}
                onClick={() => setOpen(open === receipt.ref ? null : receipt.ref)}
                className="flex min-h-14 w-full items-center justify-between gap-3 rounded-2xl border border-line bg-card px-4 py-3 text-left"
              >
                <span>
                  <span className="block text-base font-semibold text-ink">
                    {receipt.counterparty}
                    {receipt.sample ? " (sample)" : ""}
                  </span>
                  <span className="block text-base text-muted">
                    {receiptLabel(receipt.kind)}, {formatDate(receipt.date)}
                  </span>
                  <AttachedCount target={attachValue("ledger", receipt.ref)} />
                </span>
                <span className="font-display text-2xl font-medium text-ink">{receipt.amount} Q</span>
              </button>
              {open === receipt.ref && (
                <div className="mt-2 mb-3">
                  <ReceiptCard receipt={receipt} />
                  <AttachedCaptures target={attachValue("ledger", receipt.ref)} action="Capture the paper receipt for this" />
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      <ConfirmClear
        ask="Reset the demo ledger"
        body="This puts the units, receipts and proposals back to the demo start. Captures and folders are not touched."
        confirm="Reset the ledger"
        onConfirm={reset}
      />
      <GeneralInfo>A demo mark on this device. One unit stands for one Australian dollar in reserve. No real money moves.</GeneralInfo>
    </Screen>
  );
}
