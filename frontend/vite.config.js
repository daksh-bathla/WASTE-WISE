/* global process */
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'
import os from 'node:os'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({

  plugins: [react(), VitePWA({
    manifest: {
      name: "WasteWise",
      short_name: "WasteWise",
      start_url: "/",
      display: "standalone",
      background_color: "#ffffff",
      theme_color: "#52B788",
      icons: [
        {
          src: "/wastewise-logo.svg",
          sizes: "any",
          type: "image/svg+xml",
          purpose: "any maskable"
        }
      ]
    }
  })],
  cacheDir: process.env.VITE_CACHE_DIR || path.join(os.tmpdir(), 'wastewise-vite-cache'),
})
