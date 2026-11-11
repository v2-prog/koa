import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
import { TFN_REFUSAL } from "./guards.ts";
import { noteExternalChange, PREFIX, readAll, readRaw, remove, removeAll, setStorage, snapshot, storedKeys, subscribe, write, type StorageLike } from "./local-store.ts";

function fakeStorage(): StorageLike & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    get length() {
      return data.size;
    },
    key: (index) => [...data.keys()][index] ?? null,
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => void data.set(key, value),
    removeItem: (key) => void data.delete(key),
  };
}

describe("the local store", () => {
  let storage = fakeStorage();
  beforeEach(() => {
    storage = fakeStorage();
    setStorage(storage);
  });

  it("writes under the koa prefix and reads back", () => {
    assert.deepEqual(write("rings", [{ label: "Ana" }]), { ok: true });
    assert.equal(storage.data.get(`${PREFIX}rings`), '[{"label":"Ana"}]');
    assert.deepEqual(readRaw("rings"), [{ label: "Ana" }]);
    assert.deepEqual(storedKeys(), ["rings"]);
    assert.deepEqual(readAll(), { rings: [{ label: "Ana" }] });
  });

  it("refuses to write an identifier and leaves what was there", () => {
    write("bequest", { notes: "fine" });
    assert.deepEqual(write("bequest", { notes: "TFN 123 456 789" }), { ok: false, reason: TFN_REFUSAL });
    assert.deepEqual(readRaw("bequest"), { notes: "fine" });
    assert.deepEqual(snapshot("bequest", (stored) => stored), { notes: "fine" });
  });

  it("tells listeners when a value changes", () => {
    let calls = 0;
    const stop = subscribe("tax", () => (calls += 1));
    write("tax", { drafts: 1 });
    remove("tax");
    stop();
    write("tax", { drafts: 2 });
    assert.equal(calls, 2);
  });

  it("revives once and then serves the same object", () => {
    let revived = 0;
    const revive = (stored: unknown) => {
      revived += 1;
      return stored ?? { fresh: true };
    };
    assert.equal(snapshot("ledger", revive), snapshot("ledger", revive));
    assert.equal(revived, 1);
    storage.data.set(`${PREFIX}ledger`, '{"fresh":false}');
    noteExternalChange(`${PREFIX}ledger`);
    assert.deepEqual(snapshot("ledger", revive), { fresh: false });
  });

  it("removes everything koa wrote and nothing else", () => {
    storage.data.set("someone-else", "1");
    write("a", 1);
    write("b", 2);
    removeAll();
    assert.deepEqual(storedKeys(), []);
    assert.equal(storage.data.get("someone-else"), "1");
  });

  it("stays usable with no storage at all", () => {
    setStorage(null);
    assert.deepEqual(write("a", { ok: 1 }), { ok: true });
    assert.deepEqual(snapshot("a", () => "fallback"), { ok: 1 });
    assert.deepEqual(storedKeys(), []);
  });
});
