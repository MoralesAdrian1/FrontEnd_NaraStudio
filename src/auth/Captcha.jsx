import { useEffect, useRef } from 'react'
import { CAPTCHA_KEY } from './captcha-key.js'

/**
 * Protección contra bots con Cloudflare Turnstile (casi nunca pide resolver nada).
 * Se activa con VITE_TURNSTILE_SITE_KEY; Supabase verifica el token con la secret key que se
 * configura en Authentication → Attack Protection. Sin la variable, no se muestra nada.
 */
const SCRIPT = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'

let loading = null
function loadTurnstile() {
  loading ??= new Promise((resolve, reject) => {
    const s = document.createElement('script')
    s.src = SCRIPT
    s.async = true
    s.onload = () => resolve(window.turnstile)
    s.onerror = () => {
      loading = null
      reject(new Error('No se pudo cargar la verificación'))
    }
    document.head.appendChild(s)
  })
  return loading
}

/**
 * Muestra el widget y avisa el token con onToken (null cuando vence o falla). Cada token sirve
 * una sola vez: cambia `resetKey` para pedir uno nuevo después de cada intento.
 */
export function Captcha({ onToken, resetKey = 0 }) {
  const box = useRef(null)
  const widget = useRef(null)
  const cb = useRef(onToken)
  useEffect(() => {
    cb.current = onToken
  }, [onToken])

  useEffect(() => {
    if (!CAPTCHA_KEY) return undefined
    let alive = true
    loadTurnstile()
      .then((ts) => {
        if (!alive || !box.current) return
        widget.current = ts.render(box.current, {
          sitekey: CAPTCHA_KEY,
          language: 'es',
          appearance: 'interaction-only',
          callback: (t) => cb.current(t),
          'expired-callback': () => cb.current(null),
          'error-callback': () => cb.current(null),
        })
      })
      .catch(() => cb.current(null))
    return () => {
      alive = false
      if (widget.current != null) window.turnstile?.remove(widget.current)
      widget.current = null
    }
  }, [])

  // Después de cada intento: token nuevo
  useEffect(() => {
    if (resetKey && widget.current != null) {
      cb.current(null)
      window.turnstile?.reset(widget.current)
    }
  }, [resetKey])

  if (!CAPTCHA_KEY) return null
  return <div ref={box} className="auth-captcha" />
}
