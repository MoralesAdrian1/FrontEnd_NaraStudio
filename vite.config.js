import process from 'node:process'
import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath, pathToFileURL } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

// Cada estudio es una carpeta en src/brands/<id>; VITE_BRAND elige cuál se compila (por defecto, nara).
export default defineConfig(async ({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_')
  const brand = env.VITE_BRAND || 'nara'
  const dir = fileURLToPath(new URL(`./src/brands/${brand}`, import.meta.url))
  if (!existsSync(dir)) throw new Error(`No existe la marca "${brand}" (src/brands/${brand})`)
  const { default: meta } = await import(pathToFileURL(`${dir}/meta.js`).href)

  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')
  const head = {
    '{{TITLE}}': esc(meta.title),
    '{{DESCRIPTION}}': esc(meta.description),
    '{{THEME_COLOR}}': esc(meta.themeColor),
  }

  // Íconos de la marca, servidos en /icons/<nombre> (en dev desde la carpeta, en build copiados a dist)
  const icons = meta.icons ?? {}
  const served = Object.fromEntries(
    Object.entries(icons).filter(([, file]) => file).map(([key, file]) => [`/icons/${key}.png`, `${dir}/${file}`]),
  )
  const manifest = icons[192] && JSON.stringify({
    name: meta.appName ?? meta.title,
    short_name: meta.shortName ?? meta.appName ?? meta.title,
    start_url: '/',
    display: 'standalone',
    background_color: meta.themeColor,
    theme_color: meta.themeColor,
    icons: [
      { src: '/icons/192.png', sizes: '192x192', type: 'image/png' },
      icons[512] && { src: '/icons/512.png', sizes: '512x512', type: 'image/png' },
      icons.maskable && { src: '/icons/maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ].filter(Boolean),
  })
  const link = (rel, href, extra = {}) => ({ tag: 'link', attrs: { rel, href, ...extra }, injectTo: 'head' })
  const tags = [
    link('icon', icons.favicon ? '/icons/favicon.png' : '/favicon.svg', icons.favicon ? { type: 'image/png' } : {}),
    icons.apple && link('apple-touch-icon', '/icons/apple.png'),
    manifest && link('manifest', '/manifest.webmanifest'),
    // Hoja de letras externa, solo si la marca la usa (Nara las trae dentro de su carpeta)
    meta.fonts && link('stylesheet', meta.fonts),
  ].filter(Boolean)

  // Política de seguridad de contenido (solo al compilar; en desarrollo Vite necesita más permisos).
  // Se arma con los dominios de este estudio: su Supabase, su API y, si se usa, Turnstile.
  const origin = (url) => (url ? new URL(url).origin : '')
  const supabase = origin(env.VITE_SUPABASE_URL)
  const turnstile = env.VITE_TURNSTILE_SITE_KEY ? 'https://challenges.cloudflare.com' : ''
  const csp = [
    "default-src 'self'",
    `script-src 'self' ${turnstile}`,
    "style-src 'self' 'unsafe-inline'",
    `img-src 'self' data: blob: ${supabase} https://*.tile.openstreetmap.org`,
    "font-src 'self'",
    "media-src 'self'",
    `connect-src 'self' ${supabase} ${supabase.replace('https://', 'wss://')} ${origin(env.VITE_API_URL)}`,
    `frame-src ${turnstile || "'none'"}`,
    "worker-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    'upgrade-insecure-requests',
  ].map((d) => d.replace(/\s+/g, ' ').trim()).join('; ')

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
      {
        name: 'security-csp',
        apply: 'build',
        transformIndexHtml: () => [{ tag: 'meta', attrs: { 'http-equiv': 'Content-Security-Policy', content: csp }, injectTo: 'head-prepend' }],
      },
      {
        name: 'brand-icons',
        transformIndexHtml: () => tags,
        configureServer(server) {
          server.middlewares.use((req, res, next) => {
            const path = req.url?.split('?')[0]
            if (path === '/manifest.webmanifest' && manifest) {
              res.setHeader('Content-Type', 'application/manifest+json')
              return res.end(manifest)
            }
            if (!served[path]) return next()
            res.setHeader('Content-Type', 'image/png')
            res.end(readFileSync(served[path]))
          })
        },
        generateBundle() {
          for (const [url, file] of Object.entries(served)) {
            this.emitFile({ type: 'asset', fileName: url.slice(1), source: readFileSync(file) })
          }
          if (manifest) this.emitFile({ type: 'asset', fileName: 'manifest.webmanifest', source: manifest })
        },
      },
    ],
    resolve: { alias: { '@brand': dir } },
    server: {
      proxy: { '/api': 'http://localhost:3000' },
    },
  }
})
