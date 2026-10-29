import { createClient } from '@supabase/supabase-js'

// Valores públicos: la publishable key está hecha para el navegador
export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
  { auth: { flowType: 'pkce' } },
)

// Facebook se activa cuando esté configurado en Supabase (VITE_AUTH_FACEBOOK=true)
export const providers = {
  google: true,
  facebook: import.meta.env.VITE_AUTH_FACEBOOK === 'true',
}

const MESSAGES = {
  'Invalid login credentials': 'Correo o contraseña incorrectos.',
  'Email not confirmed': 'Confirma tu correo: te enviamos un enlace al registrarte.',
  'User already registered': 'Ya existe una cuenta con ese correo. Inicia sesión.',
  'Password should be at least 6 characters.': 'La contraseña debe tener al menos 6 caracteres.',
  'New password should be different from the old password.': 'La contraseña nueva debe ser distinta a la anterior.',
  'Email link is invalid or has expired': 'El enlace venció o ya se usó. Pide uno nuevo.',
}

export function authMessage(error) {
  const message = error?.message
  if (message?.startsWith('Password should')) return 'La contraseña es muy débil: usa al menos 8 caracteres con mayúscula, minúscula y número.'
  return MESSAGES[message] ?? message ?? 'Algo salió mal. Intenta de nuevo.'
}
