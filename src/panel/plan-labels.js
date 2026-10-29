import { money } from '../lib/time.js'

export const KIND_LABEL = { monthly: 'Mensual', weekly: 'Semanal', pack: 'Paquete', single_class: 'Clase individual' }

export const STATUS_LABEL = {
  active: 'Activa',
  pending_payment: 'Pendiente de pago',
  expired: 'Vencida',
  cancelled: 'Cancelada',
}

/** "Clases ilimitadas · 30 días" */
export function planSummary(p) {
  if (p.kind === 'single_class') return '1 clase, para la sesión que elijas'
  const credits = p.credits === null ? 'Clases ilimitadas' : `${p.credits} clases`
  return `${credits} · vigencia de ${p.durationDays} días`
}

export const planDisciplines = (p) => (p.shares ?? []).map((s) => s.discipline.name).join(' + ')

export const planPrice = (p) => money(p.priceCents)

/** "8 de 12 clases" o "Ilimitadas" */
export function creditsLabel(m) {
  if (m.creditsTotal === null) return 'Clases ilimitadas'
  return `${m.creditsLeft} de ${m.creditsTotal} ${m.creditsTotal === 1 ? 'clase' : 'clases'} disponibles`
}

export const dateTime = (iso) =>
  new Intl.DateTimeFormat('es-MX', { timeZone: 'America/Mexico_City', weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }).format(new Date(iso))

export const longDate = (iso) =>
  new Intl.DateTimeFormat('es-MX', { timeZone: 'America/Mexico_City', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(iso))
