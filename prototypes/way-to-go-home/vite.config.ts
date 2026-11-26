import { fileURLToPath } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig(({ command }) => ({
  root: fileURLToPath(new URL('.', import.meta.url)),
  cacheDir: fileURLToPath(new URL('../../node_modules/.vite-way-to-go-home', import.meta.url)),
  base: command === 'serve' ? '/prototypes/way-to-go-home/' : './',
  plugins: [react()],
  server: { host: '127.0.0.1', port: 5180 },
}))
