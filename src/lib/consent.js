// Elección de la visitante sobre el almacenamiento del navegador (ver /cookies).
// 'all' = también la caché de rendimiento; 'necessary' = solo la sesión.
const KEY = 'nara:consent'
const listeners = new Set()

export function getConsent() {
  try {
    return localStorage.getItem(KEY)
  } catch {
    return null
  }
}

export function setConsent(value) {
  try {
    localStorage.setItem(KEY, value)
  } catch {
    // Almacenamiento bloqueado: se vuelve a preguntar en la próxima visita
  }
  for (const fn of listeners) fn(value)
}

/** Para volver a mostrar el aviso desde "Preferencias de almacenamiento". */
export function resetConsent() {
  try {
    localStorage.removeItem(KEY)
  } catch {
    // nada que borrar
  }
  for (const fn of listeners) fn(null)
}

export function onConsent(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}
