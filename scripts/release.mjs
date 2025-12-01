#!/usr/bin/env node

/**
 * Unified release script for Tab Application Switcher
 *
 * Usage:
 *   npm run release patch    # 0.1.0 -> 0.1.1
 *   npm run release minor    # 0.1.0 -> 0.2.0
 *   npm run release major    # 0.1.0 -> 1.0.0
 *   npm run release 1.2.3    # Set specific version
 */

import { execSync } from "child_process"
import { readFileSync, writeFileSync } from "fs"
import { join, dirname } from "path"
import { fileURLToPath } from "url"
import dotenv from "dotenv"

const __dirname = dirname(fileURLToPath(import.meta.url))
const rootDir = join(__dirname, "..")

const FILES_TO_UPDATE = [
  { path: "native/package.json", type: "json", field: "version" },
  { path: "extension/package.json", type: "json", field: "version" },
  { path: "extension/wxt.config.ts", type: "wxt" },
]

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
  writeJson(filePath, data)
  console.log(`  ✓ ${filePath}`)
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

function hasUncommittedChanges() {
  try {
    const status = execSync("git status --porcelain", { cwd: rootDir, encoding: "utf8" })
    return status.trim().length > 0
  } catch {
    return true
  }
}

async function main() {
  const args = process.argv.slice(2)
  const versionType = args[0]
  const skipGit = args.includes("--skip-git")
  const extensionOnly = args.includes("--extension-only")
  const nativeOnly = args.includes("--native-only")

  if (!versionType) {
    console.error("Usage: npm run release <patch|minor|major|x.y.z> [--skip-git] [--extension-only] [--native-only]")
    process.exit(1)
  }

  if (hasUncommittedChanges()) {
    console.error("\n❌ There are uncommitted changes in the repository.")
    console.error("   Please commit or stash your changes before running the release script.")
    process.exit(1)
  }

  const currentVersion = getCurrentVersion()
  const newVersion = bumpVersion(currentVersion, versionType)

  console.log(`\n📦 Releasing Tab Application Switcher`)
  console.log(`   Current version: ${currentVersion}`)
  console.log(`   New version: ${newVersion}`)

  // Update version in all files
  console.log(`\n📝 Updating version numbers...`)
  for (const file of FILES_TO_UPDATE) {
    if (file.type === "json") {
      updateJsonVersion(file.path, newVersion)
    } else if (file.type === "wxt") {
      updateWxtConfig(file.path, newVersion)
    }
  }

  // Run prep to ensure everything is clean
  console.log(`\n🧹 Running prep...`)
  run("npm run prep")

  // Git commit and tag
  if (!skipGit) {
    console.log(`\n📤 Committing and tagging...`)
    run(`git add -A`)
    run(`git commit -m "Release v${newVersion}"`)
    run(`git tag -a v${newVersion} -m "Release v${newVersion}"`)
    run(`git push origin main --tags`)
  }

  // Publish native app
  if (!extensionOnly) {
    console.log(`\n🖥️  Publishing native app to GitHub...`)
    const nativeEnv = dotenv.config({ path: join(rootDir, "native/.env") })
    if (nativeEnv.error) {
      throw new Error(`Failed to load native/.env: ${nativeEnv.error.message}`)
    }
    run("npm run publish:mac", { cwd: join(rootDir, "native") })
  }

  // Publish extension
  if (!nativeOnly) {
    console.log(`\n🧩 Publishing extension to browser stores...`)
    const extensionEnv = dotenv.config({ path: join(rootDir, "extension/.env") })
    if (extensionEnv.error) {
      throw new Error(`Failed to load extension/.env: ${extensionEnv.error.message}`)
    }
    run("npm run publish:all", { cwd: join(rootDir, "extension") })
  }

  console.log(`\n✅ Release v${newVersion} complete!`)
  console.log(`\n   GitHub Release: https://github.com/mckinley/tab-app-switcher/releases/tag/v${newVersion}`)
  console.log(`   Chrome Web Store: https://chrome.google.com/webstore/detail/mfcjanplaceclfoipcengelejgfngcan`)
  console.log(`   Firefox Add-ons: https://addons.mozilla.org/firefox/addon/tab-application-switcher/`)
  console.log(`   Edge Add-ons: https://microsoftedge.microsoft.com/addons/detail/epfinbjjhhlpbfcdmdhnddbjebmbkjck`)
}

main().catch((error) => {
  console.error("\n❌ Release failed:", error.message)
  process.exit(1)
})
