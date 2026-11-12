import { createClient } from '@supabase/supabase-js'
import { AUTH_PREFIX } from './session.js'
const REMEMBER_KEY = 'nara:remember'

const safe = (fn, fallback = null) => {
  try {
    return fn()
  } catch {
    return fallback // almacenamiento bloqueado (navegación privada estricta)
  }
}

/** "Recordarme": la sesión queda en este dispositivo (localStorage) o solo hasta cerrar el navegador. */
export const remembered = () => safe(() => localStorage.getItem(REMEMBER_KEY) !== '0', true)
export const setRemembered = (on) => safe(() => localStorage.setItem(REMEMBER_KEY, on ? '1' : '0'))

const authStorage = {
  getItem: (key) => safe(() => localStorage.getItem(key) ?? sessionStorage.getItem(key)),
  setItem: (key, value) =>
    safe(() => {
      const [keep, drop] = remembered() ? [localStorage, sessionStorage] : [sessionStorage, localStorage]
      keep.setItem(key, value)
      drop.removeItem(key)
    }),
  removeItem: (key) => safe(() => [localStorage, sessionStorage].forEach((s) => s.removeItem(key))),
}

// Valores públicos: la publishable key está hecha para el navegador
export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
  { auth: { flowType: 'pkce', storage: authStorage, persistSession: true, autoRefreshToken: true } },
)

let leaving = false
/** ¿Se está cerrando la sesión desde esta pestaña? (para no recargar a medio camino) */
export const isLeaving = () => leaving

/**
 * Cierra la sesión y lleva a la landing. No espera más de 3 s a Supabase (con la red lenta u otra
 * pestaña ocupada se quedaba colgado): pase lo que pase, borra la sesión local y sale.
 */
export async function signOutAndLeave(to = '/') {
  leaving = true
  await Promise.race([supabase.auth.signOut().catch(() => undefined), new Promise((r) => setTimeout(r, 3000))])
  safe(() =>
    [localStorage, sessionStorage].forEach((s) =>
      Object.keys(s).filter((k) => k.startsWith(AUTH_PREFIX)).forEach((k) => s.removeItem(k)),
    ),
  )
  window.location.replace(to)
}

// Facebook se activa cuando esté configurado en Supabase (VITE_AUTH_FACEBOOK=true)
export const providers = {
  google: true,
  facebook: import.meta.env.VITE_AUTH_FACEBOOK === 'true',
}

const MESSAGES = {
  'Invalid login credentials': 'Correo o contraseña incorrectos.',
  'Email not confirmed': 'Confirma tu correo: te enviamos un enlace al registrarte.',
  'User already registered': 'Ya existe una cuenta con ese correo. Inicia sesión.',
  'Password should be at least 6 characters.': 'La contraseña debe tener al menos 6 caracteres.',
  'New password should be different from the old password.': 'La contraseña nueva debe ser distinta a la anterior.',
  'Email link is invalid or has expired': 'El enlace venció o ya se usó. Pide uno nuevo.',
  'captcha protection: request disallowed (captcha verification process failed)': 'No pudimos verificar que no eres un robot. Intenta de nuevo.',
  'Email rate limit exceeded': 'Se mandaron muchos correos seguidos. Espera unos minutos e intenta de nuevo.',
  'Request rate limit reached': 'Demasiados intentos. Espera unos minutos e intenta de nuevo.',
}

export function authMessage(error) {
  const message = error?.message
  if (/captcha/i.test(message ?? '')) return MESSAGES['captcha protection: request disallowed (captcha verification process failed)']
  if (/rate limit/i.test(message ?? '')) return MESSAGES['Request rate limit reached']
  if (message?.startsWith('Password should')) return 'La contraseña es muy débil: usa al menos 8 caracteres con mayúscula, minúscula, número y un carácter especial.'
  return MESSAGES[message] ?? message ?? 'Algo salió mal. Intenta de nuevo.'
}
