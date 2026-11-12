// Llave pública de Cloudflare Turnstile (protección contra bots). Vacía = sin verificación.
export const CAPTCHA_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY || ''
