import { api } from './api.js'

/**
 * Pedir el perfil (/me) por adelantado: al iniciar sesión se pide mientras se descarga el panel,
 * y la página de cuenta usa esa misma petición en lugar de esperar otra.
 */
let pending = null

export function prefetchMe() {
  pending ??= api('/me', { force: true }).catch((e) => {
    pending = null
    throw e
  })
  // Evita el aviso de "promesa rechazada sin manejar": quien la tome verá el error
  pending.catch(() => undefined)
  return pending
}

/** La petición adelantada (y se olvida), o una nueva. */
export function loadMe() {
  const p = pending ?? api('/me', { force: true })
  pending = null
  return p
}

/** Descarga el código del panel antes de necesitarlo. */
export const prefetchPanel = () => import('../panel/Panel.jsx')
