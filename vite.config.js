import process from 'node:process'
import { existsSync } from 'node:fs'
import { fileURLToPath, pathToFileURL } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

// Cada estudio es una carpeta en src/brands/<id>; VITE_BRAND elige cuál se compila (por defecto, nara).
export default defineConfig(async ({ mode }) => {
  const brand = loadEnv(mode, process.cwd(), 'VITE_').VITE_BRAND || 'nara'
  const dir = fileURLToPath(new URL(`./src/brands/${brand}`, import.meta.url))
  if (!existsSync(dir)) throw new Error(`No existe la marca "${brand}" (src/brands/${brand})`)
  const { default: meta } = await import(pathToFileURL(`${dir}/meta.js`).href)

  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')
  const head = {
    '{{TITLE}}': esc(meta.title),
    '{{DESCRIPTION}}': esc(meta.description),
    '{{THEME_COLOR}}': esc(meta.themeColor),
    '{{FONTS}}': esc(meta.fonts),
    '{{FAVICON}}': meta.favicon ? `/src/brands/${brand}/${meta.favicon}` : '/favicon.svg',
  }

  return {
    plugins: [
      react(),
      {
        name: 'brand-head',
        transformIndexHtml: {
          order: 'pre',
          handler: (html) => Object.entries(head).reduce((out, [key, value]) => out.replaceAll(key, value), html),
        },
      },
    ],
    resolve: { alias: { '@brand': dir } },
    server: {
      proxy: { '/api': 'http://localhost:3000' },
    },
  }
})
