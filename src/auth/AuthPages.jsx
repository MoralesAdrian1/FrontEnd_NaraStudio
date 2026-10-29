import { useEffect, useState } from 'react'
import '../App.css'
import './auth.css'
import { api } from '../lib/api.js'
import { authMessage, providers, supabase } from '../lib/supabase.js'
import Panel from '../panel/Panel.jsx'
import { passwordProblem } from '../lib/password.js'
import PasswordFields from './PasswordFields.jsx'

const go = (path) => window.location.assign(path)
const here = (path) => `${window.location.origin}${path}`
// A dónde volver después de entrar (por ejemplo, /cuenta?plan=3 desde la landing)
const nextPath = () => {
  const next = new URLSearchParams(window.location.search).get('next')
  return next?.startsWith('/') && !next.startsWith('//') ? next : '/cuenta'
}

function AuthLayout({ title, lead, children, wide = false }) {
  return (
    <div className="auth">
      <div className="blobs" aria-hidden="true">
        <span className="blob b1" />
        <span className="blob b2" />
      </div>
      <a className="auth-back" href="/">← Volver al inicio</a>
      <main className={`auth-card glass ${wide ? 'wide' : ''}`}>
        <img className="auth-logo" src="/img/nara-logo-dark.png" alt="Nara Studio, habita tu cuerpo" width="180" height="81" />
        <h1>{title}</h1>
        {lead && <p className="auth-lead">{lead}</p>}
        {children}
      </main>
    </div>
  )
}

function Notice({ kind = 'error', children }) {
  if (!children) return null
  return <p className={`auth-notice ${kind}`} role={kind === 'error' ? 'alert' : 'status'}>{children}</p>
}

function GoogleMark() {
  return (
    <svg viewBox="0 0 48 48" width="20" height="20" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34.1 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34.1 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  )
}

/* ─── /entrar ─────────────────────────────────────────────────────────────── */

export function Login() {
  const [mode, setMode] = useState('login') // login | signup | forgot
  const [form, setForm] = useState({ fullName: '', email: '', password: '', confirm: '' })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })

  // Con sesión abierta, directo a su cuenta
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => data.session && go(nextPath()))
  }, [])

  const switchTo = (m) => {
    setMode(m)
    setError('')
    setInfo('')
  }

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    setInfo('')
    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email: form.email, password: form.password })
        if (error) throw error
        go(nextPath())
      } else if (mode === 'signup') {
        const problem = passwordProblem(form.password, form.confirm)
        if (problem) throw new Error(problem)
        const { error } = await supabase.auth.signUp({
          email: form.email,
          password: form.password,
          options: { data: { full_name: form.fullName }, emailRedirectTo: here(nextPath()) },
        })
        if (error) throw error
        setInfo(`Te enviamos un correo a ${form.email}. Abre el enlace para confirmar tu cuenta.`)
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(form.email, { redirectTo: here('/restablecer') })
        if (error) throw error
        setInfo(`Si existe una cuenta con ${form.email}, te llegará un enlace para crear una nueva contraseña.`)
      }
    } catch (err) {
      setError(authMessage(err))
    } finally {
      setBusy(false)
    }
  }

  const oauth = async (provider) => {
    setError('')
    const { error } = await supabase.auth.signInWithOAuth({ provider, options: { redirectTo: here(nextPath()) } })
    if (error) setError(authMessage(error))
  }

  const titles = {
    login: ['Bienvenida de vuelta', 'Entra para reservar tus clases y ver tu racha.'],
    signup: ['Crea tu cuenta', 'Reserva clases, compra tu membresía y sigue tu progreso.'],
    forgot: ['Recupera tu contraseña', 'Escribe tu correo y te mandamos un enlace.'],
  }

  return (
    <AuthLayout title={titles[mode][0]} lead={titles[mode][1]}>
      {mode !== 'forgot' && (
        <>
          <div className="auth-tabs" role="tablist" aria-label="Tipo de acceso">
            <button role="tab" aria-selected={mode === 'login'} onClick={() => switchTo('login')}>Iniciar sesión</button>
            <button role="tab" aria-selected={mode === 'signup'} onClick={() => switchTo('signup')}>Crear cuenta</button>
          </div>
          <div className="auth-providers">
            <button className="auth-provider" onClick={() => oauth('google')}>
              <GoogleMark /> Continuar con Google
            </button>
            {providers.facebook && (
              <button className="auth-provider" onClick={() => oauth('facebook')}>Continuar con Facebook</button>
            )}
          </div>
          <p className="auth-or"><span>o con tu correo</span></p>
        </>
      )}

      <form className="auth-form" onSubmit={submit}>
        {mode === 'signup' && (
          <label>
            Tu nombre
            <input required minLength={2} value={form.fullName} onChange={set('fullName')} autoComplete="name" />
          </label>
        )}
        <label>
          Correo
          <input type="email" required value={form.email} onChange={set('email')} autoComplete="email" />
        </label>
        {mode === 'login' && (
          <label>
            Contraseña
            <input type="password" required value={form.password} onChange={set('password')} autoComplete="current-password" />
          </label>
        )}
        {mode === 'signup' && (
          <PasswordFields
            password={form.password}
            confirm={form.confirm}
            onPassword={(password) => setForm({ ...form, password })}
            onConfirm={(confirm) => setForm({ ...form, confirm })}
          />
        )}
        <Notice>{error}</Notice>
        <Notice kind="info">{info}</Notice>
        <button className="btn btn-clay btn-block" disabled={busy}>
          {busy ? 'Un momento…' : { login: 'Entrar', signup: 'Crear cuenta', forgot: 'Enviar enlace' }[mode]}
        </button>
      </form>

      <p className="auth-foot">
        {mode === 'login' && <button className="auth-link" onClick={() => switchTo('forgot')}>¿Olvidaste tu contraseña?</button>}
        {mode === 'forgot' && <button className="auth-link" onClick={() => switchTo('login')}>Volver a iniciar sesión</button>}
      </p>
    </AuthLayout>
  )
}

/* ─── /cuenta ─────────────────────────────────────────────────────────────── */

export function Account() {
  const [me, setMe] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    // getSession espera a que Supabase termine de leer el regreso de Google o del correo
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) return go(`/entrar?next=${encodeURIComponent(window.location.pathname + window.location.search)}`)
      try {
        setMe(await api('/me'))
      } catch (err) {
        if (err.status === 401) {
          await supabase.auth.signOut()
          return go(`/entrar?next=${encodeURIComponent(window.location.pathname + window.location.search)}`)
        }
        setError(err.message)
      }
    })
  }, [])

  if (error) return <AuthLayout title="No pudimos cargar tu cuenta"><Notice>{error}</Notice></AuthLayout>
  if (!me) return <AuthLayout title="Cargando tu cuenta…" />
  if (!me.isComplete) return <CompleteProfile me={me} onDone={setMe} />
  return <Panel me={me} onMe={setMe} />
}

function CompleteProfile({ me, onDone }) {
  const isStudent = !!me.student
  const h = me.student?.health
  const [form, setForm] = useState({
    fullName: me.fullName ?? '',
    phone: me.phone ?? '',
    birthDate: me.birthDate?.slice(0, 10) ?? '',
    address: me.student?.address ?? '',
    weightKg: h?.weightKg ?? '',
    heightCm: h?.heightCm ?? '',
    specialConditions: h?.specialConditions ?? '',
    consent: false,
  })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value })
  const num = (v) => (v === '' ? undefined : Number(v))

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      let next = await api('/me', {
        method: 'PATCH',
        body: {
          fullName: form.fullName,
          phone: form.phone,
          birthDate: form.birthDate,
          ...(isStudent && { address: form.address }),
        },
      })
      if (isStudent) {
        next = await api('/me/health', {
          method: 'PUT',
          body: {
            weightKg: num(form.weightKg),
            heightCm: num(form.heightCm),
            specialConditions: form.specialConditions || undefined,
            consent: form.consent,
          },
        })
      }
      onDone(next)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthLayout wide title="Completa tu registro" lead="Solo nos faltan unos datos para que puedas reservar.">
      <form className="auth-form" onSubmit={submit}>
        <fieldset>
          <legend>Tus datos</legend>
          <label>
            Nombre completo
            <input required minLength={2} value={form.fullName} onChange={set('fullName')} autoComplete="name" />
          </label>
          <div className="auth-row">
            <label>
              Celular
              <input type="tel" required minLength={10} value={form.phone} onChange={set('phone')} autoComplete="tel" />
            </label>
            <label>
              Fecha de nacimiento
              <input type="date" required value={form.birthDate} onChange={set('birthDate')} autoComplete="bday" />
            </label>
          </div>
          {isStudent && (
            <label>
              Dirección
              <input required value={form.address} onChange={set('address')} autoComplete="street-address" />
            </label>
          )}
        </fieldset>

        {isStudent && (
          <fieldset>
            <legend>Tu salud</legend>
            <p className="auth-help">Para que tu coach adapte los ejercicios. Solo lo ven tú y tus coaches.</p>
            <div className="auth-row">
              <label>
                Peso (kg)
                <input type="number" inputMode="decimal" min="20" max="300" step="0.1" value={form.weightKg} onChange={set('weightKg')} />
              </label>
              <label>
                Estatura (cm)
                <input type="number" inputMode="numeric" min="80" max="250" step="1" value={form.heightCm} onChange={set('heightCm')} />
              </label>
            </div>
            <label>
              Lesiones, alergias u otras condiciones
              <textarea rows={3} value={form.specialConditions} onChange={set('specialConditions')} placeholder="Escribe “ninguna” si no tienes" />
            </label>
            <label className="auth-check">
              <input type="checkbox" required checked={form.consent} onChange={set('consent')} />
              <span>Acepto que Nara Studio guarde estos datos de salud para cuidar mi entrenamiento.</span>
            </label>
          </fieldset>
        )}

        <Notice>{error}</Notice>
        <button className="btn btn-clay btn-block" disabled={busy}>{busy ? 'Guardando…' : 'Guardar y continuar'}</button>
      </form>
    </AuthLayout>
  )
}

/* ─── /restablecer ────────────────────────────────────────────────────────── */

// Enlace de invitación (o de recuperación) con token: se canjea una sola vez, aunque React
// monte la página dos veces en desarrollo
let verifying = null
function verifyLinkToken() {
  const params = new URLSearchParams(window.location.search)
  const tokenHash = params.get('token_hash')
  if (!tokenHash) return Promise.resolve(null)
  verifying ??= supabase.auth.verifyOtp({ token_hash: tokenHash, type: params.get('type') ?? 'recovery' }).then(({ error }) => {
    // El token ya no sirve en la URL: se quita
    window.history.replaceState(null, '', `${window.location.pathname}${params.get('invitacion') ? '?invitacion=1' : ''}`)
    return error
  })
  return verifying
}

export function ResetPassword() {
  const invited = new URLSearchParams(window.location.search).has('invitacion')
  const [ready, setReady] = useState(null) // null = revisando el enlace
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    verifyLinkToken().then(() => supabase.auth.getSession()).then(({ data }) => setReady(!!data.session))
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') setReady(true)
    })
    return () => data.subscription.unsubscribe()
  }, [])

  const submit = async (e) => {
    e.preventDefault()
    const problem = passwordProblem(password, confirm)
    if (problem) return setError(problem)
    setBusy(true)
    setError('')
    const { error } = await supabase.auth.updateUser({ password })
    setBusy(false)
    if (error) return setError(authMessage(error))
    go('/cuenta')
  }

  if (ready === null) return <AuthLayout title="Un momento…" />
  if (!ready) {
    return (
      <AuthLayout
        title="Enlace no válido"
        lead={invited
          ? 'Tu invitación venció o ya se usó. Entra con “¿Olvidaste tu contraseña?” y tu correo, o pide a tu coach que te la reenvíe.'
          : 'El enlace venció o ya se usó. Pide uno nuevo.'}
      >
        <a className="btn btn-clay btn-block" href="/entrar">Volver a iniciar sesión</a>
      </AuthLayout>
    )
  }
  return (
    <AuthLayout
      title={invited ? 'Crea tu contraseña' : 'Nueva contraseña'}
      lead={invited ? 'Bienvenida a Nara Studio. Con esta contraseña y tu correo entras a la app.' : undefined}
    >
      <form className="auth-form" onSubmit={submit}>
        <PasswordFields password={password} confirm={confirm} onPassword={setPassword} onConfirm={setConfirm} label="Contraseña nueva" />
        <Notice>{error}</Notice>
        <button className="btn btn-clay btn-block" disabled={busy}>{busy ? 'Guardando…' : 'Guardar contraseña'}</button>
      </form>
    </AuthLayout>
  )
}
