# koa

koa keeps a person's papers and their community's papers in one app, on one device. It is for Australia only.

It is a fork of [Q units](https://github.com/v2-prog/Qunit) (`v2-prog/Qunit`). Q units' demo ledger, its four jobs and its hard rules come across unchanged. koa adds paper capture with on-device reading, local folders, fuller life-stage rings, a guide for every age, and two small helpers: **Explain this** and **Simplify this note**.

Intended host: **https://tax.koa.au** (Cloudflare Pages). Repository: `v2-prog/koa`. Deploy steps are in [DEPLOY.md](DEPLOY.md).

General information, not tax, legal or financial advice.

## What koa is not

- koa is **not a bank** and **not a chain**. The units are a demo mark in one browser. One unit stands for one Australian dollar in reserve, and no real money moves.
- koa is **not a yield product** and **not a share offer**. Holders earn nothing. A community proposal can only ask for interest on the reserve, never the principal. It is **not an investment fund** either.
- The bequest support pack is **not a will** and **not a binding nomination**. It is material for a conversation with the family and a solicitor.
- The five tax questions are **not a tax calculator**. Each one ends at an ATO page, a registered tax agent, or "not applicable". Nothing is worked out and nothing is lodged.
- koa is **not a place for identifiers**. It refuses to save text that looks like a tax file number, and it takes no bank logins, balances, card numbers or member numbers.
- Nothing here is tax, legal or financial advice. Uncertain or state-specific rules are labelled **VERIFY**, with a line saying who checks.

## What stays on this device

Everything a person writes or captures stays in their browser on their device:

| What | Where it is kept |
| --- | --- |
| Ledger, receipts, community proposals | `localStorage`, key `koa:ledger` |
| Bequest pack, tax questions, minutes, rings | `localStorage`, keys `koa:bequest`, `koa:tax`, `koa:minutes`, `koa:rings` |
| Folders, captures, kept pictures | IndexedDB database `koa` (`folders`, `captures`, `files`) |

There are no accounts and no server-side storage. The app is static files.

The guarantee is enforced three ways:

1. **In the code.** Only `src/lib/local-store.ts` writes to `localStorage`, and only `src/lib/idb.ts` writes to IndexedDB. Each write passes through `deepRefusal` in `src/lib/guards.ts`, which refuses anything that looks like a tax file number, card number, bank details, a balance, a member or Medicare number, or a password.
2. **In the browser.** A content-security policy (`scripts/csp.mjs`) is sent as a header and written into the built page. `connect-src 'self'` means the page cannot open a connection to any other host, even if a future change tried to.
3. **In the build.** `scripts/rules-check.mjs` fails the build if product code makes a network call, names a model or analytics host, adds a dependency that is not on its allowed list, or writes to storage anywhere else.

Nothing leaves the device unless the person copies text or saves a file themselves. Links to the ATO and other public pages open only when pressed, in a new tab, with no referrer.

**The AI-style features, and what each one does:**

- **Reading a picture (OCR).** [Tesseract](https://github.com/naptha/tesseract.js), compiled to WebAssembly, runs in a web worker in the page. Its worker, engine and English model are copied from `node_modules` into `public/ocr` by `scripts/copy-ocr-assets.mjs` and served from koa's own origin. The reader loads the first time someone captures a picture, so people who never capture never download it. The picture goes from the camera to a canvas to the worker, and nowhere else.
- **Cleaning up what was read.** `src/lib/ai/image-prep.ts` turns the photo grey and stretches its contrast before reading. `src/lib/ai/receipt-parse.ts` then finds the date (day first, as Australian papers print it), the amount most likely to be the total, and the supplier. These are rules in plain TypeScript, not a model. The person checks every field before anything is saved, and the amount is copied as printed, never added up.
- **Taking identifiers out.** Before a person sees the read text, `scrubIdentifiers` removes numbers that look like ABNs, card numbers, account numbers, member numbers and phone numbers, and leaves dates and prices. If the text suggests the paper shows a tax file number, bank details or a Medicare number, koa keeps the words but will not keep the picture, because a picture cannot be cleaned.
- **Simplify this note.** `src/lib/ai/simplify.ts` is a small extractive summariser. It picks the sentences from the person's own note that carry the most of it (favouring dates, numbers and things to do), swaps a fixed list of stiff phrases for plain ones, and explains any jargon from the glossary. It never writes a new sentence. The person chooses whether to use the short version.
- **Explain this.** Everyday explanations of the five tax flags, the ten structures, the rings and each life stage are written into the app (`src/lib/tax.ts`, `src/data/structures.ts`, `src/lib/rings.ts`, `src/data/guide.ts`, `src/data/glossary.ts`). Pressing the button shows them. Nothing is looked up or generated.

No neural model is downloaded. A small in-browser language model was considered and left out: the useful ones are hundreds of megabytes, larger than Cloudflare Pages allows for one file, and they would usually be fetched from a model hub, which the policy above forbids.

**Getting things off the device**, always on purpose:

- every pack, list and set of minutes has **Copy the note** and **Save as a text file**;
- a folder can be saved **into a real folder** the person picks (File System Access API, on browsers that have it) or as **one zip file** (a small writer in `src/lib/zip.ts`), as a text note per capture plus the kept pictures;
- **This device** saves a copy of everything written as one JSON file, and can erase everything.

## The app

Home is a map: units in circulation, the purchasing and gifting balances, the gifting-expiry countdown, one green **Gift** action, then the four jobs, capture and folders, the rings and the guide, the community shelf, and this device.

**Personal and community are kept apart on every screen.** A strip under the header is solid ink on personal screens and striped river-blue on community screens, and each screen says which side it is on in words. Folders are personal or community. A capture attached to a community thing shows as community.

### The four jobs (from Q units)

| Job | Screen | Notes |
| --- | --- | --- |
| Device ledger | `/transfer` | Spend from purchasing units, gift from gifting units. Every move gets a paper-slip receipt. Idle gifting units leave after 90 days, with a receipt. |
| Bequest support pack | `/bequest` | Ten documents that sit beside a will, each marked exists, not yet, or not sure. VERIFY lines for state rules. Exports a note for the family and a solicitor. |
| Tax questions | `/tax` | Five flags: a deduction, a cost-base note, short-stay and private nights, a sale or inheritance, super as a label. Each has "Explain this", an ATO link and a who-checks line. Law changes carry their stage: "Not law yet" is never treated as current law. |
| Community proposals | `/fund` | An ask comes only from reserve interest. A support mark on this device buys nothing. A passed ask produces a receipt in the same style as the ledger. |

### Capture and folders (new in koa)

`/capture` runs one continuous flow: **take a photo or pick a file → read it on this device → check what was read → choose a folder and, optionally, what to attach it to → save**. A capture can be attached to a tax flag, a bequest document, a ledger receipt, a structure, a bench model, a set of minutes or a proposal, or left in the **Shoebox**. Every one of those screens shows its attached captures and has a "Capture a paper for this" button that comes back to where you were.

`/folders` lists personal and community folders, searches every capture's title, supplier, note and read text, and makes new folders. `/folders/:id` exports a folder. `/captures/:id` shows the picture, edits, moves, re-attaches or deletes a capture.

### Community

`/community` gathers the reserve interest, open asks and the latest minutes. `/minutes` keeps local meeting minutes (present, apologies, quorum with a VERIFY line, items asked and what passed, next steps) and can link the proposal a meeting decided, with its receipt. `/structures` is the ten-item Australian structure list, each with an explanation, asset-lock status, VERIFY lines, and attached captures. `/bench` is the nineteen community-fund and co-operative models from public sources, searchable and filterable, each with "take" and "do not take".

### People, at every age

`/rings` puts one focus person in the centre, a family ring of eight and a community ring of eight around them. First names or roles only. Ages are two-year bands (0–1 to 88–89, then 90+). Each band falls in a life stage, and "Two years on" shows who moves into a new stage. `/guide` has one card per life stage: things to notice, one question worth asking and who answers it, and where in koa to start. Nothing on either screen is a calculation.

### Relationship to Q units and the Woods shelf

koa is one room on the Woods shelf. Q units holds the reserve-backed unit; Concentric Circles plans the rings; ARC is tax literacy; Friends SMF keeps minutes for a small society; Structure Lab is the notebook for structures. koa carries a small, local part of each so a family can do the first step in one place, and `/rooms` says where each fuller tool lives. None of them is the reserve.

## Design

Calm paper, ink and brass, with leaf green kept for exactly one thing.

- **Paper** `#f3efe4` for the page, **card** `#fffcf6` a shade lighter.
- **Ink** `#142018` for words, lines, and anything selected.
- **Leaf** `#0b5a37` for the one primary action on a screen and nothing else. It is defined once, in `PRIMARY_CLASS` in `src/components/ui.tsx`. The rules check fails the build if leaf or any other green appears anywhere else, and in development the app logs an error if a screen renders two primary actions.
- **Brass** `#a66a0c` for gifting expiry, warnings and VERIFY labels.
- **River** `#264a66` marks the community side, always beside the word "Community".

Type is Fraunces for headings and Figtree for everything else, both self-hosted. Body text starts a little larger than the browser default. Every tap target is at least 44 px tall, and the main actions are 56 px or more. There is a five-room tab bar at the bottom on phones, and a "Back to Home" link at the top of every screen. Focus is always visible and motion is switched off for people who ask for reduced motion.

## Run it

Node 22.18 or later (the tests run TypeScript directly).

```sh
npm install        # also copies the on-device reader into public/ocr
npm run dev        # http://localhost:5173
```

| Command | What it does |
| --- | --- |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Unit tests for every module in `src/lib`, plus tests that the rules check catches each kind of breach |
| `npm run check:rules` | The hard-rule gate on the source |
| `npm run build` | Typecheck, rules check, Vite build, then the rules check again on `dist/` |
| `npm run test:smoke` | Builds nothing; opens `dist/` in headless Chrome, walks every screen, reads a sample receipt with the real OCR, and checks for one primary action per screen and no request to another host. Needs Chrome and `npm run build` first. |
| `npm run check` | Typecheck, tests and rules check together |

## Code layout

```
src/
  lib/            product logic, plain TypeScript, no React except the hooks
    guards.ts         identifier refusal, scrubbing, private-paper check
    local-store.ts    the only localStorage writer
    idb.ts            the only IndexedDB writer (memory fallback for private mode)
    library.ts        folders, captures and kept files
    ledger-core.ts    ledger, expiry, proposals, receipts
    tax.ts bequest.ts minutes.ts rings.ts captures.ts
    export.ts zip.ts backup.ts support-doc.ts
    ai/               ocr.ts image-prep.ts receipt-parse.ts simplify.ts
  data/           bench, structures, glossary, life-stage guide, rooms
  components/     shell, UI kit, capture form, Explain this / Simplify this note
  routes/         one file per screen (TanStack Router, file-based)
scripts/
  rules-check.mjs   the hard-rule gate, and its tests
  csp.mjs           the one security policy
  copy-ocr-assets.mjs
  smoke.mjs         headless-browser walk-through
```

## Data in this repository

There is no real personal or tax data here. The ledger starts with two receipts marked "sample" and one sample proposal. Rings start empty. The bench quotes public sources and names each one. Law-change stages were read from the ATO on 11 November 2026 (`SOURCES_CHECKED` in `src/lib/tax.ts`); review that file when a stage moves.

Australia only. General information, not tax, legal or financial advice.
