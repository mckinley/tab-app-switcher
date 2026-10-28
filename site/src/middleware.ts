import type { MiddlewareHandler } from "astro"

/**
 * Astro's check against cross-site form posts (security.checkOrigin, turned off in
 * astro.config.ts), with one exception: Sign in with Apple posts its result from
 * appleid.apple.com to Better Auth's callback. That callback only redirects the post to a GET of
 * itself, which checks the OAuth state, so it's safe to let through.
 *
 * Everywhere else, a POST, PUT, PATCH or DELETE from another origin is refused when it's
 * form-like or has no content type, as Astro does: those are the requests another site can make a
 * signed-in visitor's browser send. Requests with an Authorization header are let through: they're
 * the extension's and Mac app's bearer-token calls (such as signing out), which no other site can
 * make for them.
 */
const FORM_CONTENT_TYPES = ["application/x-www-form-urlencoded", "multipart/form-data", "text/plain"]
const SAFE_METHODS = ["GET", "HEAD", "OPTIONS"]
const CROSS_SITE_FORM_PATHS = new Set(["/api/auth/callback/apple"])

export const onRequest: MiddlewareHandler = ({ request, url, isPrerendered }, next) => {
  if (isPrerendered || SAFE_METHODS.includes(request.method) || CROSS_SITE_FORM_PATHS.has(url.pathname)) {
    return next()
  }
  if (request.headers.get("origin") === url.origin || request.headers.has("authorization")) return next()
  const contentType = request.headers.get("content-type")?.toLowerCase()
  if (!contentType || FORM_CONTENT_TYPES.some((type) => contentType.includes(type))) {
    return new Response(`Cross-site ${request.method} form submissions are forbidden`, { status: 403 })
  }
  return next()
}
