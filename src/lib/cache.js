/**
 * Caché en localStorage de las respuestas que cambian poco (planes, coaches, clases…), para no
 * pedirlas al backend en cada visita. Nunca se guardan reservas, membresías, sesiones (cupos),
 * alumnas ni pagos: eso siempre se pide fresco. Solo se usa si la visitante aceptó el
 * almacenamiento de rendimiento (consent.js); si lo rechaza, se borra lo guardado.
 */
import { getConsent, onConsent } from './consent.js'

const PREFIX = 'nara:v1:'
const MIN = 60_000

// Cuánto dura cada respuesta guardada
const TTL = {
  '/plans': 10 * MIN,
  '/plans/mine': 10 * MIN,
  '/coaches': 10 * MIN,
  '/coaches/me': 10 * MIN,
  '/coaches/all': 10 * MIN,
  '/classes': 10 * MIN,
  '/classes/mine': 10 * MIN,
  '/closures': 10 * MIN,
  '/disciplines': 30 * MIN,
  '/disciplines/all': 30 * MIN,
  '/progress/leaderboard': 5 * MIN,
}

// Al cambiar algo, también se borra lo que lo muestra (el nombre de la coach sale en /coaches)
const ALSO_CLEARS = { me: ['coaches'], disciplines: ['plans', 'coaches', 'classes'] }

// Proyecto de Supabase: su sesión se guarda en "sb-<ref>-auth-token"
const SESSION_KEY = `sb-${new URL(import.meta.env.VITE_SUPABASE_URL).hostname.split('.')[0]}-auth-token`

/** La cuenta con sesión, leída sin esperar a Supabase: cada cuenta tiene su propia caché. */
function userId() {
  try {
    return JSON.parse(localStorage.getItem(SESSION_KEY))?.user?.id ?? 'anon'
  } catch {
    return 'anon'
  }
}

const keyOf = (path) => `${PREFIX}${userId()}:${path}`
const segment = (path) => path.split(/[/?]/)[1]

export const isCached = (path) => path in TTL && getConsent() === 'all'

/** Lo guardado para esta ruta: { data, fresh } o null. */
export function peek(path) {
  if (!isCached(path)) return null
  try {
    const hit = JSON.parse(localStorage.getItem(keyOf(path)))
    return hit && { data: hit.data, fresh: Date.now() - hit.at < TTL[path] }
  } catch {
    return null
  }
}

export function remember(path, data) {
  if (!isCached(path)) return
  try {
    localStorage.setItem(keyOf(path), JSON.stringify({ at: Date.now(), data }))
  } catch {
    // Sin espacio o almacenamiento bloqueado: se sigue sin caché
  }
}

/** Borra lo guardado cuya ruta cumple match (de todas las cuentas). */
function clear(match) {
  try {
    for (const key of Object.keys(localStorage)) {
      if (!key.startsWith(PREFIX)) continue
      if (match(key.slice(key.indexOf(':', PREFIX.length) + 1))) localStorage.removeItem(key)
    }
  } catch {
    // Almacenamiento bloqueado: no hay nada que borrar
  }
}

/** Después de crear, editar o borrar algo: olvida lo guardado de esa sección. */
export function forget(path) {
  const sections = [segment(path), ...(ALSO_CLEARS[segment(path)] ?? [])]
  clear((cached) => sections.includes(segment(cached)))
}

// Si rechaza la caché de rendimiento, no se queda nada guardado
onConsent((value) => value !== 'all' && clear(() => true))
