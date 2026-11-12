// Edades para el registro: menos de 12 no puede tener cuenta; de 12 a 17 necesita a su tutor.
export const MIN_AGE = 12
export const ADULT_AGE = 18

/** Años cumplidos hoy para una fecha AAAA-MM-DD (null si no hay fecha). */
export function ageOf(iso) {
  if (!iso) return null
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number)
  const now = new Date()
  let age = now.getFullYear() - y
  if (now.getMonth() + 1 < m || (now.getMonth() + 1 === m && now.getDate() < d)) age--
  return age
}

export const isMinorDate = (iso) => {
  const age = ageOf(iso)
  return age !== null && age < ADULT_AGE
}
