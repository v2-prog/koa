#!/usr/bin/env node
/**
 * A walk through the built site in headless Chrome, at phone size.
 *
 *   npm run build && npm run test:smoke
 *
 * It serves dist/ with the real security header and checks, on every screen:
 * no script error, no request to another host, at most one primary (green)
 * action, the general-information notice, a way back to Home, and no sideways
 * scrolling at phone width. Then it drives the capture flow end to end with
 * the real on-device reader, records a gift, and checks that a tax file
 * number is refused.
 *
 * Set CHROME to a Chrome or Chromium binary if it is not at the usual place.
 * Screenshots go to screenshots/ (ignored by git).
 */
import { createServer } from "node:http";
import { existsSync, mkdirSync, readFileSync, statSync } from "node:fs";
import { dirname, extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";
import { HEADER_CSP } from "./csp.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dist = join(root, "dist");
const shots = join(root, "screenshots");
const CHROME = process.env.CHROME ?? ["/usr/bin/google-chrome", "/usr/bin/chromium", "/usr/bin/chromium-browser", "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"].find(existsSync);

if (!existsSync(join(dist, "index.html"))) {
  console.error("smoke: run npm run build first.");
  process.exit(1);
}
if (!CHROME) {
  console.error("smoke: no Chrome found. Set CHROME to its path.");
  process.exit(1);
}
mkdirSync(shots, { recursive: true });

const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".png": "image/png", ".woff2": "font/woff2", ".json": "application/json", ".webmanifest": "application/manifest+json", ".gz": "application/gzip", ".wasm": "application/wasm" };

const server = createServer((request, response) => {
  const path = normalize(decodeURIComponent(new URL(request.url ?? "/", "http://x").pathname)).replace(/^(\.\.[/\\])+/, "");
  let file = join(dist, path);
  if (!file.startsWith(dist) || !existsSync(file) || statSync(file).isDirectory()) file = join(dist, "index.html");
  response.writeHead(200, {
    "Content-Type": TYPES[extname(file)] ?? "application/octet-stream",
    "Content-Security-Policy": HEADER_CSP,
  });
  response.end(readFileSync(file));
});
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const origin = `http://127.0.0.1:${server.address().port}`;

const failures = [];
const fail = (where, what) => failures.push(`${where}: ${what}`);

const browser = await chromium.launch({ executablePath: CHROME });
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, locale: "en-AU", timezoneId: "Australia/Sydney" });
await context.grantPermissions(["clipboard-read", "clipboard-write"], { origin });
const page = await context.newPage();

let where = "start";
page.on("pageerror", (error) => fail(where, `script error: ${error.message}`));
page.on("console", (message) => {
  if (message.type() === "error") fail(where, `console error: ${message.text()}`);
});
page.on("request", (request) => {
  const url = request.url();
  if (!url.startsWith(origin) && !/^(?:data|blob):/.test(url)) fail(where, `request to another host: ${url}`);
});

async function checkScreen(path, name) {
  where = path;
  await page.goto(origin + path, { waitUntil: "networkidle" });
  await page.waitForSelector("main h1");
  const report = await page.evaluate(() => ({
    primaries: document.querySelectorAll("main [data-primary]").length,
    notice: /General information only\. Not tax, legal or financial advice\./.test(document.querySelector("main")?.textContent ?? ""),
    back: [...document.querySelectorAll("main a")].some((link) => link.textContent?.trim() === "Back to Home"),
    overflow: document.documentElement.scrollWidth - window.innerWidth,
    small: [...document.querySelectorAll("main button, main a, main input, main select, main summary")]
      .filter((element) => {
        const box = element.getBoundingClientRect();
        return box.width > 1 && box.height > 1 && box.height < 40 && !element.closest("p, li, dd, label, [aria-hidden=true]");
      })
      .map((element) => element.textContent?.trim().slice(0, 30) || element.getAttribute("aria-label") || element.tagName),
    green: [...document.querySelectorAll("main *")].filter((element) => {
      const style = getComputedStyle(element);
      return [style.backgroundColor, style.color, style.borderTopColor].some((colour) => colour === "rgb(11, 90, 55)") && !element.closest("[data-primary]");
    }).length,
  }));
  if (report.primaries > 1) fail(path, `${report.primaries} primary actions`);
  if (report.green > 0) fail(path, `${report.green} green elements outside the primary action`);
  if (!report.notice) fail(path, "general-information notice missing");
  if (path !== "/" && !report.back) fail(path, "Back to Home missing");
  if (report.overflow > 1) fail(path, `scrolls sideways by ${report.overflow}px at phone width`);
  if (report.small.length > 0) fail(path, `tap targets under 40px: ${report.small.join(", ")}`);
  await page.screenshot({ path: join(shots, `${name}.png`), fullPage: true });
  return report;
}

const SCREENS = [
  ["/", "home"],
  ["/transfer", "ledger"],
  ["/bequest", "bequest"],
  ["/tax", "tax"],
  ["/fund", "fund"],
  ["/community", "community"],
  ["/minutes", "minutes"],
  ["/structures", "structures"],
  ["/bench", "bench"],
  ["/rooms", "rooms"],
  ["/rings", "rings"],
  ["/guide", "guide"],
  ["/capture", "capture"],
  ["/folders", "folders"],
  ["/folders/shoebox", "shoebox"],
  ["/device", "device"],
  ["/no-such-screen", "not-found"],
];
for (const [path, name] of SCREENS) await checkScreen(path, name);

/* ------------------------------------------------- capture, with real OCR */

where = "capture flow";
const receipt = await (async () => {
  const maker = await browser.newPage({ viewport: { width: 520, height: 760 } });
  await maker.setContent(`<body style="margin:0;background:#fff;font:26px/1.45 'DejaVu Sans Mono',monospace;color:#111;padding:36px 44px">
    <div style="font-size:34px;font-weight:bold">CORNER GROCER</div>
    <div>12 High Street Katoomba</div><div>TAX INVOICE</div><div>ABN 12 345 678 901</div>
    <div>Date: 09/11/2026 Time 14:02</div><br>
    <div>Milk 2L &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; 4.60</div><div>Sourdough &nbsp; &nbsp; &nbsp; &nbsp; 7.50</div>
    <div>Apples 1kg &nbsp; &nbsp; &nbsp; &nbsp; 30.40</div><div>SUBTOTAL &nbsp; &nbsp; &nbsp; &nbsp; 42.50</div>
    <div style="font-weight:bold">TOTAL &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp;42.50</div><div>EFTPOS &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; 42.50</div>
    <div>Ph 02 4782 1234</div><div>Thank you</div></body>`);
  const shot = await maker.screenshot({ type: "png" });
  await maker.close();
  return shot;
})();

await page.goto(`${origin}/capture?attach=tax:deduction`, { waitUntil: "networkidle" });
await page.setInputFiles('[data-testid="file-picker"]', { name: "receipt.png", mimeType: "image/png", buffer: receipt });
await page.getByRole("heading", { name: "Check what koa read" }).waitFor({ timeout: 120_000 });
const read = {
  title: await page.inputValue("#capture-title"),
  date: await page.inputValue("#capture-date"),
  supplier: await page.inputValue("#capture-supplier"),
  amount: await page.inputValue("#capture-amount"),
};
console.log("smoke: read from the receipt", read);
if (read.amount !== "42.50") fail(where, `amount read as "${read.amount}"`);
if (read.date !== "2026-11-09") fail(where, `date read as "${read.date}"`);
if (!/corner grocer/i.test(read.supplier)) fail(where, `supplier read as "${read.supplier}"`);
if (!(await page.getByText(/took \d+ numbers? that looked like/).isVisible())) fail(where, "the ABN and phone number were not reported as removed");
await page.getByRole("button", { name: "Show the words koa read" }).click();
const words = await page.inputValue("#capture-text");
if (/345 678 901|4782 1234/.test(words)) fail(where, "identifier-like numbers were left in the read text");
await page.screenshot({ path: join(shots, "capture-confirm.png"), fullPage: true });
if ((await page.locator("main [data-primary]").count()) !== 1) fail(where, "confirm step should have exactly one primary action");
await page.getByRole("button", { name: /^Save to / }).click();
await page.getByRole("heading", { name: "Saved on this device" }).waitFor();
await page.screenshot({ path: join(shots, "capture-saved.png"), fullPage: true });

where = "attached capture";
await page.goto(`${origin}/tax`, { waitUntil: "networkidle" });
if (!(await page.getByRole("link", { name: read.title || "Corner Grocer receipt" }).first().isVisible())) fail(where, "the capture is not shown on its tax flag");

where = "capture detail";
await page.goto(`${origin}/folders/shoebox`, { waitUntil: "networkidle" });
await page.getByRole("link", { name: new RegExp(read.title || "Corner Grocer") }).first().click();
await page.getByRole("img", { name: /The paper/ }).waitFor();
await page.screenshot({ path: join(shots, "capture-detail.png"), fullPage: true });

/* ---------------------------------------------- refusal of a tax file number */

where = "tax file number refusal";
await page.goto(`${origin}/capture`, { waitUntil: "networkidle" });
await page.getByRole("button", { name: "Write a note with no picture" }).click();
await page.fill("#capture-title", "Letter from work");
await page.fill("#capture-note", "My TFN is 123 456 789");
await page.getByRole("button", { name: /^Save to / }).click();
const alert = await page.getByRole("alert").textContent({ timeout: 5000 }).catch(() => "");
if (!/tax file number/i.test(alert ?? "")) fail(where, "the note was not refused");

/* --------------------------------------------------------- ledger, a gift */

where = "gift";
await page.goto(`${origin}/`, { waitUntil: "networkidle" });
await page.locator("main [data-primary]").click();
await page.waitForURL(/\/transfer/);
await page.fill("#move-amount", "15");
await page.fill("#move-to", "Garden club");
await page.locator("main [data-primary]").click();
await page.getByText("Demo mark on this device. No real money moved.").first().waitFor();
await page.screenshot({ path: join(shots, "gift-receipt.png"), fullPage: true });
await page.goto(`${origin}/`, { waitUntil: "networkidle" });
if (!/105 Q/.test((await page.locator("main").textContent()) ?? "")) fail(where, "Home does not show the gifting balance after the gift");

/* ------------------------------------------------------------ larger screen */

where = "desktop";
await page.setViewportSize({ width: 1280, height: 900 });
await page.goto(`${origin}/`, { waitUntil: "networkidle" });
await page.screenshot({ path: join(shots, "home-desktop.png"), fullPage: true });

await browser.close();
server.close();

if (failures.length > 0) {
  console.error(`smoke: ${failures.length} problems`);
  for (const failure of failures) console.error(`  ${failure}`);
  process.exit(1);
}
console.log(`smoke: ${SCREENS.length} screens and four flows passed. Screenshots in screenshots/.`);
