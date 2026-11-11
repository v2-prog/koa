import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronRight, Search } from "lucide-react";
import { useState } from "react";
import { Chip, Field, GeneralInfo, Heading, INPUT, Notice, Primary, Problem, Rows, Screen, SideTag, TEXT_LINK, Warn } from "@/components/ui";
import { capturesIn, MAX_FOLDER_NAME, searchCaptures, SIDE_LABEL, type Folder, type Side } from "@/lib/captures";
import { formatDate } from "@/lib/dates";
import { library, useLibrary } from "@/lib/stores";

export const Route = createFileRoute("/folders")({ component: FoldersPage });

function FolderRow({ folder, count }: { folder: Folder; count: number }) {
  return (
    <li>
      <Link
        to="/folders/$folderId"
        params={{ folderId: folder.id }}
        className="flex min-h-16 items-center gap-3 px-4 py-3.5 hover:bg-paper-deep"
      >
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-2">
            <span className="text-lg font-semibold text-ink">{folder.name}</span>
            <SideTag side={folder.side} className="py-0.5 text-xs" />
          </span>
          <span className="mt-0.5 block text-base text-muted">
            {count === 0 ? "Empty" : `${count} ${count === 1 ? "capture" : "captures"}`}
            {folder.fixed ? ". For anything not sorted yet." : ""}
          </span>
        </span>
        <ChevronRight className="size-5 shrink-0 text-muted" aria-hidden="true" />
      </Link>
    </li>
  );
}

function FoldersPage() {
  const { folders, captures, ready, durable } = useLibrary();
  const [query, setQuery] = useState("");
  const [name, setName] = useState("");
  const [side, setSide] = useState<Side>("personal");
  const [problem, setProblem] = useState<string | null>(null);
  const [added, setAdded] = useState<string | null>(null);

  const personal = folders.filter((folder) => folder.side === "personal");
  const community = folders.filter((folder) => folder.side === "community");
  const found = query.trim() ? searchCaptures(captures, query) : [];
  const folderName = (id: string) => folders.find((folder) => folder.id === id)?.name ?? "Shoebox";

  async function add() {
    const result = await library.addFolder(name, side);
    if (!result.ok) {
      setProblem(result.reason);
      setAdded(null);
      return;
    }
    setAdded(result.value.name);
    setName("");
    setProblem(null);
  }

  return (
    <Screen
      side="both"
      kicker="Folders"
      title="Folders on this device"
      intro="Personal folders hold your own papers. Community folders hold a group's. Both live in this browser and nowhere else."
    >
      {!durable && (
        <Warn className="mt-4">
          This browser will not keep folders after the tab closes. It may be in private mode.
        </Warn>
      )}

      <div className="mt-5">
        <label htmlFor="search" className="block text-base font-semibold text-ink">
          Find a capture
        </label>
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-4 mt-0.75 size-5 -translate-y-1/2 text-muted" aria-hidden="true" />
          <input
            id="search"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="A shop, a word on the paper, a month"
            className={`${INPUT} pl-12`}
          />
        </div>
      </div>

      {query.trim() ? (
        <section aria-live="polite">
          <p className="mt-4 text-base text-muted">
            {found.length === 0 ? "Nothing on this device matches." : `${found.length} ${found.length === 1 ? "match" : "matches"}`}
          </p>
          {found.length > 0 && (
            <Rows className="mt-2">
              {found.map((capture) => (
                <li key={capture.id}>
                  <Link
                    to="/captures/$captureId"
                    params={{ captureId: capture.id }}
                    className="flex min-h-14 items-center gap-3 px-4 py-3 hover:bg-paper-deep"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block text-lg font-semibold text-ink">{capture.title}</span>
                      <span className="block text-base text-muted">
                        {formatDate(capture.date)}, in {folderName(capture.folderId)}
                      </span>
                    </span>
                    <ChevronRight className="size-5 shrink-0 text-muted" aria-hidden="true" />
                  </Link>
                </li>
              ))}
            </Rows>
          )}
        </section>
      ) : (
        <>
          <Heading className="mt-8">Personal</Heading>
          <Rows className="mt-3">
            {personal.map((folder) => (
              <FolderRow key={folder.id} folder={folder} count={capturesIn(captures, folder.id).length} />
            ))}
          </Rows>

          <Heading className="mt-8">Community</Heading>
          {community.length === 0 ? (
            <p className="mt-2 text-base leading-relaxed text-muted">
              No community folders yet. Make one for a club, a street or a co-op, and keep its receipts apart from
              your own.
            </p>
          ) : (
            <Rows className="mt-3">
              {community.map((folder) => (
                <FolderRow key={folder.id} folder={folder} count={capturesIn(captures, folder.id).length} />
              ))}
            </Rows>
          )}
        </>
      )}

      <Heading className="mt-10">Make a folder</Heading>
      <Field label="Folder name" hint="Such as Tax papers, Nan's will papers, or Street party." htmlFor="folder-name">
        <input
          id="folder-name"
          value={name}
          maxLength={MAX_FOLDER_NAME}
          autoComplete="off"
          onChange={(event) => {
            setName(event.target.value);
            setProblem(null);
            setAdded(null);
          }}
          className={INPUT}
        />
      </Field>
      <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Whose folder is it">
        {(["personal", "community"] as const).map((item) => (
          <Chip key={item} on={side === item} onClick={() => setSide(item)}>
            {SIDE_LABEL[item]}
          </Chip>
        ))}
      </div>
      <Problem>{problem}</Problem>
      {added && (
        <p className="mt-4 text-base font-medium text-ink" role="status">
          {added} is ready.
        </p>
      )}
      <Primary className="mt-5" disabled={!ready} onClick={add}>
        Make the folder
      </Primary>

      <Notice className="mt-8">
        A folder here is not a folder on your phone or computer. To get one off this device, open it and save it
        as files. Nothing leaves unless you do that yourself.
      </Notice>
      <p className="mt-4">
        <Link to="/capture" className={TEXT_LINK}>
          Capture a receipt or document
        </Link>
      </p>

      <GeneralInfo />
    </Screen>
  );
}
