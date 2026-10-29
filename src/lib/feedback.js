/*
 * Avisos de la app, para usar desde cualquier parte:
 *   notify('ok' | 'error' | 'info', texto)   → aviso flotante que se cierra solo
 *   await confirmDialog('¿Borrar…?')          → ventana para confirmar (true / false)
 * Los muestra <Feedback /> (panel/feedback.jsx), que se registra al montarse.
 */

let handlers = null

/** <Feedback /> se registra aquí; devuelve cómo dar de baja. */
export function registerFeedback(h) {
  handlers = h
  return () => {
    if (handlers === h) handlers = null
  }
}

export function notify(kind, text) {
  if (text) handlers?.push({ kind, text })
}

/** Abre la ventana de confirmación; sin <Feedback /> montado, usa la del navegador. */
export function confirmDialog(text, options = {}) {
  return handlers ? handlers.ask({ text, ...options }) : Promise.resolve(window.confirm(text))
}
