import { api } from '../lib/api.js'

/**
 * Pago con tarjeta: abre la página de pago de Stripe. Al terminar, Stripe regresa a
 * /cuenta?pago=ok#membresias (o pago=cancelado) y el plan se activa con su aviso al backend.
 */
export async function payWithCard(planId, classSessionId) {
  const { url } = await api('/memberships/card-checkout', { method: 'POST', body: { planId, classSessionId } })
  window.location.assign(url)
  // Sigue "Abriendo pago…" hasta que cambie la página (o vuelva con el botón Atrás)
  return new Promise((resolve) => window.addEventListener('pageshow', resolve, { once: true }))
}

/** Pagar con tarjeta lo que ya apartó en efectivo (si no termina, sigue apartado en efectivo). */
export async function payPendingWithCard(membershipId) {
  const { url } = await api(`/memberships/${membershipId}/card-checkout`, { method: 'POST' })
  window.location.assign(url)
  return new Promise((resolve) => window.addEventListener('pageshow', resolve, { once: true }))
}
