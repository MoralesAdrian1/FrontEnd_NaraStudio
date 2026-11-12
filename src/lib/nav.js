/**
 * Navegación sin recargar la página entre las rutas de la app (/, /entrar, /cuenta…).
 * Así, al iniciar sesión no se vuelve a descargar ni a arrancar todo: solo se cambia de página.
 */
import { useEffect, useState } from 'react'

const EVENT = 'nara:navigate'

export function navigate(path, { replace = false } = {}) {
  const url = new URL(path, window.location.origin)
  if (url.origin !== window.location.origin) return window.location.assign(path)
  window.history[replace ? 'replaceState' : 'pushState'](null, '', url.pathname + url.search + url.hash)
  window.scrollTo({ top: 0 })
  window.dispatchEvent(new Event(EVENT))
  if (url.hash) scrollToHash(url.hash)
}

/** Con ancla (/#horario): espera a que la página nueva pinte esa sección y baja hasta ella. */
function scrollToHash(hash, tries = 40) {
  const el = document.getElementById(decodeURIComponent(hash.slice(1)))
  if (el) return el.scrollIntoView()
  if (tries > 0) setTimeout(() => scrollToHash(hash, tries - 1), 50)
}

/** La ruta actual (sin la barra final); se actualiza al navegar o con atrás/adelante. */
export function usePath() {
  const read = () => window.location.pathname.replace(/(.)\/$/, '$1')
  const [path, setPath] = useState(read)
  useEffect(() => {
    const update = () => setPath(read())
    window.addEventListener(EVENT, update)
    window.addEventListener('popstate', update)
    return () => {
      window.removeEventListener(EVENT, update)
      window.removeEventListener('popstate', update)
    }
  }, [])
  return path
}

/**
 * Los enlaces normales (<a href="/entrar">) a rutas de la app también navegan sin recargar.
 * Se respetan: otra pestaña, teclas modificadoras, descargas, otros sitios y anclas (#horario).
 */
export function interceptLinks(isAppRoute) {
  const onClick = (e) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
    const a = e.target.closest?.('a[href]')
    if (!a || a.target === '_blank' || a.hasAttribute('download')) return
    const url = new URL(a.href, window.location.href)
    if (url.origin !== window.location.origin || !isAppRoute(url.pathname)) return
    const samePage = url.pathname === window.location.pathname && url.search === window.location.search
    if (samePage && url.hash) return // ancla en la misma página: el navegador ya lo hace
    e.preventDefault()
    navigate(url.pathname + url.search + url.hash)
  }
  document.addEventListener('click', onClick)
  return () => document.removeEventListener('click', onClick)
}
