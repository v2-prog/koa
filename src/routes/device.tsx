import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { ConfirmClear, GeneralInfo, Heading, Notice, Primary, Screen, Warn } from "@/components/ui";
import { stopReader } from "@/lib/ai/ocr";
import { buildBackup } from "@/lib/backup";
import { todayISO } from "@/lib/dates";
import { saveFile } from "@/lib/export";
import { readAll, removeAll, storedKeys } from "@/lib/local-store";
import { library, useLibrary } from "@/lib/stores";

export const Route = createFileRoute("/device")({ component: DevicePage });

const KEY_LABEL: Record<string, string> = {
  ledger: "The demo ledger, its receipts and the community proposals",
  bequest: "The bequest support pack",
  tax: "The tax questions",
  minutes: "Meeting minutes",
  rings: "Life-stage rings",
};

function DevicePage() {
  const { captures, folders, durable } = useLibrary();
  const [keys, setKeys] = useState(() => storedKeys());
  const [status, setStatus] = useState<string | null>(null);
  const pictures = captures.filter((capture) => capture.file).length;

  return (
    <Screen
      side="both"
      kicker="This device"
      title="What stays on this device"
      intro="Everything you write in koa is kept in this browser on this device. There is no account, and nothing is sent to a server."
    >
      <Heading className="mt-8">Kept here now</Heading>
      <ul className="mt-3 grid gap-2 text-base leading-relaxed text-ink">
        {keys.length === 0 && <li>Nothing written yet.</li>}
        {keys.map((key) => (
          <li key={key} className="rounded-2xl border border-line bg-card px-4 py-3">
            {KEY_LABEL[key] ?? key}
          </li>
        ))}
        <li className="rounded-2xl border border-line bg-card px-4 py-3">
          {captures.length} {captures.length === 1 ? "capture" : "captures"} in {folders.length}{" "}
          {folders.length === 1 ? "folder" : "folders"}, with {pictures} {pictures === 1 ? "picture" : "pictures"} kept
        </li>
      </ul>
      {!durable && <Warn className="mt-4">This browser is not keeping captures after the tab closes. It may be in private mode.</Warn>}

      <Heading>How the helpers work</Heading>
      <ul className="mt-3 grid gap-3 text-base leading-relaxed text-ink">
        <li>
          <span className="font-semibold">Reading a picture.</span> A text reader (Tesseract, compiled to run in a
          browser) is part of this app. It loads from koa's own files the first time you capture something, and
          the picture is read inside this page.
        </li>
        <li>
          <span className="font-semibold">Before you see the words,</span> numbers that look like identifiers are
          taken out. A picture that seems to show a tax file number or bank details is not kept at all.
        </li>
        <li>
          <span className="font-semibold">Simplify this note</span> picks the key sentences from your own note and
          swaps stiff words for plain ones, using rules inside the app. It does not write new sentences.
        </li>
        <li>
          <span className="font-semibold">Explain this</span> shows everyday explanations written into the app.
          Nothing is looked up.
        </li>
      </ul>
      <Notice className="mt-4">
        The page's own security setting tells the browser to refuse any connection to another site. Links to the
        ATO and other public pages open only when you press them.
      </Notice>

      <Heading>Save a copy</Heading>
      <p className="mt-2 text-base leading-relaxed text-muted">
        One text file with everything written in koa. Pictures are not in it: save those folder by folder.
      </p>
      <Primary
        className="mt-4"
        onClick={() => {
          const text = buildBackup(readAll(), { folders, captures }, todayISO());
          saveFile(new Blob([text], { type: "application/json" }), `koa copy ${todayISO()}.json`);
          setStatus("The copy was handed to the browser to save. It stays wherever you put it.");
        }}
      >
        Save a copy of what is written
      </Primary>
      {status && (
        <p className="mt-3 text-base text-ink" role="status">
          {status}
        </p>
      )}

      <Heading>Erase</Heading>
      <p className="mt-2 text-base leading-relaxed text-muted">
        Clears everything koa has kept in this browser: the ledger, the packs, the minutes, the rings, every folder,
        every capture and every picture.
      </p>
      <ConfirmClear
        className="mt-3"
        ask="Erase everything from this device"
        body="Erase everything koa has kept in this browser? This cannot be undone. Save a copy first if you want one."
        confirm="Erase everything"
        onConfirm={async () => {
          removeAll();
          await library.erase();
          await stopReader();
          setKeys(storedKeys());
          setStatus("Everything koa kept in this browser has been erased.");
        }}
      />

      <GeneralInfo>
        koa is not a bank, a chain, a yield product, a share offer, a will or a tax calculator, and it is not a
        place for identifiers.
      </GeneralInfo>
    </Screen>
  );
}
