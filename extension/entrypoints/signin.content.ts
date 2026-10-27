import { SIGN_IN_DONE_URL } from "../utils/auth"

/**
 * Safari only: Safari has no identity API, so sign-in runs in a tab that ends on the site's
 * done page. This hands that page's URL, with its one-time code, to the background.
 */
export default defineContentScript({
  matches: [`${SIGN_IN_DONE_URL}*`],
  include: ["safari"],
  runAt: "document_start",
  main() {
    browser.runtime.sendMessage({ type: "SIGN_IN_PAGE_DONE" }).catch(() => {})
  },
})
