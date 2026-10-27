#!/usr/bin/env node

/**
 * Submit the uploaded Safari build for App Review, the step that's otherwise done by hand in App
 * Store Connect (resources/app-store-connect.md).
 *
 *   node scripts/submit-safari.mjs           # the version and build in extension/package.json
 *   node scripts/submit-safari.mjs --check   # say what it would do, changing nothing
 *
 * It waits for the build to finish processing, adds the macOS version (or renames the one being
 * prepared), picks the build, sets What's New (the version's section in resources/whats-new.md, or
 * else the commits that changed the extension), copies the App Review contact details from an
 * earlier version and adds the reviewer notes, then submits. Age rating and App Privacy belong to
 * the app rather than the version; when Apple wants something there, it says so and this stops.
 *
 * Needs an App Store Connect API key (scripts/app-store-connect.mjs), from the environment or
 * native/.env. extension/scripts/publish-safari.sh runs this after uploading when the key is set.
 */

import { execFileSync } from "child_process"
import { existsSync, readFileSync } from "fs"
import { join } from "path"
import { client, findApp, missingKeyEnv } from "./app-store-connect.mjs"
import { loadReleaseEnv, rootDir } from "./env.mjs"

const PLATFORM = "MAC_OS"
const NOTES =
  "Enable the extension in Safari → Settings → Extensions, then press Option+1 in Safari to open the switcher. " +
  "Keep holding Option and press 1 again to move through recently used tabs, then release Option to switch. " +
  "Signing in is optional and only syncs saved tab collections."
/** Version states that can still be edited and submitted */
const EDITABLE = ["PREPARE_FOR_SUBMISSION", "DEVELOPER_REJECTED", "REJECTED", "METADATA_REJECTED", "INVALID_BINARY"]
/** Version states that mean it's already submitted, approved or out */
const SUBMITTED = [
  "WAITING_FOR_REVIEW",
  "IN_REVIEW",
  "READY_FOR_REVIEW",
  "ACCEPTED",
  "PENDING_APPLE_RELEASE",
  "PENDING_DEVELOPER_RELEASE",
  "PROCESSING_FOR_DISTRIBUTION",
  "READY_FOR_DISTRIBUTION",
  "READY_FOR_SALE",
]

const check = process.argv.includes("--check")
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
const state = (version) => version.attributes.appVersionState ?? version.attributes.appStoreState

/** The version's section of resources/whats-new.md, or the commits since the last release that changed the extension */
function whatsNew(version) {
  const file = join(rootDir, "resources/whats-new.md")
  if (existsSync(file)) {
    const section = readFileSync(file, "utf8")
      .split(/^## /m)
      .find((part) => part.startsWith(`${version}\n`))
    if (section) return section.slice(version.length).trim()
  }
  const git = (...args) => execFileSync("git", args, { cwd: rootDir, encoding: "utf8" }).trim()
  const tag = `v${version}`
  const end = git("tag", "--list", tag) ? tag : "HEAD"
  let previous = ""
  try {
    previous = git("describe", "--tags", "--abbrev=0", "--match", "v*", `${end}^`)
  } catch {
    // The first release
  }
  return git(
    "log",
    "--no-merges",
    "--format=- %s",
    previous ? `${previous}..${end}` : end,
    "--",
    "extension",
    "tas",
    "packages",
    ":!extension/scripts",
    ":!*.md",
  )
    .split("\n")
    .filter((line) => line && !/^- Release v[\d.]+$/.test(line))
    .join("\n")
    .slice(0, 4000)
}

async function waitForBuild(request, appId, version, build) {
  const deadline = Date.now() + 45 * 60 * 1000
  for (;;) {
    const { data } = await request("GET", "/v1/builds", {
      query: {
        "filter[app]": appId,
        "filter[version]": build,
        "filter[preReleaseVersion.version]": version,
        "filter[preReleaseVersion.platform]": PLATFORM,
      },
    })
    const processing = data?.[0]?.attributes?.processingState
    if (processing === "VALID") return data[0].id
    if (processing === "FAILED" || processing === "INVALID") {
      throw new Error(`Build ${build} ${processing.toLowerCase()} processing. Apple's email about it says why.`)
    }
    if (check) return null
    if (Date.now() > deadline) throw new Error(`Build ${build} still isn't ready after 45 minutes`)
    console.log(processing ? `  Build ${build} is processing...` : `  Waiting for build ${build} to appear...`)
    await sleep(30 * 1000)
  }
}

async function reviewDetail(request, versionId) {
  try {
    const { data } = await request("GET", `/v1/appStoreVersions/${versionId}/appStoreReviewDetail`)
    return data
  } catch (error) {
    if (error.status === 404) return null
    throw error
  }
}

async function main() {
  loadReleaseEnv()
  const missing = missingKeyEnv()
  if (missing.length) {
    console.error(`❌ Set the App Store Connect API key first: ${missing.join(", ")} (see native/.env.example)`)
    process.exit(1)
  }
  const pkg = JSON.parse(readFileSync(join(rootDir, "extension/package.json"), "utf8"))
  const version = pkg.version
  const build = String(pkg.build)
  const request = client()

  console.log(`${check ? "Checking" : "Submitting"} Safari ${version} (build ${build}) for App Review`)
  const appId = await findApp(request)

  const buildId = await waitForBuild(request, appId, version, build)
  console.log(buildId ? `  ✓ Build ${build} is processed` : `  - Build ${build} isn't uploaded or processed yet`)

  const { data: versions } = await request("GET", `/v1/apps/${appId}/appStoreVersions`, {
    query: { "filter[platform]": PLATFORM, limit: "20" },
  })
  let target = versions.find((candidate) => candidate.attributes.versionString === version)
  if (target && SUBMITTED.includes(state(target))) {
    console.log(`  ✓ ${version} is already submitted (${state(target)}), so there's nothing to do`)
    return
  }
  target ??= versions.find((candidate) => EDITABLE.includes(state(candidate)))
  const notes = whatsNew(version)
  if (check) {
    console.log(
      target
        ? `  - Would use version ${target.attributes.versionString} (${state(target)})${target.attributes.versionString === version ? "" : `, renamed to ${version}`}`
        : `  - Would add version ${version}`,
    )
    console.log(`  - Would set What's New to:\n${notes.replace(/^/gm, "      ")}`)
    return
  }
  if (!buildId) throw new Error(`Build ${build} isn't in App Store Connect`)

  if (!target) {
    ;({ data: target } = await request("POST", "/v1/appStoreVersions", {
      body: {
        data: {
          type: "appStoreVersions",
          attributes: { platform: PLATFORM, versionString: version, releaseType: "AFTER_APPROVAL" },
          relationships: { app: { data: { type: "apps", id: appId } } },
        },
      },
    }))
    console.log(`  ✓ Added version ${version}`)
  } else if (target.attributes.versionString !== version) {
    await request("PATCH", `/v1/appStoreVersions/${target.id}`, {
      body: { data: { type: "appStoreVersions", id: target.id, attributes: { versionString: version } } },
    })
    console.log(`  ✓ Renamed version ${target.attributes.versionString} to ${version}`)
  }

  await request("PATCH", `/v1/appStoreVersions/${target.id}/relationships/build`, {
    body: { data: { type: "builds", id: buildId } },
  })
  console.log(`  ✓ Picked build ${build}`)

  const { data: localizations } = await request("GET", `/v1/appStoreVersions/${target.id}/appStoreVersionLocalizations`)
  for (const localization of localizations) {
    await request("PATCH", `/v1/appStoreVersionLocalizations/${localization.id}`, {
      body: { data: { type: "appStoreVersionLocalizations", id: localization.id, attributes: { whatsNew: notes } } },
    })
  }
  console.log(`  ✓ Set What's New`)

  // Contact details for the reviewer, from this version or an earlier one
  const detail = await reviewDetail(request, target.id)
  let contact = detail?.attributes?.contactEmail ? detail.attributes : null
  for (const earlier of versions) {
    if (contact) break
    if (earlier.id === target.id) continue
    const found = await reviewDetail(request, earlier.id)
    if (found?.attributes?.contactEmail) contact = found.attributes
  }
  if (!contact) {
    throw new Error(
      "No earlier version has App Review contact details to copy. Fill them in once in App Store Connect (resources/app-store-connect.md).",
    )
  }
  const attributes = {
    contactFirstName: contact.contactFirstName,
    contactLastName: contact.contactLastName,
    contactPhone: contact.contactPhone,
    contactEmail: contact.contactEmail,
    demoAccountRequired: false,
    notes: NOTES,
  }
  if (detail) {
    await request("PATCH", `/v1/appStoreReviewDetails/${detail.id}`, {
      body: { data: { type: "appStoreReviewDetails", id: detail.id, attributes } },
    })
  } else {
    await request("POST", "/v1/appStoreReviewDetails", {
      body: {
        data: {
          type: "appStoreReviewDetails",
          attributes,
          relationships: { appStoreVersion: { data: { type: "appStoreVersions", id: target.id } } },
        },
      },
    })
  }
  console.log(`  ✓ Set the App Review contact and notes`)

  // A submission holds what goes to review together; reuse one that hasn't been sent yet
  const { data: open } = await request("GET", "/v1/reviewSubmissions", {
    query: { "filter[app]": appId, "filter[platform]": PLATFORM, "filter[state]": "READY_FOR_REVIEW" },
  })
  let submission = open?.[0]
  if (!submission) {
    ;({ data: submission } = await request("POST", "/v1/reviewSubmissions", {
      body: {
        data: {
          type: "reviewSubmissions",
          attributes: { platform: PLATFORM },
          relationships: { app: { data: { type: "apps", id: appId } } },
        },
      },
    }))
  }
  try {
    await request("POST", "/v1/reviewSubmissionItems", {
      body: {
        data: {
          type: "reviewSubmissionItems",
          relationships: {
            reviewSubmission: { data: { type: "reviewSubmissions", id: submission.id } },
            appStoreVersion: { data: { type: "appStoreVersions", id: target.id } },
          },
        },
      },
    })
  } catch (error) {
    // Already in this submission from an earlier try
    if (error.status !== 409) throw error
  }
  await request("PATCH", `/v1/reviewSubmissions/${submission.id}`, {
    body: { data: { type: "reviewSubmissions", id: submission.id, attributes: { submitted: true } } },
  })
  console.log(`\n✅ Safari ${version} (build ${build}) is submitted for App Review`)
}

main().catch((error) => {
  console.error(`\n❌ ${error.message}`)
  console.error(
    "   Finish it in App Store Connect: https://appstoreconnect.apple.com (resources/app-store-connect.md lists every field)",
  )
  process.exit(1)
})
