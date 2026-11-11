import assert from "node:assert/strict";
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { after, describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { checkRules } from "./rules-check.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const made = [];

/** A copy of the project to break on purpose. */
function fixture() {
  const dir = mkdtempSync(join(tmpdir(), "koa-rules-"));
  made.push(dir);
  for (const part of ["src", "public/_headers", "scripts", "docs", "package.json", "README.md", "DEPLOY.md"]) {
    cpSync(join(ROOT, part), join(dir, part), { recursive: true });
  }
  return dir;
}

function edit(dir, rel, change) {
  const full = join(dir, rel);
  writeFileSync(full, change(readFileSync(full, "utf8")));
}

/** Adds a line inside the Home screen's JSX. */
function onHome(dir, jsx) {
  edit(dir, "src/routes/index.tsx", (text) => text.replace('<Heading>Four jobs</Heading>', `${jsx}\n      <Heading>Four jobs</Heading>`));
}

async function brokenBy(dir, expected) {
  const problems = await checkRules(dir);
  assert.ok(
    problems.some((problem) => expected.test(problem)),
    `expected a problem matching ${expected}, got:\n${problems.join("\n") || "(none)"}`,
  );
}

after(() => {
  for (const dir of made) rmSync(dir, { recursive: true, force: true });
});

describe("rules check", () => {
  it("passes on the project as it is", async () => {
    assert.deepEqual(await checkRules(ROOT), []);
  });

  it("fails when a screen promises a saving", async () => {
    const dir = fixture();
    onHome(dir, "<p>You could save a lot this year.</p>");
    await brokenBy(dir, /what they will save/);
  });

  it("fails when a screen prints a dollar figure or a rate", async () => {
    const dir = fixture();
    onHome(dir, "<p>Worth $40 to you.</p>");
    await brokenBy(dir, /dollar figure/);
    const other = fixture();
    onHome(other, "<p>Grows 5% a year.</p>");
    await brokenBy(other, /rate or a percentage/);
  });

  it("fails when a field for an identifier is added", async () => {
    const dir = fixture();
    onHome(dir, '<input id="tfn" />');
    await brokenBy(dir, /field for an identifier/);
    const other = fixture();
    onHome(other, '<input type="password" />');
    await brokenBy(other, /password field/);
  });

  it("fails when product code makes a network call", async () => {
    for (const call of ['fetch("/api/sync")', "new WebSocket(url)", "navigator.sendBeacon(url)", 'import("https://cdn.example/x.js")']) {
      const dir = fixture();
      edit(dir, "src/lib/ai/simplify.ts", (text) => `${text}\nexport const leak = () => ${call};\n`);
      await brokenBy(dir, /network calls|another host/);
    }
  });

  it("fails when a model or analytics host is named", async () => {
    const dir = fixture();
    edit(dir, "src/lib/ai/simplify.ts", (text) => `${text}\nconst MODEL = "huggingface.co/some-model";\n`);
    await brokenBy(dir, /model, CDN or analytics host/);
  });

  it("fails when a cloud package is added", async () => {
    const dir = fixture();
    edit(dir, "package.json", (text) => {
      const pkg = JSON.parse(text);
      pkg.dependencies.openai = "^4.0.0";
      return JSON.stringify(pkg, null, 2);
    });
    await brokenBy(dir, /"openai" is not on the allowed list/);
  });

  it("fails when a screen drops the notice", async () => {
    const dir = fixture();
    edit(dir, "src/routes/tax.tsx", (text) => text.replaceAll("<GeneralInfo", "<Card"));
    await brokenBy(dir, /tax\.tsx: every screen must show the general-information notice/);
  });

  it("fails when the footer drops the general-information line", async () => {
    const dir = fixture();
    edit(dir, "src/components/shell.tsx", (text) => text.replace("General information, not tax, legal or financial advice", "Have fun"));
    await brokenBy(dir, /footer must carry/);
  });

  it("fails when green is used for anything but the primary action", async () => {
    const dir = fixture();
    onHome(dir, '<p className="bg-leaf">Second green</p>');
    await brokenBy(dir, /green is reserved/);
    const other = fixture();
    onHome(other, '<p className="text-emerald-700">Another green</p>');
    await brokenBy(other, /green is reserved/);
  });

  it("fails when something writes to the device without the guard", async () => {
    const dir = fixture();
    edit(dir, "src/lib/ai/simplify.ts", (text) => `${text}\nexport const sneak = () => localStorage.setItem("x", "y");\n`);
    await brokenBy(dir, /only src\/lib\/local-store\.ts may use browser storage/);
    const other = fixture();
    edit(other, "src/lib/idb.ts", (text) => text.replaceAll("deepRefusal(value)", "null"));
    await brokenBy(other, /idb\.ts: every write must be checked/);
  });

  it("fails when shipped text looks like an identifier", async () => {
    const dir = fixture();
    edit(dir, "src/data/guide.ts", (text) => text.replace('line: "Children learn money by watching it move."', 'line: "Example TFN 123 456 789"'));
    await brokenBy(dir, /shipped text looks like an identifier/);
  });

  it("fails when a VERIFY label does not say who checks", async () => {
    const dir = fixture();
    onHome(dir, "<Verify>State rules differ.</Verify>");
    await brokenBy(dir, /VERIFY label must say who checks/);
  });

  it("fails when the security policy drifts or lets another host in", async () => {
    const dir = fixture();
    edit(dir, "public/_headers", (text) => text.replace("connect-src 'self';", "connect-src 'self' https://api.example.com;"));
    await brokenBy(dir, /_headers: must carry the content-security policy/);
    const other = fixture();
    edit(other, "scripts/csp.mjs", (text) => text.replace(`["connect-src", "'self'"]`, `["connect-src", "*"]`));
    await brokenBy(other, /may name no other host/);
  });

  it("fails when the README stops saying what koa is not", async () => {
    const dir = fixture();
    edit(dir, "README.md", (text) => text.replaceAll(/not a tax calculator/gi, "a helpful tool"));
    await brokenBy(dir, /README\.md: must say "not a tax calculator"/);
  });

  it("lets a rule be explained in a comment", async () => {
    const dir = fixture();
    edit(dir, "src/lib/ai/simplify.ts", (text) => `// Never fetch() anything, and never print $5 or say you could save.\n${text}`);
    assert.deepEqual(await checkRules(dir), []);
  });
});
