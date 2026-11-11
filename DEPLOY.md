# Deploying koa to tax.koa.au

koa is a static site. Cloudflare Pages builds it from the GitHub repository and serves `dist/`. There is no server code, no database, and no secret.

**Environment variables: none are required.** Everything a person writes stays in their browser, so the build needs nothing beyond `NODE_VERSION`, which is set in the repository by `.nvmrc` and `.node-version` (22).

## 1. Push the code

```sh
git init -b main            # if this is not yet a repository
git add -A
git commit -m "koa: first release"
gh repo create v2-prog/koa --public --source . --remote origin --push
# or, if the repository already exists:
git remote add origin https://github.com/v2-prog/koa.git
git push -u origin main
```

`public/ocr/` is not committed. `npm install` regenerates it from `node_modules` (the `postinstall` script), and Cloudflare runs `npm install` before the build.

## 2. Create the Pages project

In the Cloudflare dashboard: **Workers & Pages → Create → Pages → Connect to Git**, choose `v2-prog/koa`, then:

| Setting | Value |
| --- | --- |
| Production branch | `main` |
| Framework preset | None (or Vite) |
| Build command | `npm run build` |
| Build output directory | `dist` |
| Root directory | (leave empty) |
| Environment variables | none |

`npm run build` runs the typecheck and the rules check before Vite, and the rules check on `dist/` after it. If any hard rule is broken, the build fails and nothing is published.

Or from a terminal, with [Wrangler](https://developers.cloudflare.com/workers/wrangler/):

```sh
npm install
npm run build
npx wrangler pages project create koa --production-branch main
npx wrangler pages deploy dist --project-name koa --branch main
```

## 3. Point tax.koa.au at it

In the Pages project: **Custom domains → Set up a custom domain → `tax.koa.au`**. If `koa.au` is a zone on the same Cloudflare account, the CNAME is added for you. Otherwise add it at the DNS host:

```
tax   CNAME   koa.pages.dev
```

(Use the project's actual `*.pages.dev` name if Cloudflare gave it a suffix.) The certificate is issued automatically.

## 4. Check it

1. Open https://tax.koa.au and confirm Home loads.
2. In the browser's developer tools, **Network**: every request goes to `tax.koa.au`. Capture a picture: the reader's files load from `/ocr/`, and nothing else is requested.
3. Response headers on `/` include the `Content-Security-Policy` from `public/_headers`, with `connect-src 'self'`.
4. Locally, `npm run build && npm run test:smoke` walks every screen in headless Chrome and fails on any request to another host.

## What is in `public/`

- `_headers`: the security policy and cache rules. Cloudflare Pages reads this file. The rules check fails the build if its policy drifts from `scripts/csp.mjs`.
- `_redirects`: sends every path to `index.html`, so a deep link such as `/folders/…` works on reload.
- `manifest.webmanifest`, `favicon.svg`, `icon-180.png`: the home-screen icon.
- `ocr/` (generated): the Tesseract worker, its three WebAssembly builds and the English model, about 7 MB, each file well under the 25 MiB Pages limit.
