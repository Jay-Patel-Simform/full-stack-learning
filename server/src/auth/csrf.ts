// * CSRF: another site's page makes YOUR browser send a write, with YOUR
// * cookie. It never reads the reply, so CORS never enters into it - CORS
// * only decides who may READ. Something has to decide who may WRITE.
// *
// * The decision is: who asked for this request? Since March 2023 every
// * browser tells us, in a header a page cannot forge.

// ? GET, HEAD and OPTIONS change nothing here, so nothing to defend.
// ? If that ever stops being true, this line is the bug.
const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

/**
 * May this request write?
 *
 * `site` is the Sec-Fetch-Site header. The browser writes it; the "Sec-"
 * prefix makes it a forbidden header name, so page JavaScript cannot set it.
 * Four values: same-origin, same-site, cross-site, none.
 * https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Sec-Fetch-Site
 */
export function allowWrite(
  method: string,
  site: string | undefined,
  origin: string | undefined,
  allowedOrigins: string[],
): boolean {
  if (SAFE_METHODS.has(method)) return true;

  // ! The good case in production: our own page, one origin, no ambiguity.
  if (site === "same-origin") return true;

  // * Dev: the React server on :5173 calling the API on :3000. A different
  // * port is a different ORIGIN but the same SITE, so Sec-Fetch-Site says
  // * "same-site" and we need the allow-list to tell ours from a sibling's.
  if (origin) return allowedOrigins.includes(origin);

  // ! A browser spoke, said not-our-page, and sent no Origin. Deny.
  if (site) return false;

  // ? Neither header: not a browser at all - curl, Postman, a cron job.
  // ? A CSRF attack needs a victim's browser to carry a victim's cookie, and
  // ? every browser since March 2023 sends Sec-Fetch-Site. So allowing this
  // ? costs nothing here and keeps curl usable.
  // TODO: ponytail: OWASP recommends blocking when both headers are absent.
  // TODO: to fail closed, change this `return true` to `return false` - and
  // TODO: expect every curl write to need `-H "Origin: <an allowed one>"`.
  return true;
}
