import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CaptureFields, FilingFields } from "@/components/capture-form";
import { SimplifyNote, TermList } from "@/components/explain";
import { ConfirmClear, CopyQuiet, GeneralInfo, Heading, Notice, Primary, primaryLink, Problem, Quiet, Screen, SideTag, TEXT_LINK } from "@/components/ui";
import {
  attachLabel,
  ATTACH_KIND_SIDE,
  captureText,
  exportStem,
  fileExtension,
  parseAttach,
  type CaptureDraft,
} from "@/lib/captures";
import { formatDate } from "@/lib/dates";
import { saveFile } from "@/lib/export";
import { library, useAttachCatalogue, useLibrary } from "@/lib/stores";

export const Route = createFileRoute("/captures/$captureId")({ component: CapturePage });

function usePicture(id: string, kept: boolean) {
  const [url, setUrl] = useState<string | null>(null);
  const [type, setType] = useState("");
  useEffect(() => {
    if (!kept) {
      setUrl(null);
      return;
    }
    let made: string | null = null;
    let live = true;
    void library.fileFor(id).then((file) => {
      if (!live || !file) return;
      made = URL.createObjectURL(file.blob);
      setUrl(made);
      setType(file.type);
    });
    return () => {
      live = false;
      if (made) URL.revokeObjectURL(made);
    };
  }, [id, kept]);
  return { url, type };
}

function CapturePage() {
  const { captureId } = Route.useParams();
  const navigate = Route.useNavigate();
  const { captures, folders, ready } = useLibrary();
  const catalogue = useAttachCatalogue();
  const capture = captures.find((item) => item.id === captureId);
  const picture = usePicture(captureId, Boolean(capture?.file));

  const [draft, setDraft] = useState<CaptureDraft | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  if (!capture) {
    return (
      <Screen side="personal" kicker="Capture" title={ready ? "That capture is not on this device" : "Opening the capture"}>
        {ready && (
          <Link to="/folders" {...primaryLink("mt-6")}>
            Open the folders
          </Link>
        )}
        <GeneralInfo />
      </Screen>
    );
  }

  const folder = folders.find((item) => item.id === capture.folderId);
  const target = parseAttach(capture.attach);
  const side = target ? ATTACH_KIND_SIDE[target.kind] : (folder?.side ?? "personal");
  const attachedTo = attachLabel(capture.attach, catalogue);
  const note = captureText(capture, folder?.name ?? "Shoebox", attachedTo);

  async function save() {
    if (!draft) return;
    const result = await library.updateCapture(captureId, draft);
    if (!result.ok) {
      setProblem(result.reason);
      return;
    }
    setDraft(null);
    setProblem(null);
    setSaved(true);
  }

  async function savePicture() {
    if (!capture?.file) return;
    const file = await library.fileFor(captureId);
    if (file) saveFile(file.blob, `${exportStem(capture)}.${fileExtension(capture.file)}`);
  }

  const rows: [string, string][] = [
    ["Date on the paper", formatDate(capture.date)],
    ["Supplier", capture.supplier || "Not noted"],
    ["Amount as printed", capture.amount || "Not noted"],
    ["Folder", folder?.name ?? "Shoebox"],
    ["Attached to", attachedTo],
  ];

  return (
    <Screen side={side} kicker="Capture" title={capture.title}>
      {picture.url && picture.type.startsWith("image/") && (
        <img src={picture.url} alt={`The paper: ${capture.title}`} className="mt-5 max-h-[28rem] w-full rounded-card border border-line bg-card object-contain" />
      )}
      {picture.url && !picture.type.startsWith("image/") && (
        <p className="mt-5 rounded-card border border-line bg-card px-4 py-3 text-base text-ink">A document is kept with this capture.</p>
      )}

      {draft ? (
        <>
          <CaptureFields draft={draft} onChange={(next) => (setDraft(next), setProblem(null))} />
          <SimplifyNote text={draft.note} onUse={(short) => setDraft({ ...draft, note: short })} />
          <FilingFields draft={draft} onChange={(next) => (setDraft(next), setProblem(null))} />
          <Problem>{problem}</Problem>
          <Primary className="mt-6" onClick={save}>
            Save the changes
          </Primary>
          <Quiet className="mt-3 w-full" onClick={() => (setDraft(null), setProblem(null))}>
            Cancel
          </Quiet>
        </>
      ) : (
        <>
          <div className="slip-edge mt-5">
            <section className="slip px-5" aria-label="Capture details">
              <div className="flex items-center justify-between gap-2">
                <p className="text-base font-semibold text-muted">Capture</p>
                <SideTag side={side} className="py-0.5 text-xs" />
              </div>
              <dl className="mt-2 grid gap-2 text-base">
                {rows.map(([term, value]) => (
                  <div key={term} className="flex justify-between gap-4 border-t border-dashed border-ink/40 pt-2">
                    <dt className="text-muted">{term}</dt>
                    <dd className="text-right font-medium text-ink">{value}</dd>
                  </div>
                ))}
              </dl>
            </section>
          </div>
          {saved && (
            <p className="mt-3 text-base font-medium text-ink" role="status">
              Saved on this device.
            </p>
          )}

          {capture.note && (
            <>
              <Heading className="mt-8">Note</Heading>
              <p className="mt-2 text-lg leading-relaxed whitespace-pre-wrap text-ink">{capture.note}</p>
              <SimplifyNote text={capture.note} />
            </>
          )}

          <Primary
            className="mt-6"
            onClick={() => {
              const { title, date, supplier, amount, note: written, text, folderId, attach } = capture;
              setDraft({ title, date, supplier, amount, note: written, text, folderId, attach });
              setSaved(false);
            }}
          >
            Edit, move or attach
          </Primary>

          {capture.text && (
            <>
              <Heading>Words read from the picture</Heading>
              <pre tabIndex={0} className="mt-3 max-h-80 overflow-auto rounded-card border border-line bg-card p-4 font-sans text-base leading-relaxed whitespace-pre-wrap text-ink">
                {capture.text}
              </pre>
              <TermList text={capture.text} />
            </>
          )}

          <Heading>Take it with you</Heading>
          <div className="mt-3 flex flex-wrap gap-2">
            <CopyQuiet text={note} label="Copy as text" />
            {capture.file && <Quiet onClick={savePicture}>Save the picture</Quiet>}
          </div>
          <Notice className="mt-4">Nothing leaves this device unless you copy it or save a file yourself.</Notice>

          {capture.file && (
            <ConfirmClear
              ask="Remove the picture, keep the words"
              body="Remove the picture from this device? What you wrote stays."
              confirm="Remove the picture"
              onConfirm={() => void library.dropFile(captureId)}
            />
          )}
          <ConfirmClear
            className={capture.file ? "mt-3" : "mt-8"}
            ask="Delete this capture"
            body="Delete this capture and its picture from this device? This cannot be undone."
            confirm="Delete the capture"
            onConfirm={async () => {
              const to = capture.folderId;
              await library.removeCapture(captureId);
              await navigate({ to: "/folders/$folderId", params: { folderId: to } });
            }}
          />
        </>
      )}

      <p className="mt-8">
        <Link to="/folders/$folderId" params={{ folderId: capture.folderId }} className={TEXT_LINK}>
          Back to {folder?.name ?? "the shoebox"}
        </Link>
      </p>
      <GeneralInfo>koa copies what a paper says. It does not work out a tax, a deduction or a saving from it.</GeneralInfo>
    </Screen>
  );
}
