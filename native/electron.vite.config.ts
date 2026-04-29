import { resolve } from 'path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import { loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    main: {
      plugins: [externalizeDepsPlugin()],
      resolve: {
        alias: {
          '@tas': resolve(__dirname, '../tas')
        }
      }
    },
    preload: {
      plugins: [externalizeDepsPlugin()]
    },
    renderer: {
      server: { port: parseInt(env.PORT ?? '', 10) || 4607 },
      build: {
        rollupOptions: {
          input: {
            tas: resolve(__dirname, 'src/renderer/tas.html'),
            settings: resolve(__dirname, 'src/renderer/settings.html'),
            'tab-management': resolve(__dirname, 'src/renderer/tab-management.html'),
            about: resolve(__dirname, 'src/renderer/about.html')
          }
        }
      },
      resolve: {
        alias: {
          '@renderer': resolve('src/renderer/src'),
          '@tas': resolve(__dirname, '../tas'),
          '@': resolve(__dirname, '.')
        },
        dedupe: ['react', 'react-dom']
      },
      plugins: [react()]
    }
  }
})
