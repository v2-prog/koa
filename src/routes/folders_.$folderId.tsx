import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronRight, Paperclip } from "lucide-react";
import { useState } from "react";
import { Chip, ConfirmClear, Field, GeneralInfo, Heading, INPUT, Notice, primaryLink, Problem, Quiet, QUIET_LINK, Rows, Screen, TEXT_LINK } from "@/components/ui";
import { attachLabel, capturesIn, MAX_FOLDER_NAME, safeFileName, SIDE_LABEL, type Side } from "@/lib/captures";
import { formatDate } from "@/lib/dates";
import { canPickFolder, folderFiles, saveFile, saveIntoPickedFolder, zipFiles } from "@/lib/export";
import { library, useAttachCatalogue, useLibrary } from "@/lib/stores";

export const Route = createFileRoute("/folders_/$folderId")({ component: FolderPage });

function FolderPage() {
  const { folderId } = Route.useParams();
  const navigate = Route.useNavigate();
  const { folders, captures, ready } = useLibrary();
  const catalogue = useAttachCatalogue();
  const folder = folders.find((item) => item.id === folderId);
  const inside = capturesIn(captures, folderId);

  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [side, setSide] = useState<Side>("personal");
  const [problem, setProblem] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!folder) {
    return (
      <Screen side="both" kicker="Folders" title={ready ? "That folder is not on this device" : "Opening the folder"}>
        {ready && (
          <>
            <p className="mt-3 text-lg leading-relaxed text-muted">It may have been removed, or made on another device.</p>
            <Link to="/folders" {...primaryLink("mt-6")}>
              Open the folders
            </Link>
          </>
        )}
        <GeneralInfo />
      </Screen>
    );
  }

  async function exportFolder(how: "folder" | "zip") {
    if (!folder) return;
    setBusy(true);
    setStatus(null);
    try {
      const files = await folderFiles(folder, inside, library.fileFor, (capture) => attachLabel(capture.attach, catalogue));
      if (how === "folder") {
        const result = await saveIntoPickedFolder(files);
        setStatus(result === "saved" ? `Saved ${files.length} files into the folder you chose.` : "Nothing was saved.");
      } else {
        saveFile(await zipFiles(files), `${safeFileName(folder.name, "koa folder")}.zip`);
        setStatus(`Handed ${files.length} files to the browser as one zip file.`);
      }
    } catch {
      setStatus("The browser would not save those files. Try the other way of saving.");
    } finally {
      setBusy(false);
    }
  }

  async function rename() {
    const result = await library.changeFolder(folderId, { name, side });
    if (!result.ok) {
      setProblem(result.reason);
      return;
    }
    setEditing(false);
    setProblem(null);
  }

  return (
    <Screen
      side={folder.side}
      kicker="Folder"
      title={folder.name}
      intro={
        folder.fixed
          ? "The shoebox holds anything not sorted into a folder yet."
          : `A ${SIDE_LABEL[folder.side].toLowerCase()} folder on this device.`
      }
    >
      <Link to="/capture" search={{ folder: folder.id }} {...primaryLink("mt-6")}>
        Capture into {folder.name}
      </Link>

      <Heading className="mt-8">
        {inside.length === 0 ? "Nothing here yet" : `${inside.length} ${inside.length === 1 ? "capture" : "captures"}`}
      </Heading>
      {inside.length === 0 ? (
        <p className="mt-2 text-base leading-relaxed text-muted">Capture a receipt or a document into this folder, or move one here from another folder.</p>
      ) : (
        <Rows className="mt-3">
          {inside.map((capture) => (
            <li key={capture.id}>
              <Link
                to="/captures/$captureId"
                params={{ captureId: capture.id }}
                className="flex min-h-16 items-center gap-3 px-4 py-3 hover:bg-paper-deep"
              >
                <span className="min-w-0 flex-1">
                  <span className="block text-lg font-semibold text-ink">{capture.title}</span>
                  <span className="block text-base text-muted">
                    {formatDate(capture.date)}
                    {capture.amount ? `, ${capture.amount} as printed` : ""}
                    {capture.file ? ", picture kept" : ""}
                  </span>
                  {capture.attach && (
                    <span className="mt-0.5 flex items-center gap-1.5 text-base text-ink">
                      <Paperclip className="size-4 shrink-0" aria-hidden="true" />
                      {attachLabel(capture.attach, catalogue)}
                    </span>
                  )}
                </span>
                <ChevronRight className="size-5 shrink-0 text-muted" aria-hidden="true" />
              </Link>
            </li>
          ))}
        </Rows>
      )}

      {inside.length > 0 && (
        <>
          <Heading>Save this folder off the device</Heading>
          <p className="mt-2 text-base leading-relaxed text-muted">
            Each capture becomes a text note, with its picture beside it if one was kept, plus a contents list.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {canPickFolder() && (
              <Quiet disabled={busy} onClick={() => exportFolder("folder")}>
                Save into a folder I choose
              </Quiet>
            )}
            <Quiet disabled={busy} onClick={() => exportFolder("zip")}>
              Save as one zip file
            </Quiet>
          </div>
          {status && (
            <p className="mt-3 text-base text-ink" role="status">
              {status}
            </p>
          )}
          <Notice className="mt-4">
            The files go only where you save them. Check them before you send them to anyone.
          </Notice>
        </>
      )}

      {!folder.fixed && (
        <>
          <Heading>Change this folder</Heading>
          {editing ? (
            <>
              <Field label="Folder name" htmlFor="rename">
                <input id="rename" value={name} maxLength={MAX_FOLDER_NAME} onChange={(event) => setName(event.target.value)} className={INPUT} />
              </Field>
              <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Whose folder is it">
                {(["personal", "community"] as const).map((item) => (
                  <Chip key={item} on={side === item} onClick={() => setSide(item)}>
                    {SIDE_LABEL[item]}
                  </Chip>
                ))}
              </div>
              <Problem>{problem}</Problem>
              <div className="mt-4 flex flex-wrap gap-2">
                <Quiet onClick={rename}>Save the change</Quiet>
                <Quiet onClick={() => setEditing(false)}>Cancel</Quiet>
              </div>
            </>
          ) : (
            <Quiet
              className="mt-3"
              onClick={() => {
                setName(folder.name);
                setSide(folder.side);
                setEditing(true);
              }}
            >
              Rename or move to the other side
            </Quiet>
          )}
          <ConfirmClear
            ask="Remove this folder"
            body={`Remove ${folder.name}? ${inside.length > 0 ? "Its captures go back to the shoebox. Nothing in them is lost." : "It is empty."}`}
            confirm="Remove the folder"
            onConfirm={async () => {
              await library.removeFolder(folderId);
              await navigate({ to: "/folders" });
            }}
          />
        </>
      )}

      <p className="mt-8">
        <Link to="/folders" className={TEXT_LINK}>
          All folders
        </Link>
      </p>
      <p className="mt-2">
        <Link to="/device" className={QUIET_LINK}>
          What stays on this device
        </Link>
      </p>
      <GeneralInfo />
    </Screen>
  );
}
