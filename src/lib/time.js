// Fechas en hora del estudio (America/Mexico_City), igual que en el backend.
// Fechas como 'AAAA-MM-DD', horas como 'HH:MM'.
export const STUDIO_TZ = 'America/Mexico_City'
export const DAYS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
const DAY_MS = 86_400_000

function offsetMinutes(at) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: STUDIO_TZ, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
  }).formatToParts(at)
  const get = (t) => Number(parts.find((p) => p.type === t).value)
  return Math.round((Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute')) - at.getTime()) / 60_000)
}

/** Fecha y hora del estudio → Date */
export function studioDateTime(date, time) {
  const [y, m, d] = date.split('-').map(Number)
  const [hh, mm] = time.split(':').map(Number)
  const asUtc = Date.UTC(y, m - 1, d, hh, mm)
  const first = asUtc - offsetMinutes(new Date(asUtc)) * 60_000
  return new Date(asUtc - offsetMinutes(new Date(first)) * 60_000)
}

export const studioDate = (at = new Date()) => new Intl.DateTimeFormat('en-CA', { timeZone: STUDIO_TZ }).format(at)
export const studioTime = (at) =>
  new Intl.DateTimeFormat('en-GB', { timeZone: STUDIO_TZ, hour: '2-digit', minute: '2-digit' }).format(new Date(at))

export function addDays(date, days) {
  const [y, m, d] = date.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d) + days * DAY_MS).toISOString().slice(0, 10)
}
export const weekdayOf = (date) => new Date(`${date}T00:00:00Z`).getUTCDay()
export const weekStart = (date) => addDays(date, -((weekdayOf(date) + 6) % 7))
export const daysBetween = (a, b) => Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / DAY_MS)

/** 06:50 → 6:50 a.m. */
export function clock(t) {
  const [h, m] = t.split(':').map(Number)
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h < 12 ? 'a.m.' : 'p.m.'}`
}

/** "Hoy", "Mañana" o el día de la semana */
export function whenLabel(date, today = studioDate()) {
  const diff = daysBetween(today, date)
  if (diff === 0) return 'Hoy'
  if (diff === 1) return 'Mañana'
  return DAYS[weekdayOf(date)]
}

/** 2026-11-02 → "lun 2 nov" */
export const shortDate = (date) =>
  new Intl.DateTimeFormat('es-MX', { timeZone: 'UTC', weekday: 'short', day: 'numeric', month: 'short' }).format(new Date(`${date}T00:00:00Z`))

export const money = (cents) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: cents % 100 ? 2 : 0 }).format(cents / 100)
