#!/usr/bin/env node

/**
 * Release Tab Application Switcher: the browser extension and the Mac app, at one version.
 *
 *   npm run release patch    # 1.2.4 -> 1.2.5
 *   npm run release minor    # 1.2.4 -> 1.3.0
 *   npm run release major    # 1.2.4 -> 2.0.0
 *   npm run release 1.3.0    # a specific version
 *
 * On an up-to-date, clean main, this runs the checks CI runs (format, lint, typechecks, unit
 * tests), bumps the version in every project, commits, tags vX.Y.Z and pushes both. The tag
 * starts .github/workflows/release.yml, which builds, signs and notarizes the Mac app into a
 * GitHub release and submits the extension to the Chrome, Firefox and Edge stores. Safari is
 * still separate: `npm run publish:safari` in extension/, on a Mac.
 *
 * The workflow needs the signing and store credentials as repository secrets; `npm run
 * release:secrets` copies them there from a Mac (scripts/release-secrets.sh).
 *
 * Flags (after `--`, as in `npm run release -- patch --local`):
 *   --local            Publish from this computer instead, with native/.env and extension/.env
 *                      (--extension-only or --native-only to do half). The tag says so, and the
 *                      release workflow then only runs CI for it.
 *   --skip-checks      Don't run the checks first (the release workflow runs them anyway)
 */

import { execSync } from "child_process"
import { readFileSync, rmSync, writeFileSync } from "fs"
import { join, dirname } from "path"
import { fileURLToPath } from "url"
import dotenv from "dotenv"

const __dirname = dirname(fileURLToPath(import.meta.url))
const rootDir = join(__dirname, "..")
const REPO = "mckinley/tab-app-switcher"

const FILES_TO_UPDATE = [
  { path: "native/package.json", type: "json", field: "version" },
  { path: "extension/package.json", type: "json", field: "version" },
  { path: "extension/wxt.config.ts", type: "wxt" },
]

/** Repository secrets the release workflow can't publish the Mac app without */
const MAC_SECRETS = ["CSC_LINK", "CSC_KEY_PASSWORD", "APPLE_ID", "APPLE_APP_SPECIFIC_PASSWORD", "APPLE_TEAM_ID"]

function readJson(filePath) {
  return JSON.parse(readFileSync(join(rootDir, filePath), "utf8"))
}

function writeJson(filePath, data) {
  writeFileSync(join(rootDir, filePath), JSON.stringify(data, null, 2) + "\n")
}

function getCurrentVersion() {
  const pkg = readJson("native/package.json")
  return pkg.version
}

function bumpVersion(current, type) {
  const [major, minor, patch] = current.split(".").map(Number)

  switch (type) {
    case "major":
      return `${major + 1}.0.0`
    case "minor":
      return `${major}.${minor + 1}.0`
    case "patch":
      return `${major}.${minor}.${patch + 1}`
    default:
      // Assume it's a specific version
      if (/^\d+\.\d+\.\d+$/.test(type)) {
        return type
      }
      throw new Error(`Invalid version type: ${type}`)
  }
}

function updateJsonVersion(filePath, version) {
  const data = readJson(filePath)
  data.version = version
  // Always increment build number for extension (required for Safari App Store)
  if (filePath === "extension/package.json" && typeof data.build === "number") {
    data.build = data.build + 1
    console.log(`  ✓ ${filePath} (build ${data.build})`)
  } else {
    console.log(`  ✓ ${filePath}`)
  }
  writeJson(filePath, data)
}

function updateWxtConfig(filePath, version) {
  const fullPath = join(rootDir, filePath)
  let content = readFileSync(fullPath, "utf8")
  content = content.replace(/version:\s*["'][\d.]+["']/, `version: "${version}"`)
  writeFileSync(fullPath, content)
  console.log(`  ✓ ${filePath}`)
}

function run(cmd, options = {}) {
  console.log(`\n$ ${cmd}`)
  execSync(cmd, { stdio: "inherit", cwd: rootDir, ...options })
}

function output(cmd) {
  return execSync(cmd, { cwd: rootDir, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim()
}

function fail(message) {
  console.error(`\n❌ ${message}`)
  process.exit(1)
}

/** A release goes out from main, with nothing uncommitted and nothing on origin missing */
function checkGitState() {
  if (output("git status --porcelain")) {
    fail("There are uncommitted changes. Commit or stash them first.")
  }
  const branch = output("git rev-parse --abbrev-ref HEAD")
  if (branch !== "main") fail(`Releases go out from main, and this is ${branch}.`)
  run("git fetch origin main --tags")
  if (output("git rev-list --count HEAD..origin/main") !== "0") {
    fail("origin/main has commits this branch doesn't. Pull first.")
  }
}

/** Names of the repository's Actions secrets, or null when the GitHub CLI can't tell */
function repoSecretNames() {
  try {
    return JSON.parse(output(`gh secret list --repo ${REPO} --json name`)).map((secret) => secret.name)
  } catch {
    return null
  }
}

function publishLocally(version, { extensionOnly, nativeOnly }) {
  if (!extensionOnly) {
    console.log(`\n🖥️  Publishing native app to GitHub...`)
    const nativeEnv = dotenv.config({ path: join(rootDir, "native/.env") })
    if (nativeEnv.error) {
      throw new Error(`Failed to load native/.env: ${nativeEnv.error.message}`)
    }
    run("npm run publish:mac", { cwd: join(rootDir, "native") })
    try {
      run(`./scripts/release-notes.sh v${version} > .release-notes.md`)
      run(`gh release edit v${version} --repo ${REPO} --notes-file .release-notes.md`)
    } catch {
      console.log(`   Couldn't add the release notes: https://github.com/${REPO}/releases/tag/v${version}`)
    } finally {
      rmSync(join(rootDir, ".release-notes.md"), { force: true })
    }
    // The site links to the latest published release, so deploy it again now there's a new one
    try {
      run(`gh workflow run deploy.yml --repo ${REPO} --ref main`)
    } catch {
      console.log(`   Redeploy the site so its download link moves to the new version:`)
      console.log(`   https://github.com/${REPO}/actions/workflows/deploy.yml → Run workflow`)
    }
  }

  if (!nativeOnly) {
    console.log(`\n🧩 Publishing extension to browser stores...`)
    const extensionEnv = dotenv.config({ path: join(rootDir, "extension/.env") })
    if (extensionEnv.error) {
      throw new Error(`Failed to load extension/.env: ${extensionEnv.error.message}`)
    }
    run("npm run publish:all", { cwd: join(rootDir, "extension") })
  }
}

async function main() {
  const args = process.argv.slice(2)
  const versionType = args.find((arg) => !arg.startsWith("--"))
  const local = args.includes("--local")
  const skipChecks = args.includes("--skip-checks")
  const extensionOnly = args.includes("--extension-only")
  const nativeOnly = args.includes("--native-only")

  if (!versionType) {
    console.error(
      "Usage: npm run release -- <patch|minor|major|x.y.z> [--local [--extension-only|--native-only]] [--skip-checks]",
    )
    process.exit(1)
  }

  checkGitState()

  const currentVersion = getCurrentVersion()
  const newVersion = bumpVersion(currentVersion, versionType)
  if (output(`git tag --list v${newVersion}`)) fail(`v${newVersion} is already tagged.`)

  if (!local) {
    const secrets = repoSecretNames()
    const missing = secrets && MAC_SECRETS.filter((name) => !secrets.includes(name))
    if (missing?.length) {
      fail(
        `The release workflow needs these repository secrets to sign the Mac app: ${missing.join(", ")}.\n` +
          `   Copy them from this Mac with \`npm run release:secrets\`, or publish from it with --local.`,
      )
    }
  }

  console.log(`\n📦 Releasing Tab Application Switcher`)
  console.log(`   Current version: ${currentVersion}`)
  console.log(`   New version: ${newVersion}`)

  if (!skipChecks) {
    console.log(`\n🔍 Running the checks CI runs...`)
    run("npm run check")
    run("npm run test:all")
  }

  console.log(`\n📝 Updating version numbers...`)
  for (const file of FILES_TO_UPDATE) {
    if (file.type === "json") {
      updateJsonVersion(file.path, newVersion)
    } else if (file.type === "wxt") {
      updateWxtConfig(file.path, newVersion)
    }
  }

  console.log(`\n📤 Committing, tagging and pushing...`)
  run(`git add ${FILES_TO_UPDATE.map((file) => file.path).join(" ")}`)
  run(`git commit -m "Release v${newVersion}"`)
  // The release workflow reads "Published locally" to leave the release to this computer
  run(`git tag -a v${newVersion} -m "Release v${newVersion}"${local ? ' -m "Published locally"' : ""}`)
  // Both or neither, so a tag never points at a commit main doesn't have
  run(`git push --atomic origin main v${newVersion}`)

  if (local) {
    publishLocally(newVersion, { extensionOnly, nativeOnly })
    console.log(`\n✅ Release v${newVersion} published from this computer.`)
  } else {
    console.log(`\n✅ v${newVersion} is tagged. GitHub Actions is publishing it:`)
    console.log(`   https://github.com/${REPO}/actions/workflows/release.yml`)
  }

  console.log(`\n   GitHub Release: https://github.com/${REPO}/releases/tag/v${newVersion}`)
  console.log(`   Chrome Web Store: https://chrome.google.com/webstore/detail/mfcjanplaceclfoipcengelejgfngcan`)
  console.log(`   Firefox Add-ons: https://addons.mozilla.org/firefox/addon/tab-application-switcher/`)
  console.log(`   Edge Add-ons: https://microsoftedge.microsoft.com/addons/detail/epfinbjjhhlpbfcdmdhnddbjebmbkjck`)
  console.log(`\n   Safari: run \`npm run publish:safari\` in extension/, then submit the build in App Store Connect.`)
}

main().catch((error) => {
  console.error("\n❌ Release failed:", error.message)
  process.exit(1)
})
