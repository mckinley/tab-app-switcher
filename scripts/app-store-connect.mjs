/**
 * A small App Store Connect API client (https://developer.apple.com/documentation/appstoreconnectapi),
 * signed with an API key from App Store Connect → Users and Access → Integrations.
 *
 * The key comes from the environment: ASC_KEY_ID, ASC_ISSUER_ID, and the .p8 file's contents in
 * ASC_KEY_P8 (as in the GitHub secret) or its path in ASC_KEY_PATH (as in native/.env).
 */

import { createPrivateKey, sign } from "crypto"
import { readFileSync } from "fs"
import { homedir } from "os"

export const BUNDLE_ID = "app.tabswitcher.tab-application-switcher"

const API = "https://api.appstoreconnect.apple.com"

/** Names of the variables the key needs that aren't set, or [] */
export function missingKeyEnv(env = process.env) {
  const missing = ["ASC_KEY_ID", "ASC_ISSUER_ID"].filter((name) => !env[name])
  if (!env.ASC_KEY_P8 && !env.ASC_KEY_PATH) missing.push("ASC_KEY_P8 or ASC_KEY_PATH")
  return missing
}

/** The .p8 key's contents, from ASC_KEY_P8 or the file at ASC_KEY_PATH */
export function keyContents(env = process.env) {
  return env.ASC_KEY_P8 || readFileSync(env.ASC_KEY_PATH.replace(/^~(?=\/)/, homedir()), "utf8")
}

function token(env) {
  const encode = (value) => Buffer.from(JSON.stringify(value)).toString("base64url")
  const now = Math.floor(Date.now() / 1000)
  const unsigned = `${encode({ alg: "ES256", kid: env.ASC_KEY_ID, typ: "JWT" })}.${encode({
    iss: env.ASC_ISSUER_ID,
    iat: now,
    // Apple allows at most 20 minutes
    exp: now + 15 * 60,
    aud: "appstoreconnect-v1",
  })}`
  const signature = sign("sha256", Buffer.from(unsigned), {
    key: createPrivateKey(keyContents(env)),
    dsaEncoding: "ieee-p1363",
  })
  return `${unsigned}.${signature.toString("base64url")}`
}

export class AppStoreConnectError extends Error {
  constructor(method, path, status, body) {
    const details = body?.errors?.map((error) => error.detail || error.title).join("; ")
    super(`${method} ${path}: HTTP ${status}${details ? `: ${details}` : ""}`)
    this.status = status
    this.errors = body?.errors ?? []
  }
}

/** request("GET", "/v1/apps", { query }) or request("POST", "/v1/...", { body }); returns the JSON */
export function client(env = process.env) {
  let cached = { value: "", expires: 0 }
  const bearer = () => {
    if (Date.now() > cached.expires) cached = { value: token(env), expires: Date.now() + 10 * 60 * 1000 }
    return cached.value
  }

  return async function request(method, path, { query, body } = {}) {
    const url = new URL(path, API)
    for (const [name, value] of Object.entries(query ?? {})) url.searchParams.set(name, value)
    const response = await fetch(url, {
      method,
      headers: { Authorization: `Bearer ${bearer()}`, ...(body ? { "Content-Type": "application/json" } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    })
    const text = await response.text()
    const json = text ? JSON.parse(text) : null
    if (!response.ok) throw new AppStoreConnectError(method, path, response.status, json)
    return json
  }
}

/** The app's App Store Connect id */
export async function findApp(request) {
  const { data } = await request("GET", "/v1/apps", { query: { "filter[bundleId]": BUNDLE_ID } })
  if (!data?.length) throw new Error(`No app with the bundle ID ${BUNDLE_ID} in App Store Connect`)
  return data[0].id
}
