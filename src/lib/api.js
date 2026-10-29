import { supabase } from './supabase.js'

// En desarrollo Vite redirige /api al backend; en producción se define VITE_API_URL
const BASE = import.meta.env.VITE_API_URL ?? ''

// Peticiones en curso, para mostrar "Cargando…" o "Guardando…"
const inFlight = { reads: 0, writes: 0 }
const listeners = new Set()
const changed = (kind, delta) => {
  inFlight[kind] += delta
  for (const fn of listeners) fn({ ...inFlight })
}

/** Avisa cada vez que cambian las peticiones en curso; devuelve cómo dejar de escuchar. */
export function onRequests(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

/** Llama al backend con la sesión de Supabase. */
export async function api(path, { method = 'GET', body } = {}) {
  const kind = method === 'GET' ? 'reads' : 'writes'
  changed(kind, 1)
  try {
    const { data } = await supabase.auth.getSession()
    const token = data.session?.access_token
    const res = await fetch(`${BASE}/api${path}`, {
      method,
      headers: {
        'content-type': 'application/json',
        ...(token && { authorization: `Bearer ${token}` }),
      },
      body: body && JSON.stringify(body),
    })
    const json = await res.json().catch(() => null)
    if (!res.ok) {
      const message = Array.isArray(json?.message) ? json.message.join('. ') : json?.message
      throw Object.assign(new Error(message ?? 'No se pudo completar la solicitud.'), { status: res.status })
    }
    return json
  } catch (e) {
    // Sin conexión o el servidor no responde
    if (e instanceof TypeError) throw new Error('No hay conexión con el servidor. Intenta de nuevo.')
    throw e
  } finally {
    changed(kind, -1)
  }
}
