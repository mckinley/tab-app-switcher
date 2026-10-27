/**
 * The page to send someone to after sign-in, from the `returnTo` query parameter. Only paths on
 * this site are allowed, so a link like `/login?returnTo=javascript:…` or `?returnTo=//evil.com`
 * can't run script or send a signed-in visitor to another site.
 */
export function safeReturnTo(value: string | null | undefined, fallback = "/account"): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return fallback
  // Browsers read "\\" as "/" and drop tabs and newlines, so "/\\evil.com" and "/\t/evil.com" act like "//evil.com"
  if (value.includes("\\") || [...value].some((c) => c.charCodeAt(0) < 0x20)) return fallback
  return value
}
