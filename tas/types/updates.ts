/**
 * The result of a native app update check, shown in Settings → Options.
 */
export type UpdateStatus =
  | { state: "unavailable"; message: string } // a development build, which can't update
  | { state: "up-to-date"; version: string }
  | { state: "downloading"; version: string } // installs on quit once downloaded
  | { state: "ready"; version: string } // downloaded; restart to install
  | { state: "error"; message: string }
