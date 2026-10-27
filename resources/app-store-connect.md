# Submitting the Safari extension in App Store Connect

With an App Store Connect API key (README.md → Releasing), the release does all of this:
`scripts/submit-safari.mjs` adds the version, picks the build, sets What's New from
[whats-new.md](whats-new.md), copies the reviewer contact details from the last version, adds the
notes below and submits. `node scripts/submit-safari.mjs --check` shows what it would do.

Without the key, `npm run publish:safari` (or `npm run release -- patch --local`) uploads the
build, and the version has to be submitted by hand. This is everything App Store Connect asks
for, in order, so it goes through the first time. It takes about five minutes. Section 4 also
applies with the key: when Apple adds questions, the submission stops until someone answers them.

## 1. Wait for the build to process

A build takes 5 to 30 minutes to process after the upload. Apple emails when it's done, and the
**TestFlight** tab shows its status. It can't be picked for a version until then.

## 2. Add the version

[App Store Connect](https://appstoreconnect.apple.com) → **Apps** → **Tab Application
Switcher** → **+** next to macOS App. The version is the release's number, the `version` in
`extension/package.json` (for example 1.2.5).

## 3. Fill in the version page

| Field                                         | What to enter                                                                                                                                                                         |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **What's New in This Version**                | The changes people will notice, a line each. Start from the [GitHub release notes](https://github.com/mckinley/tab-app-switcher/releases) and leave out site, docs and build changes. |
| **Build**                                     | The build `publish:safari` printed: the `build` in `extension/package.json`.                                                                                                          |
| Screenshots, description, keywords, URLs      | Carried over from the last version. Change them only when the listing changes (copy in [descriptions/extension.md](descriptions/extension.md)).                                       |
| **App Review Information → Sign-in required** | Unchecked. Signing in is optional, and only syncs saved collections.                                                                                                                  |
| **App Review Information → Contact**          | First name, last name, phone number and email. Apple only uses them if the reviewer has a question. Every version needs them; check they carried over.                                |
| **App Review Information → Notes**            | The text below.                                                                                                                                                                       |
| **Version Release**                           | Automatically release this version, so it goes out as soon as it's approved.                                                                                                          |

Notes for the reviewer:

```text
Enable the extension in Safari → Settings → Extensions, then press Option+1 in Safari to open the switcher. Keep holding Option and press 1 again to move through recently used tabs, then release Option to switch. Signing in is optional and only syncs saved tab collections.
```

## 4. App Information, when Apple asks

These are set once for the app, not per version, but Apple blocks review when it adds new
questions ("Unable to Add for Review").

- **Age Rating** (App Information → Age Rating → Edit): answer None or No to every question.
  The app has no mature content, no user-generated content shared with others, no chat, no ads
  and no web browsing of its own, so it rates 4+. Apple added new questions in 2025, and every
  app had to answer them before its next submission.
- **App Privacy** (App Privacy → Edit): signing in (from 1.2.5) sends data to
  tabappswitcher.com, so the label shouldn't say "Data Not Collected". Declare, all linked to the
  person, used for App Functionality only, and not used for tracking:
  - Contact Info: Name and Email Address (from Google sign-in)
  - User Content: Other User Content (saved tab collections: tab titles and URLs)
  - Identifiers: User ID

## 5. Submit

**Save**, then **Add for Review** → **Submit to App Review**. Review usually takes one to three
days, and with automatic release the version goes out when it's approved.

## If Apple refuses the upload

Notarization failing with "A required agreement is missing or has expired" (HTTP 403), or the
Safari export failing with "PLA Update available", both mean Apple has an updated agreement
waiting. The account holder accepts it at https://developer.apple.com/account, and should check
App Store Connect → Business → Agreements too. A minute or two later it works again.
`npm run release` checks for this before it tags a version (`scripts/check-release-credentials.mjs`).
