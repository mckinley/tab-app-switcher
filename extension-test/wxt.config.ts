import { defineConfig } from 'wxt';

// See https://wxt.dev/api/config.html
export default defineConfig({
  manifest: {
    commands: {
      // === COMMANDS (max 4) ===
      'alt-tab': {
        suggested_key: { default: 'Alt+Tab' },
        description: 'Alt+Tab',
      },
      'alt-q': {
        suggested_key: { default: 'Alt+Q' },
        description: 'Alt+Q',
      },
      'ctrl-tab': {
        suggested_key: { default: 'Ctrl+Tab' },
        description: 'Ctrl+Tab',
      },
      'ctrl-q': {
        suggested_key: { default: 'Ctrl+Q' },
        description: 'Ctrl+Q',
      },
      // 'ctrl-shift-tab': {
      //   suggested_key: { default: 'Ctrl+Shift+Tab' },
      //   description: 'Ctrl+Shift+Tab',
      // },
      // 'ctrl-shift-q': {
      //   suggested_key: { default: 'Ctrl+Shift+Q' },
      //   description: 'Ctrl+Shift+Q',
      // },
      // 'alt-shift-tab': {
      //   suggested_key: { default: 'Alt+Shift+Tab' },
      //   description: 'Alt+Shift+Tab',
      // },
      // 'alt-shift-q': {
      //   suggested_key: { default: 'Alt+Shift+Q' },
      //   description: 'Alt+Shift+Q',
      // },
    },
  },
});
