/** Requisitos de una contraseña segura (los mismos que se configuran en Supabase Auth). */
export const PASSWORD_RULES = [
  [(p) => p.length >= 8, 'Al menos 8 caracteres'],
  [(p) => /[A-Z]/.test(p), 'Una mayúscula'],
  [(p) => /[a-z]/.test(p), 'Una minúscula'],
  [(p) => /\d/.test(p), 'Un número'],
]

/** Texto del error si la contraseña no cumple o no coincide; null si está bien. */
export function passwordProblem(password, confirm) {
  const missing = PASSWORD_RULES.filter(([ok]) => !ok(password)).map(([, label]) => label.toLowerCase())
  if (missing.length) return `A tu contraseña le falta: ${missing.join(', ')}.`
  if (password !== confirm) return 'Las contraseñas no coinciden.'
  return null
}
