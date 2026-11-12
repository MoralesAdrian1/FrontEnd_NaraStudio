// Saber si hay sesión sin cargar supabase-js (que pesa ~200 KB): basta con ver si su llave está
// guardada en el navegador. Para hablar con Supabase se sigue usando lib/supabase.js.
const ref = new URL(import.meta.env.VITE_SUPABASE_URL).hostname.split('.')[0]

// Claves de Supabase en el navegador: "sb-<ref>-auth-token" (la sesión) y sus variantes
export const AUTH_PREFIX = `sb-${ref}-`
export const SESSION_KEY = `${AUTH_PREFIX}auth-token`

export function storedSession() {
  try {
    return JSON.parse(localStorage.getItem(SESSION_KEY) ?? sessionStorage.getItem(SESSION_KEY))
  } catch {
    return null
  }
}

export const hasStoredSession = () => !!storedSession()?.access_token
