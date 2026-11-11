import { createFileRoute, Link, type LinkProps } from "@tanstack/react-router";
import { Camera, FileUp, PencilLine } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { CaptureFields, FilingFields } from "@/components/capture-form";
import { SimplifyNote } from "@/components/explain";
import { GeneralInfo, INPUT, Notice, Primary, Problem, Quiet, QUIET_LINK, Screen, Warn } from "@/components/ui";
import { prepareForReading, shrinkForKeeping } from "@/lib/ai/image-prep";
import { readPicture, type ReadProgress } from "@/lib/ai/ocr";
import { parseReceipt, tidyOcrText } from "@/lib/ai/receipt-parse";
import {
  attachLabel,
  captureProblem,
  emptyDraft,
  fileExtension,
  MAX_FILE_BYTES,
  MAX_TEXT,
  parseAttach,
  safeFileName,
  SHOEBOX_ID,
  type AttachKind,
  type Capture,
  type CaptureDraft,
} from "@/lib/captures";
import { formatDate, todayISO } from "@/lib/dates";
import { privatePaper, refusalFor, scrubIdentifiers } from "@/lib/guards";
import { library, useAttachCatalogue, useLibrary } from "@/lib/stores";
import { useScrollTopOn } from "@/lib/use-scroll-top";

type Search = { attach?: string; folder?: string };

export const Route = createFileRoute("/capture")({
  validateSearch: (search: Record<string, unknown>): Search => ({
    ...(typeof search.attach === "string" && parseAttach(search.attach) ? { attach: search.attach } : {}),
    ...(typeof search.folder === "string" ? { folder: search.folder } : {}),
  }),
  component: CapturePage,
});

type Step = "pick" | "reading" | "confirm" | "saved";

/** What koa learned from the picture, kept beside the draft while it is checked. */
type Reading = {
  found?: { date: boolean; amount: boolean; supplier: boolean };
  removed: number;
  /** The picture looks like a private paper, so only its words can be kept. */
  blocked: boolean;
  /** Why nothing was read, when nothing was. */
  note: string | null;
};

const NO_READING: Reading = { removed: 0, blocked: false, note: null };

const BACK_TO: Record<AttachKind, { to: LinkProps["to"]; label: string }> = {
  tax: { to: "/tax", label: "Back to the tax questions" },
  bequest: { to: "/bequest", label: "Back to the bequest pack" },
  ledger: { to: "/transfer", label: "Back to the ledger" },
  structure: { to: "/structures", label: "Back to the structure list" },
  bench: { to: "/bench", label: "Back to the bench" },
  minutes: { to: "/minutes", label: "Back to the minutes" },
  proposal: { to: "/fund", label: "Back to the proposals" },
};

function CapturePage() {
  const search = Route.useSearch();
  const { folders, durable } = useLibrary();
  const catalogue = useAttachCatalogue();
  const startFolder = folders.some((folder) => folder.id === search.folder) ? (search.folder as string) : SHOEBOX_ID;

  const [step, setStep] = useState<Step>("pick");
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState<ReadProgress>({ stage: "starting", ratio: 0 });
  const [reading, setReading] = useState<Reading>(NO_READING);
  const [draft, setDraft] = useState<CaptureDraft>(() => emptyDraft(todayISO(), startFolder, search.attach ?? ""));
  const [keepPicture, setKeepPicture] = useState(true);
  const [problem, setProblem] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState<Capture | null>(null);
  const run = useRef(0);
  useScrollTopOn(step);

  const preview = useMemo(() => (file && file.type.startsWith("image/") ? URL.createObjectURL(file) : null), [file]);
  useEffect(() => () => void (preview && URL.revokeObjectURL(preview)), [preview]);

  function reset() {
    run.current += 1;
    setFile(null);
    setReading(NO_READING);
    setDraft(emptyDraft(todayISO(), startFolder, search.attach ?? ""));
    setKeepPicture(true);
    setProblem(null);
    setSaved(null);
    setStep("pick");
  }

  /** Goes to the confirm step with whatever is known so far. */
  function confirmWith(next: Partial<CaptureDraft>, learned: Reading) {
    setDraft((current) => ({ ...current, ...next }));
    setReading(learned);
    setKeepPicture(!learned.blocked);
    setStep("confirm");
  }

  async function take(picked: File) {
    const mine = (run.current += 1);
    setFile(picked);
    setProblem(null);
    if (picked.size > MAX_FILE_BYTES * 3) {
      setFile(null);
      setProblem("That file is too large for koa to open. Try a photo of the page.");
      return;
    }
    if (!picked.type.startsWith("image/")) {
      confirmWith({}, { ...NO_READING, note: "koa reads pictures. This file is kept as it is, so type the details yourself." });
      return;
    }
    setProgress({ stage: "starting", ratio: 0 });
    setStep("reading");
    try {
      const ready = await prepareForReading(picked);
      const { text } = await readPicture(ready, (next) => mine === run.current && setProgress(next));
      if (mine !== run.current) return;
      const tidy = tidyOcrText(text);
      const fields = parseReceipt(tidy, todayISO());
      const scrubbed = scrubIdentifiers(tidy);
      // A supplier line that looks like an identifier is left for the person to type.
      const supplier = refusalFor(fields.supplier) ? "" : fields.supplier;
      confirmWith(
        {
          title: supplier ? `${supplier} receipt` : "",
          date: fields.date,
          supplier,
          amount: fields.amount,
          text: scrubbed.text.slice(0, MAX_TEXT),
        },
        {
          found: { ...fields.found, supplier: supplier !== "" },
          removed: scrubbed.removed,
          blocked: privatePaper(tidy),
          note: tidy ? null : "koa could not find any words in this picture. Type the details yourself.",
        },
      );
    } catch {
      if (mine !== run.current) return;
      confirmWith({}, { ...NO_READING, note: "koa could not read this picture on this device. Type the details yourself." });
    }
  }

  function skipReading() {
    run.current += 1;
    confirmWith({}, { ...NO_READING, note: "Reading was skipped. Type the details yourself." });
  }

  async function save() {
    const reason = captureProblem(draft);
    if (reason) {
      setProblem(reason);
      return;
    }
    setSaving(true);
    try {
      let kept = null;
      if (file && keepPicture && !reading.blocked) {
        const shrunk = await shrinkForKeeping(file);
        const extension = fileExtension({ name: shrunk.name, type: shrunk.type, size: shrunk.blob.size });
        kept = { ...shrunk, name: `${safeFileName(draft.title)}.${extension}` };
      }
      const result = await library.addCapture(draft, kept);
      if (!result.ok) {
        setProblem(result.reason);
        return;
      }
      setSaved(result.value);
      setProblem(null);
      setStep("saved");
    } finally {
      setSaving(false);
    }
  }

  const attachedTo = search.attach ? attachLabel(search.attach, catalogue) : null;
  const folderName = folders.find((folder) => folder.id === draft.folderId)?.name ?? "Shoebox";

  return (
    <Screen
      side="personal"
      kicker="Capture"
      title={
        step === "pick"
          ? "Capture a receipt or document"
          : step === "reading"
            ? "Reading it on this device"
            : step === "confirm"
              ? "Check what koa read"
              : "Saved on this device"
      }
      intro={
        step === "pick"
          ? "Photograph the paper or pick a file. koa reads the words here, on this device, and you check them before anything is saved."
          : undefined
      }
    >
      {!durable && (
        <Warn className="mt-4">
          This browser will not keep captures after the tab closes. It may be in private mode. Save anything you
          need as a file before you leave.
        </Warn>
      )}

      {step === "pick" && <PickStep attachedTo={attachedTo} problem={problem} onFile={take} onWrite={() => confirmWith({}, NO_READING)} />}
      {step === "reading" && <ReadingStep progress={progress} preview={preview} onSkip={skipReading} />}
      {step === "confirm" && (
        <ConfirmStep
          draft={draft}
          setDraft={(next) => {
            setDraft(next);
            setProblem(null);
          }}
          reading={reading}
          file={file}
          preview={preview}
          keepPicture={keepPicture}
          setKeepPicture={setKeepPicture}
          folderName={folderName}
          problem={problem}
          saving={saving}
          onSave={save}
          onReset={reset}
        />
      )}
      {step === "saved" && saved && <SavedStep capture={saved} folderName={folderName} attachedTo={attachLabel(saved.attach, catalogue)} onAnother={reset} />}

      <GeneralInfo>
        koa copies what a paper says. It does not work out a tax, a deduction or a saving from it.
      </GeneralInfo>
    </Screen>
  );
}

function PickStep({
  attachedTo,
  problem,
  onFile,
  onWrite,
}: {
  attachedTo: string | null;
  problem: string | null;
  onFile: (file: File) => void;
  onWrite: () => void;
}) {
  const camera = useRef<HTMLInputElement>(null);
  const picker = useRef<HTMLInputElement>(null);

  function picked(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (file) onFile(file);
  }

  return (
    <>
      {attachedTo && (
        <p className="mt-4 rounded-2xl border border-ink bg-card px-4 py-3 text-base leading-relaxed text-ink">
          This capture will be attached to <span className="font-semibold">{attachedTo}</span>. You can change that
          before you save.
        </p>
      )}

      <input ref={camera} type="file" accept="image/*" capture="environment" className="sr-only" tabIndex={-1} aria-hidden="true" onChange={picked} />
      <input ref={picker} type="file" accept="image/*,application/pdf" className="sr-only" tabIndex={-1} aria-hidden="true" onChange={picked} data-testid="file-picker" />

      <Primary className="mt-6 min-h-20 gap-3 text-xl" onClick={() => camera.current?.click()}>
        <Camera className="size-7" aria-hidden="true" />
        Take a photo
      </Primary>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <Quiet className="min-h-14" onClick={() => picker.current?.click()}>
          <FileUp className="size-5" aria-hidden="true" />
          Choose a picture or file
        </Quiet>
        <Quiet className="min-h-14" onClick={onWrite}>
          <PencilLine className="size-5" aria-hidden="true" />
          Write a note with no picture
        </Quiet>
      </div>
      <Problem>{problem}</Problem>

      <Notice className="mt-6">
        The picture is read by a program that runs inside this page. It is not uploaded, and nothing leaves this
        device unless you copy or save a file yourself.
      </Notice>

      <ul className="mt-5 grid gap-2 text-base leading-relaxed text-muted">
        <li>Lay the paper flat, fill the frame, and avoid shadows.</li>
        <li>koa looks for a date, a total and a supplier. You check all three.</li>
        <li>Numbers that look like identifiers are taken out of the text before you see it.</li>
      </ul>

      <p className="mt-5">
        <Link to="/folders" className={QUIET_LINK}>
          Open the folders
        </Link>
      </p>
    </>
  );
}

function ReadingStep({ progress, preview, onSkip }: { progress: ReadProgress; preview: string | null; onSkip: () => void }) {
  const shown = progress.stage === "starting" ? Math.round(progress.ratio * 30) : 30 + Math.round(progress.ratio * 70);
  return (
    <>
      {preview && <img src={preview} alt="The picture being read" className="mt-5 max-h-64 w-full rounded-card border border-line object-contain" />}
      <div className="mt-5" role="status" aria-live="polite">
        <p className="text-lg font-semibold text-ink">
          {progress.stage === "starting" ? "Getting the reader ready" : "Reading the picture"}
        </p>
        <p className="mt-1 text-base leading-relaxed text-muted">
          {progress.stage === "starting"
            ? "The first read takes longer, while the reader is loaded from this app's own files."
            : "Looking for the date, the total and the supplier."}
        </p>
      </div>
      <div
        className="mt-3 h-3 overflow-hidden rounded-full bg-paper-deep"
        role="progressbar"
        aria-label="Reading progress"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={shown}
      >
        <div className="h-full origin-left rounded-full bg-ink transition-transform" style={{ transform: `scaleX(${shown / 100})` }} />
      </div>
      <Quiet className="mt-6 w-full" onClick={onSkip}>
        Skip reading and type it myself
      </Quiet>
    </>
  );
}

function ConfirmStep({
  draft,
  setDraft,
  reading,
  file,
  preview,
  keepPicture,
  setKeepPicture,
  folderName,
  problem,
  saving,
  onSave,
  onReset,
}: {
  draft: CaptureDraft;
  setDraft: (next: CaptureDraft) => void;
  reading: Reading;
  file: File | null;
  preview: string | null;
  keepPicture: boolean;
  setKeepPicture: (next: boolean) => void;
  folderName: string;
  problem: string | null;
  saving: boolean;
  onSave: () => void;
  onReset: () => void;
}) {
  const [showText, setShowText] = useState(false);
  return (
    <>
      {reading.note && <Warn className="mt-4">{reading.note}</Warn>}
      {reading.found && !reading.note && (
        <p className="mt-3 text-lg leading-relaxed text-muted">
          A reader can misread a smudged digit. Check each field against the paper, then save.
        </p>
      )}
      {reading.removed > 0 && (
        <Notice className="mt-4">
          koa took {reading.removed} {reading.removed === 1 ? "number" : "numbers"} that looked like{" "}
          {reading.removed === 1 ? "an identifier" : "identifiers"} out of the text, such as a business, card or
          phone number.
        </Notice>
      )}

      {preview && <img src={preview} alt="The picture you chose" className="mt-5 max-h-72 w-full rounded-card border border-line object-contain" />}
      {file && !preview && (
        <p className="mt-5 rounded-card border border-line bg-card px-4 py-3 text-base text-ink">File chosen: {file.type === "application/pdf" ? "a PDF document" : "a document"}.</p>
      )}

      {file && (
        <div className="mt-4">
          {reading.blocked ? (
            <Warn>
              This picture seems to show a tax file number, bank details or another private number. koa will keep
              what you write below, but not the picture.
            </Warn>
          ) : (
            <label className="flex min-h-12 cursor-pointer items-start gap-3 rounded-2xl border border-line bg-card px-4 py-3 text-base text-ink">
              <input
                type="checkbox"
                checked={keepPicture}
                onChange={(event) => setKeepPicture(event.target.checked)}
                className="mt-1 size-5 accent-ink"
              />
              <span>
                <span className="font-semibold">Keep the {preview ? "picture" : "file"} on this device</span>
                <span className="block leading-relaxed text-muted">
                  Look at it first. If it shows a tax file number, a bank account or a member number, untick this
                  and keep only the words.
                </span>
              </span>
            </label>
          )}
        </div>
      )}

      <CaptureFields draft={draft} onChange={setDraft} found={reading.found} />
      <SimplifyNote text={draft.note} onUse={(short) => setDraft({ ...draft, note: short })} />

      {draft.text && (
        <div className="mt-5">
          <Quiet aria-expanded={showText} aria-controls="read-text" onClick={() => setShowText(!showText)}>
            {showText ? "Hide the words koa read" : "Show the words koa read"}
          </Quiet>
          {showText && (
            <div id="read-text">
              <label className="sr-only" htmlFor="capture-text">
                Words read from the picture
              </label>
              <textarea
                id="capture-text"
                rows={8}
                value={draft.text}
                maxLength={MAX_TEXT}
                onChange={(event) => setDraft({ ...draft, text: event.target.value })}
                className={`${INPUT} leading-relaxed`}
              />
              <p className="mt-1 text-base leading-relaxed text-muted">
                Saved with the capture so you can search for it later. Edit or clear it as you like.
              </p>
            </div>
          )}
        </div>
      )}

      <FilingFields draft={draft} onChange={setDraft} />

      <Problem>{problem}</Problem>
      <Primary className="mt-6" disabled={saving} onClick={onSave}>
        {saving ? "Saving" : `Save to ${folderName}`}
      </Primary>
      <Quiet className="mt-3 w-full" onClick={onReset}>
        Start again
      </Quiet>
    </>
  );
}

function SavedStep({
  capture,
  folderName,
  attachedTo,
  onAnother,
}: {
  capture: Capture;
  folderName: string;
  attachedTo: string;
  onAnother: () => void;
}) {
  const target = parseAttach(capture.attach);
  const back = target ? BACK_TO[target.kind] : null;
  const rows: [string, string][] = [
    ["Date on the paper", formatDate(capture.date)],
    ["Supplier", capture.supplier || "Not noted"],
    ["Amount as printed", capture.amount || "Not noted"],
    ["Folder", folderName],
    ["Attached to", attachedTo],
    ["Picture or file", capture.file ? "Kept on this device" : "Not kept"],
  ];
  return (
    <>
      <div className="slip-edge mt-5">
        <section className="slip px-5" aria-label="Saved capture">
          <p className="text-base font-semibold text-muted">Capture</p>
          <p className="mt-1 font-display text-3xl leading-tight font-medium text-ink">{capture.title}</p>
          <dl className="mt-3 grid gap-2 text-base">
            {rows.map(([term, value]) => (
              <div key={term} className="flex justify-between gap-4 border-t border-dashed border-ink/40 pt-2">
                <dt className="text-muted">{term}</dt>
                <dd className="text-right font-medium text-ink">{value}</dd>
              </div>
            ))}
          </dl>
        </section>
      </div>
      <Primary className="mt-6" onClick={onAnother}>
        Capture another
      </Primary>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <Link to="/captures/$captureId" params={{ captureId: capture.id }} className={QUIET_LINK}>
          Open this capture
        </Link>
        <Link to="/folders/$folderId" params={{ folderId: capture.folderId }} className={QUIET_LINK}>
          Open {folderName}
        </Link>
        {back && (
          <Link to={back.to} className={`${QUIET_LINK} sm:col-span-2`}>
            {back.label}
          </Link>
        )}
      </div>
    </>
  );
}
