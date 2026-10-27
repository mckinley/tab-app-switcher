import { existsSync, readFileSync } from "fs"
import { join, dirname } from "path"
import { fileURLToPath } from "url"

export const rootDir = join(dirname(fileURLToPath(import.meta.url)), "..")

/**
 * Loads extension/.env and native/.env, where the release credentials live on a Mac, without
 * overriding what's already in the environment (in CI, the repository secrets)
 */
export function loadReleaseEnv() {
  for (const file of ["extension/.env", "native/.env"]) {
    const path = join(rootDir, file)
    if (!existsSync(path)) continue
    for (const line of readFileSync(path, "utf8").split("\n")) {
      const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/)
      if (!match || process.env[match[1]]) continue
      process.env[match[1]] = match[2].replace(/^(["'])(.*)\1$/, "$2")
    }
  }
}
