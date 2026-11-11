/**
 * The one content-security policy for koa.
 *
 * It is the browser-level half of the "stays on this device" promise: even if
 * a later change slipped a network call past the rules check, the browser
 * would refuse to send anything to another host.
 *
 * `public/_headers` must carry HEADER_CSP exactly. The rules check compares
 * the two so they cannot drift.
 */
const DIRECTIVES = [
  ["default-src", "'self'"],
  // 'wasm-unsafe-eval' lets the on-device text reader compile its WebAssembly.
  ["script-src", "'self' 'wasm-unsafe-eval'"],
  ["style-src", "'self'"],
  ["img-src", "'self' blob: data:"],
  ["font-src", "'self'"],
  ["connect-src", "'self'"],
  ["worker-src", "'self'"],
  ["manifest-src", "'self'"],
  ["object-src", "'none'"],
  ["base-uri", "'self'"],
  ["form-action", "'none'"],
];

/** Sent as a response header by the host. */
export const HEADER_CSP = [...DIRECTIVES, ["frame-ancestors", "'none'"]]
  .map(([name, value]) => `${name} ${value}`)
  .join("; ");

/** Written into the built page, so the policy travels with the files. */
export const META_CSP = DIRECTIVES.map(([name, value]) => `${name} ${value}`).join("; ");
