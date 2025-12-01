import { resolve } from 'path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
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
    build: {
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'src/renderer/index.html'),
          tas: resolve(__dirname, 'src/renderer/tas.html'),
          settings: resolve(__dirname, 'src/renderer/settings.html'),
          'tab-management': resolve(__dirname, 'src/renderer/tab-management.html')
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
})
