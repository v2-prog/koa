import { useState } from "react";
import { Chip, Field, INPUT, Problem, Quiet, SideTag } from "@/components/ui";
import {
  ATTACH_KIND_LABEL,
  ATTACH_KIND_SIDE,
  attachLabel,
  MAX_FOLDER_NAME,
  MAX_NOTE,
  MAX_SUPPLIER,
  MAX_TITLE,
  parseAttach,
  SIDE_LABEL,
  type AttachKind,
  type CaptureDraft,
  type Side,
} from "@/lib/captures";
import { todayISO } from "@/lib/dates";
import { library, useAttachCatalogue, useLibrary } from "@/lib/stores";

type Found = { date: boolean; amount: boolean; supplier: boolean };

function readHint(found: Found | undefined, key: keyof Found, otherwise: string): string {
  if (!found) return otherwise;
  return found[key] ? "Read from the picture. Check it against the paper." : `Not found on the picture. ${otherwise}`;
}

/** The written part of a capture: what the paper is and what it says. */
export function CaptureFields({
  draft,
  onChange,
  found,
}: {
  draft: CaptureDraft;
  onChange: (next: CaptureDraft) => void;
  /** Which fields koa read from the picture. Left out when nothing was read. */
  found?: Found;
}) {
  return (
    <>
      <Field label="Title" hint="The shop, or the kind of paper." htmlFor="capture-title">
        <input
          id="capture-title"
          value={draft.title}
          maxLength={MAX_TITLE}
          autoComplete="off"
          onChange={(event) => onChange({ ...draft, title: event.target.value })}
          className={INPUT}
        />
      </Field>
      <Field label="Date on the paper" hint={readHint(found, "date", "Set to today until you change it.")} htmlFor="capture-date">
        <input
          id="capture-date"
          type="date"
          value={draft.date}
          max={todayISO()}
          onChange={(event) => onChange({ ...draft, date: event.target.value })}
          className={INPUT}
        />
      </Field>
      <Field label="Supplier" hint={readHint(found, "supplier", "Who issued it, if that matters.")} htmlFor="capture-supplier">
        <input
          id="capture-supplier"
          value={draft.supplier}
          maxLength={MAX_SUPPLIER}
          autoComplete="off"
          onChange={(event) => onChange({ ...draft, supplier: event.target.value })}
          className={INPUT}
        />
      </Field>
      <Field
        label="Amount as printed"
        hint={readHint(found, "amount", "Digits only, such as 42.50, or leave it empty. koa copies it and never adds it up.")}
        htmlFor="capture-amount"
      >
        <input
          id="capture-amount"
          value={draft.amount}
          inputMode="decimal"
          autoComplete="off"
          maxLength={12}
          onChange={(event) => onChange({ ...draft, amount: event.target.value.replace(/[^\d.,]/g, "") })}
          className={INPUT}
        />
      </Field>
      <Field label="Note" hint="Why you kept it, in your own words. No account or file numbers." htmlFor="capture-note">
        <textarea
          id="capture-note"
          rows={3}
          value={draft.note}
          maxLength={MAX_NOTE}
          onChange={(event) => onChange({ ...draft, note: event.target.value })}
          className={INPUT}
        />
      </Field>
    </>
  );
}

const KINDS = Object.keys(ATTACH_KIND_LABEL) as AttachKind[];

/** Where a capture goes: a folder, and optionally one thing it is attached to. */
export function FilingFields({ draft, onChange }: { draft: CaptureDraft; onChange: (next: CaptureDraft) => void }) {
  const { folders } = useLibrary();
  const catalogue = useAttachCatalogue();
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [side, setSide] = useState<Side>("personal");
  const [problem, setProblem] = useState<string | null>(null);

  const target = parseAttach(draft.attach);
  const [kind, setKind] = useState<AttachKind | "">(target?.kind ?? "");
  const options = kind ? catalogue[kind] : [];

  async function addFolder() {
    const result = await library.addFolder(name, side);
    if (!result.ok) {
      setProblem(result.reason);
      return;
    }
    onChange({ ...draft, folderId: result.value.id });
    setAdding(false);
    setName("");
    setProblem(null);
  }

  return (
    <>
      <fieldset className="mt-5">
        <legend className="text-base font-semibold text-ink">Folder</legend>
        <p className="mt-0.5 text-base leading-relaxed text-muted">
          Folders live on this device. The shoebox is for anything not sorted yet.
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          {folders.map((folder) => (
            <Chip key={folder.id} on={draft.folderId === folder.id} onClick={() => onChange({ ...draft, folderId: folder.id })}>
              {folder.name}
              {folder.side === "community" ? " (community)" : ""}
            </Chip>
          ))}
          {!adding && (
            <Chip on={false} aria-pressed={undefined} onClick={() => setAdding(true)}>
              New folder
            </Chip>
          )}
        </div>
        {adding && (
          <div className="mt-3 rounded-2xl border border-line bg-card p-4">
            <label className="block text-base font-semibold text-ink" htmlFor="new-folder">
              Name the new folder
            </label>
            <input
              id="new-folder"
              value={name}
              maxLength={MAX_FOLDER_NAME}
              autoComplete="off"
              onChange={(event) => {
                setName(event.target.value);
                setProblem(null);
              }}
              className={INPUT}
            />
            <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Whose folder is it">
              {(["personal", "community"] as const).map((item) => (
                <Chip key={item} on={side === item} onClick={() => setSide(item)}>
                  {SIDE_LABEL[item]}
                </Chip>
              ))}
            </div>
            <Problem className="mt-3">{problem}</Problem>
            <div className="mt-3 flex flex-wrap gap-2">
              <Quiet onClick={addFolder}>Add the folder</Quiet>
              <Quiet onClick={() => setAdding(false)}>Cancel</Quiet>
            </div>
          </div>
        )}
      </fieldset>

      <fieldset className="mt-5">
        <legend className="text-base font-semibold text-ink">Attach it to something</legend>
        <p className="mt-0.5 text-base leading-relaxed text-muted">
          Optional. A capture can sit beside one tax flag, bequest item, receipt, structure, bench model, set of
          minutes or proposal.
        </p>
        <label className="sr-only" htmlFor="attach-kind">
          Kind of thing to attach to
        </label>
        <select
          id="attach-kind"
          value={kind}
          onChange={(event) => {
            const next = event.target.value as AttachKind | "";
            setKind(next);
            onChange({ ...draft, attach: "" });
          }}
          className={INPUT}
        >
          <option value="">Not attached. Keep it in the folder only.</option>
          {KINDS.map((item) => (
            <option key={item} value={item}>
              {ATTACH_KIND_LABEL[item]} ({SIDE_LABEL[ATTACH_KIND_SIDE[item]].toLowerCase()})
            </option>
          ))}
        </select>
        {kind && (
          <>
            <label className="sr-only" htmlFor="attach-item">
              Which {ATTACH_KIND_LABEL[kind].toLowerCase()}
            </label>
            {options.length === 0 ? (
              <p className="mt-2 text-base leading-relaxed text-muted">
                There is nothing of that kind on this device yet. Save the capture to its folder and attach it later.
              </p>
            ) : (
              <select
                id="attach-item"
                value={draft.attach}
                onChange={(event) => onChange({ ...draft, attach: event.target.value })}
                className={INPUT}
              >
                <option value="">Choose which one</option>
                {options.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            )}
          </>
        )}
        {draft.attach && target && (
          <p className="mt-2 flex flex-wrap items-center gap-2 text-base text-ink">
            <SideTag side={ATTACH_KIND_SIDE[target.kind]} className="py-0.5 text-xs" />
            {attachLabel(draft.attach, catalogue)}
          </p>
        )}
      </fieldset>
    </>
  );
}
