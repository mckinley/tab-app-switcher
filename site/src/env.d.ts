/// <reference types="astro/client" />

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
