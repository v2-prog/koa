#!/usr/bin/env node
/**
 * Hard-rule gate for koa. The build fails if any of these breaks.
 *
 *   node scripts/rules-check.mjs [--root <dir>] [--dist]
 *
 * The rules come from the brief koa is built to, and they are the kind that
 * erode quietly: a later pass adds "you could save" to a flag, a field for a
 * tax file number, a fetch to a model API, or a second green button. This
 * reads the source and fails if any of them has crept in.
 *
 * With --dist it also checks the built site in dist/: the security policy is
 * in the page, nothing loads from another host, and the on-device reader's
 * files are present and small enough for the host.
 */
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

/* ------------------------------------------------------------- the rules */

/** Everything a person sees or that runs in their browser. */
const PRODUCT_DIRS = ["src"];
const SKIP = [/\.test\.tsx?$/, /routeTree\.gen\.ts$/, /vite-env\.d\.ts$/];

const FORBIDDEN = [
  { pattern: /you(?:'ll| will| would| could| can| may| might) save\b/i, why: "never tell a person what they will save" },
  { pattern: /\b(?:save|saving|savings) of\s+(?:up to\s+)?\d/i, why: "never promise a saving" },
  { pattern: /\$\s?\d/, why: "do not print a dollar figure" },
  { pattern: /\b\d+(?:\.\d+)?\s?(?:%|per ?cent\b)/i, why: "do not print a rate or a percentage" },
  {
    pattern: /\b(?:fetch|XMLHttpRequest|WebSocket|EventSource|sendBeacon|RTCPeerConnection)\s*\(|\bnew\s+(?:XMLHttpRequest|WebSocket|EventSource|RTCPeerConnection)\b|\baxios\b|navigator\.sendBeacon/,
    why: "no network calls from product code",
  },
  { pattern: /\bimport\s*\(\s*["'`]https?:/, why: "no code loaded from another host" },
  { pattern: /\b(?:id|name|htmlFor)=["'][^"']*(?:tfn|tax-?file|bsb|account-?n(?:o|umber)|member-?n(?:o|umber)|medicare|password|passcode|card-?n(?:o|umber))[^"']*["']/i, why: "no field for an identifier" },
  { pattern: /type=["']password["']/, why: "no login or password field" },
  { pattern: /autoComplete=["'](?:cc-|current-password|new-password|one-time-code)/i, why: "no card or login autofill" },
  { pattern: /\b(?:connectWallet|window\.ethereum|walletconnect|web3)\b/i, why: "do not connect a wallet" },
  { pattern: /\b(?:bg|text|border|ring|fill|stroke|from|to|via|accent|outline|decoration)-(?:green|emerald|lime|teal)-\d/, why: "green is reserved for the one primary action" },
  {
    pattern: /(?<!\b(?:not|never|no|nor)\s)\b(?:earns?|earning|pays?|paying|receive|get|gets)\s+(?:a\s+|an\s+|some\s+)?(?:yield|dividends?|returns?|apy|apr)\b|\b(?:apy|guaranteed returns?|passive income)\b/i,
    why: "koa is not a yield product",
  },
  { pattern: /[\w.+-]+@[\w-]+\.(?:com|net|org|au|io)\b/i, why: "no email addresses or personal data in the source" },
];

/** Hosts a model or analytics client would call. None may appear in the app. */
const BANNED_HOSTS = /\b(?:api\.openai\.com|api\.anthropic\.com|generativelanguage\.googleapis\.com|huggingface\.co|cdn\.jsdelivr\.net|unpkg\.com|googletagmanager|google-analytics|sentry\.io|segment\.io|posthog|mixpanel)\b/i;

/** Only these files may hold web addresses, and only as links a person presses. */
const URL_FILES = [
  /^src\/data\/(?:bench|rooms|structures|glossary|guide)\.ts$/,
  /^src\/lib\/tax\.ts$/,
];

/** Leaf green, the primary-action colour, may appear only on this one line. */
const LEAF = /\b(?:bg|text|border|ring|fill|stroke|from|to|via|accent|outline|decoration)-leaf\b|--color-leaf|var\(--color-leaf\)/;
const LEAF_HOME = { file: "src/components/ui.tsx", line: /^const PRIMARY_CLASS = / };

/** The only modules allowed to write to the device, each guarded. */
const WRITERS = [
  { api: /\b(?:localStorage|sessionStorage)\s*[.[]/, home: "src/lib/local-store.ts", why: "only src/lib/local-store.ts may use browser storage" },
  { api: /\bindexedDB\b|\bIDBFactory\b/, home: "src/lib/idb.ts", why: "only src/lib/idb.ts may use IndexedDB" },
  { api: /\bcaches\s*\.|\bnavigator\.serviceWorker\b|\bdocument\.cookie\b/, home: null, why: "no other storage: no caches, service workers or cookies" },
];

/** What the README has to say the app is not, and the device guarantee. */
const README_MUST_SAY = [
  "not a bank",
  "not a chain",
  "not a yield product",
  "not a share offer",
  "not a will",
  "not a tax calculator",
  "not a place for identifiers",
  "not a binding nomination",
  "not tax, legal or financial advice",
  "what stays on this device",
  "tax.koa.au",
  "q units",
  "woods",
];

/** The only packages koa may ship. A cloud AI client would have to be added here first. */
const ALLOWED_DEPENDENCIES = [
  "@fontsource-variable/figtree",
  "@fontsource-variable/fraunces",
  "@tanstack/react-router",
  "@tesseract.js-data/eng",
  "lucide-react",
  "react",
  "react-dom",
  "tesseract.js",
];

const OCR_DIST_FILES = [
  "ocr/worker.min.js",
  "ocr/core/tesseract-core-lstm.wasm.js",
  "ocr/core/tesseract-core-simd-lstm.wasm.js",
  "ocr/core/tesseract-core-relaxedsimd-lstm.wasm.js",
  "ocr/lang/eng.traineddata.gz",
];

/** Cloudflare Pages limits. */
const MAX_FILE_BYTES = 25 * 1024 * 1024;
const MAX_FILES = 20_000;

/* ----------------------------------------------------------------- helpers */

function walk(root, rel) {
  const full = join(root, rel);
  if (!existsSync(full)) return [];
  if (statSync(full).isFile()) return [rel];
  return readdirSync(full, { withFileTypes: true }).flatMap((entry) => walk(root, join(rel, entry.name)));
}

const posix = (path) => path.split(sep).join("/");

function productFiles(root) {
  return PRODUCT_DIRS.flatMap((dir) => walk(root, dir))
    .map(posix)
    .filter((rel) => /\.(?:ts|tsx|mjs|js|css|html)$/.test(rel) && !SKIP.some((skip) => skip.test(rel)));
}

/** Strips comments so a rule can be explained in a comment without tripping it. */
function code(line) {
  return line.replace(/^\s*(?:\/\/|\*|\/\*).*$/, "").replace(/\s\/\/\s.*$/, "");
}

/** The policy of the project being checked, not of this script's own copy. */
async function loadCsp(root) {
  return import(pathToFileURL(join(root, "scripts/csp.mjs")).href);
}

/* ------------------------------------------------------------------ source */

/** Returns a list of human-readable problems. Empty means the rules hold. */
export async function checkRules(root) {
  const problems = [];
  const files = productFiles(root);
  const scripts = files.filter((rel) => /\.(?:ts|tsx)$/.test(rel));

  let findIdentifier = null;
  const guards = join(root, "src/lib/guards.ts");
  if (existsSync(guards)) {
    try {
      ({ findIdentifier } = await import(pathToFileURL(guards).href));
    } catch {
      problems.push("src/lib/guards.ts: could not be loaded to check the shipped text");
    }
  } else {
    problems.push("src/lib/guards.ts: the identifier guard is missing");
  }

  for (const rel of scripts) {
    const text = readFileSync(join(root, rel), "utf8");
    const lines = text.split("\n");
    lines.forEach((raw, index) => {
      const line = code(raw);
      const at = `${rel}:${index + 1}`;
      for (const rule of FORBIDDEN) {
        if (rule.allowIn?.some((allow) => allow.test(rel))) continue;
        if (rule.pattern.test(line)) problems.push(`${at}: ${rule.why}`);
      }
      if (BANNED_HOSTS.test(raw)) problems.push(`${at}: no model, CDN or analytics host`);
      if (/https?:\/\//.test(line) && !URL_FILES.some((allow) => allow.test(rel))) {
        problems.push(`${at}: web addresses belong in the data files, as links a person presses`);
      }
      if (LEAF.test(line) && !(rel === LEAF_HOME.file && LEAF_HOME.line.test(raw))) {
        problems.push(`${at}: green is reserved for the one primary action (use <Primary> or primaryLink())`);
      }
      for (const writer of WRITERS) {
        if (writer.api.test(line) && rel !== writer.home && !/storageArea === window\.localStorage/.test(line)) {
          problems.push(`${at}: ${writer.why}`);
        }
      }
      // Shipped text: no string in the app may itself look like an identifier.
      if (findIdentifier && !/^src\/lib\/(?:guards|ai\/receipt-parse)\.ts$/.test(rel)) {
        for (const match of line.matchAll(/(["'`])((?:\\.|(?!\1).){6,}?)\1/g)) {
          if (findIdentifier(match[2])) problems.push(`${at}: shipped text looks like an identifier`);
        }
      }
    });
  }

  // Every write to the device goes through the identifier guard.
  for (const [rel, call] of [
    ["src/lib/local-store.ts", "deepRefusal(value)"],
    ["src/lib/idb.ts", "deepRefusal(value)"],
  ]) {
    const full = join(root, rel);
    if (!existsSync(full) || !readFileSync(full, "utf8").includes(call)) {
      problems.push(`${rel}: every write must be checked with ${call}`);
    }
  }

  // The leaf colour is defined once and used once.
  const ui = join(root, LEAF_HOME.file);
  if (!existsSync(ui) || !readFileSync(ui, "utf8").split("\n").some((line) => LEAF_HOME.line.test(line) && /bg-leaf/.test(line))) {
    problems.push(`${LEAF_HOME.file}: the primary action must be the one place leaf green is used`);
  }
  if (!readFileSync(join(root, "src/styles.css"), "utf8").includes("--color-leaf")) {
    problems.push("src/styles.css: the leaf colour must stay defined");
  }

  // Every screen shows the general-information notice.
  const routes = files.filter((rel) => /^src\/routes\/.+\.tsx$/.test(rel));
  if (routes.length < 15) problems.push("src/routes: screens are missing");
  for (const rel of routes) {
    const text = readFileSync(join(root, rel), "utf8");
    if (!text.includes("<GeneralInfo")) problems.push(`${rel}: every screen must show the general-information notice`);
    for (const match of text.matchAll(/<Verify\b[^>]*>/gs)) {
      if (!/\bwho=/.test(match[0])) problems.push(`${rel}: a VERIFY label must say who checks`);
    }
    if (rel !== "src/routes/__root.tsx" && rel !== "src/routes/index.tsx" && !/<Screen\b/.test(text)) {
      problems.push(`${rel}: screens use <Screen> so the way back to Home stays`);
    }
  }
  if (!existsSync(join(root, "src/routes/index.tsx"))) problems.push("src/routes/index.tsx: Home is missing");

  const shell = join(root, "src/components/shell.tsx");
  const shellText = existsSync(shell) ? readFileSync(shell, "utf8") : "";
  if (!/General information, not tax, legal or financial advice/.test(shellText)) {
    problems.push("src/components/shell.tsx: the footer must carry the general-information line");
  }
  const screen = existsSync(ui) ? readFileSync(ui, "utf8") : "";
  if (!/Back to Home/.test(screen)) problems.push("src/components/ui.tsx: screens must keep the Back to Home link");

  // README and deploy notes.
  const readme = join(root, "README.md");
  const readmeText = existsSync(readme) ? readFileSync(readme, "utf8").toLowerCase() : "";
  for (const phrase of README_MUST_SAY) {
    if (!readmeText.includes(phrase)) problems.push(`README.md: must say "${phrase}"`);
  }
  if (!existsSync(join(root, "DEPLOY.md"))) problems.push("DEPLOY.md: the deploy steps are missing");

  for (const kept of ["docs", "src/data/bench.ts", "src/data/structures.ts"]) {
    if (!existsSync(join(root, kept))) problems.push(`${kept}: must not be deleted`);
  }

  // The security policy is the browser's half of "stays on this device".
  const { HEADER_CSP, META_CSP } = await loadCsp(root);
  const headers = join(root, "public/_headers");
  const headerText = existsSync(headers) ? readFileSync(headers, "utf8") : "";
  if (!headerText.includes(`Content-Security-Policy: ${HEADER_CSP}`)) {
    problems.push("public/_headers: must carry the content-security policy from scripts/csp.mjs exactly");
  }
  for (const policy of [HEADER_CSP, META_CSP]) {
    if (/https?:|\*|wss?:/.test(policy) || !/connect-src 'self'(?:;|$)/.test(policy)) {
      problems.push("scripts/csp.mjs: the policy may name no other host, and connect-src must be 'self'");
    }
  }

  // Dependencies: nothing that could phone home.
  const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
  for (const name of Object.keys(pkg.dependencies ?? {})) {
    if (!ALLOWED_DEPENDENCIES.includes(name)) {
      problems.push(`package.json: "${name}" is not on the allowed list in scripts/rules-check.mjs`);
    }
  }

  return problems;
}

/* -------------------------------------------------------------------- dist */

export async function checkDist(root) {
  const problems = [];
  const { META_CSP } = await loadCsp(root);
  const dist = join(root, "dist");
  if (!existsSync(join(dist, "index.html"))) return ["dist/index.html: build the site first"];

  const html = readFileSync(join(dist, "index.html"), "utf8");
  const decoded = html.replace(/&#39;|&apos;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, "&");
  if (!decoded.includes(`content="${META_CSP}"`)) problems.push("dist/index.html: the content-security policy is not in the page");
  for (const match of html.matchAll(/\b(?:src|href)=["']([^"']+)["']/g)) {
    if (/^(?:https?:)?\/\//.test(match[1])) problems.push(`dist/index.html: loads ${match[1]} from another host`);
  }
  if (!existsSync(join(dist, "_headers"))) problems.push("dist/_headers: the host headers were not copied");

  const all = walk(dist, ".").map(posix);
  if (all.length > MAX_FILES) problems.push(`dist: ${all.length} files is more than the host allows`);
  for (const rel of all) {
    if (statSync(join(dist, rel)).size > MAX_FILE_BYTES) problems.push(`dist/${rel}: larger than the host allows for one file`);
    if (/\.(?:js|css|html)$/.test(rel) && BANNED_HOSTS.test(readFileSync(join(dist, rel), "utf8"))) {
      problems.push(`dist/${rel}: names a model, CDN or analytics host`);
    }
  }
  for (const rel of OCR_DIST_FILES) {
    if (!existsSync(join(dist, rel))) problems.push(`dist/${rel}: the on-device reader is missing. Run npm run ocr:assets.`);
  }
  return problems;
}

/* -------------------------------------------------------------------- main */

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isMain) {
  const flag = process.argv.indexOf("--root");
  const root = flag > -1 ? process.argv[flag + 1] : join(dirname(fileURLToPath(import.meta.url)), "..");
  const problems = process.argv.includes("--dist") ? await checkDist(root) : await checkRules(root);
  if (problems.length > 0) {
    console.error(`Hard rules broken (${problems.length}):`);
    for (const problem of problems) console.error(`  ${problem}`);
    process.exit(1);
  }
  console.log(process.argv.includes("--dist") ? `Built site holds the rules (${relative(process.cwd(), join(root, "dist")) || "dist"}).` : "Hard rules hold.");
}
