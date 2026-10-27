# End-to-end tests

These tests run the real product: the built Chrome extension in Chromium (one or several
profiles in one browser process, like a person with more than one Chrome profile) and the
built native app in Electron. On Linux they press real keys through the X server with
`xdotool`, so Chrome's shortcut handling, the popup and the native app's global Alt+Tab all
see the same events a keyboard sends.

```sh
npm run test:e2e                    # build the extension and native app, then run everything
npm run test --workspace=e2e        # run against the current builds
npm run test --workspace=e2e -- profiles.spec -g "Global"   # one file / one test
```

`run.sh` starts a virtual display (Xvfb) with the openbox window manager (with no key
bindings, so Alt+Tab reaches the apps) when it runs on Linux. It needs `xvfb`, `xdotool` and
`openbox` (`sudo apt-get install -y xvfb xdotool openbox`). On macOS the tests that need real
key presses are skipped, and the rest open real Chromium windows.

What's covered:

- `extension.spec.ts`: the popup's most-recently-used order, picking a tab, its hint to pin the
  icon (Chrome opens an unpinned extension's popup about 0.3 seconds later), and Alt+Tab,
  Alt+Tab+Tab and Alt+Tab+Tab+Tab in both shortcut scopes ("In Chrome" and "Global").
- `profiles.spec.ts`: two profiles each getting their own Alt+Tab, and the popup's warning
  when the shortcut is set to "Global".
- `native.spec.ts`: the native app's overlay with real Alt+Tab, Down and Alt release (loaded
  hidden at launch, so the first Alt+Tab shows it right away), search, and switching between
  two profiles' tabs.

Helpers: `helpers/browser.ts` launches Chromium with N profiles and drives each profile's
service worker, `helpers/native.ts` launches the app (with `TAS_E2E=1`, which exposes its
sessions and tab list to the tests), `helpers/keys.ts` sends keys, and `helpers/cdp.ts`
reaches the extension popup, which Playwright doesn't expose as a page.

Not covered here: macOS-only code (AppleScript activation, Accessibility, the Option key),
Safari, and Firefox.
