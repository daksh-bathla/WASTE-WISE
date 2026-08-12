/* global process */
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'
import os from 'node:os'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  cacheDir: process.env.VITE_CACHE_DIR || path.join(os.tmpdir(), 'wastewise-vite-cache'),
})
