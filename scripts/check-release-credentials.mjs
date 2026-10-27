#!/usr/bin/env node

/**
 * Check that the release credentials still work, without publishing anything, so an expired key
 * or an unaccepted Apple agreement stops a release before it's tagged instead of halfway through.
 *
 *   node scripts/check-release-credentials.mjs                 # every service with credentials set
 *   node scripts/check-release-credentials.mjs chrome apple    # just these
 *   node scripts/check-release-credentials.mjs --require       # unset credentials fail too
 *
 * Chrome: trades the refresh token for an access token and reads the store item. Firefox: an
 * authenticated Add-ons call. Edge: an authenticated Add-ons API call. Apple (on a Mac): lists
 * past notarizations, which Apple refuses while an agreement is waiting to be accepted. App Store
 * Connect: finds the Safari app with the API key that uploads and submits it.
 *
 * Credentials come from the environment, then extension/.env and native/.env when they exist.
 * `npm run release` runs this before tagging, and the Release workflow before it builds.
 */

import { execFileSync } from "child_process"
import { createHmac, randomUUID } from "crypto"
import { client, findApp, missingKeyEnv } from "./app-store-connect.mjs"
import { loadReleaseEnv } from "./env.mjs"

const CHROME_EXTENSION_ID = "mfcjanplaceclfoipcengelejgfngcan"

async function failure(response) {
  const body = (await response.text()).slice(0, 300).replace(/\s+/g, " ")
  return `HTTP ${response.status}${body ? `: ${body}` : ""}`
}

const services = {
  chrome: {
    name: "Chrome Web Store",
    env: ["CHROME_CLIENT_ID", "CHROME_CLIENT_SECRET", "CHROME_REFRESH_TOKEN"],
    async check(env) {
      const token = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        body: new URLSearchParams({
          client_id: env.CHROME_CLIENT_ID,
          client_secret: env.CHROME_CLIENT_SECRET,
          refresh_token: env.CHROME_REFRESH_TOKEN,
          grant_type: "refresh_token",
        }),
      })
      if (!token.ok) return `the refresh token was refused (${await failure(token)})`
      const { access_token } = await token.json()
      const id = env.CHROME_EXTENSION_ID || CHROME_EXTENSION_ID
      const item = await fetch(`https://www.googleapis.com/chromewebstore/v1.1/items/${id}?projection=DRAFT`, {
        headers: { Authorization: `Bearer ${access_token}` },
      })
      if (!item.ok) return `can't read the store item (${await failure(item)})`
    },
  },

  firefox: {
    name: "Firefox Add-ons",
    env: ["FIREFOX_API_KEY", "FIREFOX_API_SECRET"],
    async check(env) {
      const encode = (value) => Buffer.from(JSON.stringify(value)).toString("base64url")
      const now = Math.floor(Date.now() / 1000)
      const unsigned = `${encode({ alg: "HS256", typ: "JWT" })}.${encode({
        iss: env.FIREFOX_API_KEY,
        jti: randomUUID(),
        iat: now,
        exp: now + 60,
      })}`
      const signature = createHmac("sha256", env.FIREFOX_API_SECRET).update(unsigned).digest("base64url")
      const response = await fetch("https://addons.mozilla.org/api/v5/accounts/profile/", {
        headers: { Authorization: `JWT ${unsigned}.${signature}` },
      })
      if (!response.ok) return `the API key was refused (${await failure(response)})`
    },
  },

  edge: {
    name: "Edge Add-ons",
    env: ["EDGE_CLIENT_ID", "EDGE_API_KEY", "EDGE_PRODUCT_ID"],
    async check(env) {
      // There's no plain "who am I" call, so ask about an operation that doesn't exist: a good key
      // gets "not found", an expired or wrong one 401 or 403, a malformed client ID 400
      const response = await fetch(
        `https://api.addons.microsoftedge.microsoft.com/v1/products/${env.EDGE_PRODUCT_ID}/submissions/operations/00000000-0000-0000-0000-000000000000`,
        { headers: { Authorization: `ApiKey ${env.EDGE_API_KEY}`, "X-ClientID": env.EDGE_CLIENT_ID } },
      )
      if ([400, 401, 403].includes(response.status)) {
        return `the API key was refused (${await failure(response)}). Make a new one in Partner Center → Microsoft Edge → Publish API`
      }
    },
  },

  appstoreconnect: {
    name: "App Store Connect",
    env: ["ASC_KEY_ID", "ASC_ISSUER_ID"],
    async check(env) {
      const missing = missingKeyEnv(env)
      if (missing.length) return `not set (${missing.join(", ")})`
      try {
        await findApp(client(env))
      } catch (error) {
        return `the API key was refused (${error.message})`
      }
    },
  },

  apple: {
    name: "Apple notarization",
    env: ["APPLE_ID", "APPLE_APP_SPECIFIC_PASSWORD", "APPLE_TEAM_ID"],
    macOnly: true,
    async check(env) {
      try {
        execFileSync(
          "xcrun",
          [
            "notarytool",
            "history",
            "--apple-id",
            env.APPLE_ID,
            "--password",
            env.APPLE_APP_SPECIFIC_PASSWORD,
            "--team-id",
            env.APPLE_TEAM_ID,
          ],
          { stdio: ["ignore", "ignore", "pipe"], encoding: "utf8" },
        )
      } catch (error) {
        const message = String(error.stderr || error.message)
          .trim()
          .split("\n")
          .slice(-3)
          .join(" ")
        const agreement = /agreement/i.test(message)
          ? ". Accept the updated agreement at https://developer.apple.com/account"
          : ""
        return `notarytool was refused (${message})${agreement}`
      }
    },
  },
}

async function main() {
  const args = process.argv.slice(2)
  const required = args.includes("--require")
  const names = args.filter((arg) => !arg.startsWith("--"))
  const unknown = names.filter((name) => !services[name])
  if (unknown.length) {
    console.error(`Unknown: ${unknown.join(", ")}. Choose from ${Object.keys(services).join(", ")}.`)
    process.exit(2)
  }

  loadReleaseEnv()

  let failed = false
  for (const name of names.length ? names : Object.keys(services)) {
    const service = services[name]
    const missing = service.env.filter((key) => !process.env[key])
    if (service.macOnly && process.platform !== "darwin") {
      console.log(`  - ${service.name}: not checked (needs a Mac)`)
    } else if (missing.length) {
      console.log(`  ${required ? "❌" : "-"} ${service.name}: not set (${missing.join(", ")})`)
      failed ||= required
    } else {
      const problem = await service.check(process.env).catch((error) => `couldn't check (${error.message})`)
      console.log(problem ? `  ❌ ${service.name}: ${problem}` : `  ✅ ${service.name}`)
      failed ||= Boolean(problem)
    }
  }
  process.exit(failed ? 1 : 0)
}

main()
