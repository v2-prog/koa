import "fake-indexeddb/auto";
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { emptyDraft, SHOEBOX_ID } from "./captures.ts";
import { folderFiles, zipFiles } from "./export.ts";
import { TFN_REFUSAL } from "./guards.ts";
import { memoryStore, openIdbStore, type RecordStore } from "./idb.ts";
import { createLibrary } from "./library.ts";

const TODAY = "2026-11-11";
let dbCount = 0;

const backends: [string, () => Promise<RecordStore>][] = [
  ["memory", async () => memoryStore()],
  ["IndexedDB", () => openIdbStore(indexedDB, `koa-test-${(dbCount += 1)}`)],
];

for (const [name, open] of backends) {
  describe(`the capture library on ${name}`, () => {
    it("starts with only the shoebox", async () => {
      const library = createLibrary(open);
      await library.load();
      const state = library.getState();
      assert.equal(state.ready, true);
      assert.deepEqual(state.folders.map((folder) => folder.id), [SHOEBOX_ID]);
      assert.deepEqual(state.captures, []);
    });

    it("saves a capture with its picture and reads both back after a restart", async () => {
      let shared: RecordStore | null = null;
      const openShared = async () => (shared ??= await open());
      const library = createLibrary(openShared);
      const folder = await library.addFolder("Tax papers", "personal");
      assert.ok(folder.ok);
      const saved = await library.addCapture(
        { ...emptyDraft(TODAY, folder.value.id, "tax:deduction"), title: " Work boots ", amount: "189.5" },
        { blob: new Blob(["picture bytes"], { type: "image/jpeg" }), name: "boots.jpg", type: "image/jpeg" },
      );
      assert.ok(saved.ok);
      assert.equal(saved.value.title, "Work boots");
      assert.equal(saved.value.amount, "189.50");
      assert.deepEqual(saved.value.file, { name: "boots.jpg", type: "image/jpeg", size: 13 });

      const again = createLibrary(openShared);
      await again.load();
      assert.deepEqual(again.getState().captures, [saved.value]);
      assert.deepEqual(again.getState().folders.map((item) => item.name), ["Shoebox", "Tax papers"]);
      const file = await again.fileFor(saved.value.id);
      assert.equal(file?.name, "boots.jpg");
      assert.equal(await file?.blob.text(), "picture bytes");
    });

    it("refuses to store an identifier, and stores nothing when it refuses", async () => {
      let shared: RecordStore | null = null;
      const openShared = async () => (shared ??= await open());
      const library = createLibrary(openShared);
      const refused = await library.addCapture(
        { ...emptyDraft(TODAY), title: "Notice", text: "Your TFN: 123 456 789" },
        { blob: new Blob(["x"]), name: "notice.jpg", type: "image/jpeg" },
      );
      assert.deepEqual(refused, { ok: false, reason: TFN_REFUSAL });
      assert.equal((await library.addCapture({ ...emptyDraft(TODAY), title: "ok" }, { blob: new Blob(["x"]), name: "tfn 123456789.jpg", type: "image/jpeg" })).ok, false);
      assert.equal((await library.addFolder("123 456 789", "personal")).ok, false);
      const store = await openShared();
      assert.deepEqual(await store.getAll("captures"), []);
      assert.deepEqual(await store.getAll("files"), []);
      assert.deepEqual(await store.getAll("folders"), []);
      // The store itself refuses too, whatever the caller checked.
      assert.deepEqual(await store.put("captures", { id: "cap-x", note: "tax file number 12" }), { ok: false, reason: TFN_REFUSAL });
    });

    it("edits, moves, drops the picture and removes", async () => {
      const library = createLibrary(open);
      const saved = await library.addCapture(
        { ...emptyDraft(TODAY), title: "Receipt" },
        { blob: new Blob(["x"]), name: "r.jpg", type: "image/jpeg" },
      );
      assert.ok(saved.ok);
      const folder = await library.addFolder("Street party", "community");
      assert.ok(folder.ok);
      const moved = await library.updateCapture(saved.value.id, { ...saved.value, folderId: folder.value.id, note: "For the party" });
      assert.ok(moved.ok);
      assert.equal(library.getState().captures[0].folderId, folder.value.id);
      assert.equal((await library.updateCapture(saved.value.id, { ...saved.value, note: "pin: 4821" })).ok, false);
      assert.equal(library.getState().captures[0].note, "For the party");

      const dropped = await library.dropFile(saved.value.id);
      assert.ok(dropped.ok);
      assert.equal(dropped.value.file, null);
      assert.equal(await library.fileFor(saved.value.id), null);

      await library.removeCapture(saved.value.id);
      assert.deepEqual(library.getState().captures, []);
    });

    it("puts a removed folder's captures back in the shoebox", async () => {
      const library = createLibrary(open);
      const folder = await library.addFolder("Old", "personal");
      assert.ok(folder.ok);
      await library.addCapture({ ...emptyDraft(TODAY, folder.value.id), title: "Kept" });
      assert.equal((await library.addFolder("old", "community")).ok, false);
      assert.equal((await library.removeFolder(SHOEBOX_ID)).ok, false);
      assert.equal((await library.changeFolder(SHOEBOX_ID, { name: "Box", side: "personal" })).ok, false);
      const renamed = await library.changeFolder(folder.value.id, { name: "Older", side: "community" });
      assert.ok(renamed.ok);
      assert.deepEqual(await library.removeFolder(folder.value.id), { ok: true, value: 1 });
      assert.equal(library.getState().captures[0].folderId, SHOEBOX_ID);
      assert.deepEqual(library.getState().folders.map((item) => item.id), [SHOEBOX_ID]);
    });

    it("erases everything", async () => {
      let shared: RecordStore | null = null;
      const openShared = async () => (shared ??= await open());
      const library = createLibrary(openShared);
      await library.addFolder("A", "personal");
      await library.addCapture({ ...emptyDraft(TODAY), title: "B" }, { blob: new Blob(["x"]), name: "b.jpg", type: "image/jpeg" });
      await library.erase();
      assert.deepEqual(library.getState().captures, []);
      const store = await openShared();
      for (const name of ["folders", "captures", "files"] as const) assert.deepEqual(await store.getAll(name), []);
    });

    it("exports a folder as notes and pictures, and as one zip", async () => {
      const library = createLibrary(open);
      const first = await library.addCapture(
        { ...emptyDraft(TODAY), title: "Receipt", amount: "5" },
        { blob: new Blob(["jpeg"]), name: "r.jpg", type: "image/jpeg" },
      );
      const second = await library.addCapture({ ...emptyDraft(TODAY), title: "Receipt" });
      assert.ok(first.ok && second.ok);
      const state = library.getState();
      const files = await folderFiles(state.folders[0], state.captures, library.fileFor, () => "Not attached");
      assert.deepEqual(
        files.map((file) => file.name).sort(),
        ["2026-11-11 Receipt (2).txt", "2026-11-11 Receipt.jpg", "2026-11-11 Receipt.txt", "contents.txt"],
      );
      const zip = new Uint8Array(await (await zipFiles(files)).arrayBuffer());
      assert.deepEqual([...zip.slice(0, 4)], [0x50, 0x4b, 0x03, 0x04]);
    });
  });
}
