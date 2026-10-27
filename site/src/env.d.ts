/// <reference types="astro/client" />

interface ImportMetaEnv {
  /** The latest published Mac app version, set by .github/workflows/deploy.yml */
  readonly PUBLIC_MAC_APP_VERSION?: string;
  /** The file name of that release's Mac zip, set by .github/workflows/deploy.yml */
  readonly PUBLIC_MAC_APP_ZIP?: string;
}

declare module "*.jpg" {
  const src: string;
  export default src;
}

declare namespace App {
  interface Locals {
    runtime: {
      env: {
        DB: D1Database;
        BETTER_AUTH_URL: string;
        BETTER_AUTH_SECRET: string;
        AUTH_GOOGLE_ID: string;
        AUTH_GOOGLE_SECRET: string;
        /** Sign in with Apple, offered once all four are set (lib/auth.server.ts) */
        AUTH_APPLE_ID?: string;
        AUTH_APPLE_TEAM_ID?: string;
        AUTH_APPLE_KEY_ID?: string;
        AUTH_APPLE_PRIVATE_KEY?: string;
        /** Optional: more Chromium extension ids allowed to sign in, comma-separated (unpacked dev builds) */
        APP_AUTH_EXTENSION_IDS?: string;
      };
    };
  }
}

declare module "*.png" {
  const src: string;
  export default src;
}

declare module "*.svg" {
  const src: string;
  export default src;
}
