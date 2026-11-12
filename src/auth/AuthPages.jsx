import { lazy, Suspense, useEffect, useState } from 'react'
import { api } from '../lib/api.js'
import { authMessage, isLeaving, providers, remembered, setRemembered, signOutAndLeave, supabase } from '../lib/supabase.js'
import { navigate } from '../lib/nav.js'
import { loadMe, prefetchMe, prefetchPanel } from '../lib/me.js'
import { AuthLayout } from './AuthLayout.jsx'
import { Captcha } from './Captcha.jsx'
import { CAPTCHA_KEY } from './captcha-key.js'
import { passwordProblem } from '../lib/password.js'
import PasswordFields from './PasswordFields.jsx'
import { LEGAL_PATHS, LEGAL_VERSION } from '../data/legal.js'
import { studio } from '@brand/studio.js'
import { ageOf, isMinorDate, MIN_AGE } from '../lib/age.js'

export { AuthLayout }

// El panel se descarga aparte: la landing y el inicio de sesión no lo necesitan
const Panel = lazy(() => import('../panel/Panel.jsx'))

const go = (path, options) => navigate(path, options)
const here = (path) => `${window.location.origin}${path}`
// A dónde volver después de entrar (por ejemplo, /cuenta?plan=3 desde la landing)
const nextPath = () => {
  const next = new URLSearchParams(window.location.search).get('next')
  return next?.startsWith('/') && !next.startsWith('//') ? next : '/cuenta'
}

/** Salir desde las pantallas previas al panel (completar registro, aceptar términos). */
function LeaveLink() {
  return (
    <p className="auth-foot">
      <button className="auth-link" onClick={() => signOutAndLeave()}>Salir de mi cuenta</button>
    </p>
  )
}

/** Aceptar términos y aviso de privacidad: obligatorio para crear la cuenta o seguir usándola. */
function TermsCheck({ checked, onChange }) {
  return (
    <label className="auth-check">
      <input type="checkbox" required checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span>
        He leído y acepto los <a href={LEGAL_PATHS.terminos} target="_blank" rel="noreferrer">Términos y condiciones</a>,
        el <a href={LEGAL_PATHS.privacidad} target="_blank" rel="noreferrer">Aviso de privacidad</a> y
        la <a href={LEGAL_PATHS.reembolsos} target="_blank" rel="noreferrer">Política de reembolsos</a>.
      </span>
    </label>
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

const RESEND_WAIT = 60 // segundos entre reenvíos (Supabase limita los correos)

// Freno local a los intentos fallidos de entrar (Supabase tiene su propio límite en el servidor):
// a partir del 5.º error se espera 30 s, luego 1 min, 2 min… hasta 15 min.
const LOCK_KEY = 'nara:login-lock'
const FREE_TRIES = 5
const readLock = () => {
  try {
    return JSON.parse(sessionStorage.getItem(LOCK_KEY)) ?? { fails: 0, until: 0 }
  } catch {
    return { fails: 0, until: 0 }
  }
}
const writeLock = (lock) => {
  try {
    sessionStorage.setItem(LOCK_KEY, JSON.stringify(lock))
  } catch {
    // almacenamiento bloqueado: sin freno local
  }
}
function failedLogin() {
  const fails = readLock().fails + 1
  const wait = fails < FREE_TRIES ? 0 : Math.min(15 * 60, 30 * 2 ** (fails - FREE_TRIES))
  writeLock({ fails, until: Date.now() + wait * 1000 })
}
const lockedFor = () => Math.max(0, Math.ceil((readLock().until - Date.now()) / 1000))

/** Después de crear la cuenta: espera a que confirme el correo. */
function AwaitingConfirmation({ email, onBack }) {
  const [wait, setWait] = useState(RESEND_WAIT)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [captcha, setCaptcha] = useState(null)
  const [captchaReset, setCaptchaReset] = useState(0)

  useEffect(() => {
    if (!wait) return
    const t = setTimeout(() => setWait(wait - 1), 1000)
    return () => clearTimeout(t)
  }, [wait])

  // Si confirma en otra pestaña de este navegador, la sesión llega aquí también
  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (session && event === 'SIGNED_IN') go(nextPath(), { replace: true })
    })
    return () => data.subscription.unsubscribe()
  }, [])

  const resend = async () => {
    setBusy(true)
    setError('')
    setInfo('')
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email,
      options: { emailRedirectTo: here(nextPath()), captchaToken: captcha ?? undefined },
    })
    setBusy(false)
    setCaptchaReset((n) => n + 1)
    if (error) return setError(authMessage(error))
    setInfo('Listo, te mandamos el correo otra vez.')
    setWait(RESEND_WAIT)
  }

  return (
    <AuthLayout title="Esperando confirmación" lead="Tu cuenta está casi lista.">
      <div className="auth-waiting">
        <span className="pulse" aria-hidden="true" />
        <p>
          Te enviamos un correo a <strong>{email}</strong>. Abre el enlace que viene ahí para confirmar tu cuenta
          y entrar.
        </p>
        <p className="auth-help">¿No lo ves? Revisa la carpeta de spam o promociones; puede tardar un par de minutos.</p>
      </div>
      {wait === 0 && <Captcha onToken={setCaptcha} resetKey={captchaReset} />}
      <Notice>{error}</Notice>
      <Notice kind="info">{info}</Notice>
      <button className="btn btn-glass btn-block" onClick={resend} disabled={busy || wait > 0 || (CAPTCHA_KEY && !captcha)}>
        {busy ? 'Enviando…' : wait > 0 ? `Reenviar correo (${wait} s)` : 'Reenviar correo'}
      </button>
      <p className="auth-foot">
        <button className="auth-link" onClick={onBack}>Me equivoqué de correo</button>
      </p>
    </AuthLayout>
  )
}

export function Login() {
  const [mode, setMode] = useState('login') // login | signup | forgot
  const [form, setForm] = useState({ fullName: '', email: '', password: '', confirm: '', terms: false, remember: remembered() })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [sentTo, setSentTo] = useState('') // correo al que se mandó la confirmación
  const [captcha, setCaptcha] = useState(null)
  const [captchaReset, setCaptchaReset] = useState(0)
  const [locked, setLocked] = useState(lockedFor)
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })

  // Cuenta regresiva mientras está frenado por intentos fallidos
  useEffect(() => {
    if (!locked) return undefined
    const t = setTimeout(() => setLocked(lockedFor()), 1000)
    return () => clearTimeout(t)
  }, [locked])

  // Con sesión abierta, directo a su cuenta
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => data.session && go(nextPath(), { replace: true }))
    // Mientras escribe, se descarga el panel para que al entrar aparezca enseguida
    const t = setTimeout(prefetchPanel, 1500)
    return () => clearTimeout(t)
  }, [])

  const switchTo = (m) => {
    setMode(m)
    setError('')
    setInfo('')
  }

  const submit = async (e) => {
    e.preventDefault()
    if (mode === 'login' && lockedFor()) return setLocked(lockedFor())
    setBusy(true)
    setError('')
    setInfo('')
    const captchaToken = captcha ?? undefined
    try {
      if (mode !== 'forgot') setRemembered(form.remember)
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email: form.email, password: form.password, options: { captchaToken } })
        if (error) {
          if (error.message === 'Invalid login credentials') failedLogin()
          setLocked(lockedFor())
          throw error
        }
        writeLock({ fails: 0, until: 0 })
        // El perfil y el código del panel se piden ya, en paralelo, sin recargar la página
        prefetchMe()
        prefetchPanel()
        go(nextPath(), { replace: true })
      } else if (mode === 'signup') {
        const problem = passwordProblem(form.password, form.confirm)
        if (problem) throw new Error(problem)
        const { data, error } = await supabase.auth.signUp({
          email: form.email,
          password: form.password,
          // La aceptación viaja con la cuenta: el backend la registra al crear el perfil
          options: { data: { full_name: form.fullName, terms_version: LEGAL_VERSION }, emailRedirectTo: here(nextPath()), captchaToken },
        })
        if (error) throw error
        // Correo ya registrado y confirmado: Supabase no da error ni manda correo, pero regresa
        // el usuario sin identidades. (Si estaba sin confirmar, reenvía la confirmación y sí seguimos.)
        if (data.user && !data.user.identities?.length) {
          throw new Error('Ya existe una cuenta con este correo. Inicia sesión o recupera tu contraseña.')
        }
        setSentTo(form.email)
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(form.email, { redirectTo: here('/restablecer'), captchaToken })
        if (error) throw error
        setInfo(`Si existe una cuenta con ${form.email}, te llegará un enlace para crear una nueva contraseña.`)
      }
    } catch (err) {
      setError(authMessage(err))
    } finally {
      setBusy(false)
      setCaptchaReset((n) => n + 1) // cada verificación sirve una sola vez
    }
  }

  const oauth = async (provider) => {
    setError('')
    setRemembered(form.remember)
    const { error } = await supabase.auth.signInWithOAuth({ provider, options: { redirectTo: here(nextPath()) } })
    if (error) setError(authMessage(error))
  }

  const titles = {
    login: ['Bienvenida de vuelta', 'Entra para reservar tus clases y ver tu racha.'],
    signup: ['Crea tu cuenta', 'Reserva clases, compra tu membresía y sigue tu progreso.'],
    forgot: ['Recupera tu contraseña', 'Escribe tu correo y te mandamos un enlace.'],
  }

  if (sentTo) return <AwaitingConfirmation email={sentTo} onBack={() => setSentTo('')} />

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
        {mode === 'signup' && <TermsCheck checked={form.terms} onChange={(terms) => setForm({ ...form, terms })} />}
        {mode !== 'forgot' && (
          <label className="auth-check">
            <input type="checkbox" checked={form.remember} onChange={(e) => setForm({ ...form, remember: e.target.checked })} />
            <span>Recordarme en este dispositivo <small className="auth-hint">(si no, la sesión se cierra al cerrar el navegador)</small></span>
          </label>
        )}
        <Captcha onToken={setCaptcha} resetKey={captchaReset} />
        <Notice>{error}</Notice>
        <Notice kind="info">{info}</Notice>
        {mode === 'login' && locked > 0 && (
          <Notice>Demasiados intentos. Espera {locked} s o recupera tu contraseña.</Notice>
        )}
        <button className="btn btn-clay btn-block" disabled={busy || (mode === 'login' && locked > 0) || (CAPTCHA_KEY && !captcha)}>
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
      if (!data.session) return go(`/entrar?next=${encodeURIComponent(window.location.pathname + window.location.search)}`, { replace: true })
      prefetchPanel()
      try {
        setMe(await loadMe())
      } catch (err) {
        if (err.status === 401) {
          await supabase.auth.signOut()
          return go(`/entrar?next=${encodeURIComponent(window.location.pathname + window.location.search)}`, { replace: true })
        }
        setError(err.message)
      }
    })
  }, [])

  // La sesión se comparte entre pestañas: si en otra se entra con otra cuenta o se sale,
  // esta se recarga para no seguir mostrando el panel de la cuenta anterior
  const meId = me?.id
  useEffect(() => {
    if (!meId) return undefined
    const { data } = supabase.auth.onAuthStateChange((_, session) => {
      if (isLeaving()) return // salió desde aquí: signOutAndLeave ya lleva a la landing
      if (!session) window.location.replace('/')
      else if (session.user.id !== meId) window.location.reload()
    })
    return () => data.subscription.unsubscribe()
  }, [meId])

  if (error) return <AuthLayout title="No pudimos cargar tu cuenta"><Notice>{error}</Notice></AuthLayout>
  if (!me) return <AuthLayout title="Cargando tu cuenta…" />
  if (me.missing.length === 1 && me.missing[0] === 'terms') return <AcceptTerms onDone={setMe} />
  if (!me.isComplete) return <CompleteProfile me={me} onDone={setMe} />
  return (
    <Suspense fallback={<AuthLayout title="Cargando tu cuenta…" />}>
      <Panel me={me} onMe={setMe} />
    </Suspense>
  )
}

/** Ya tiene sus datos completos, pero no ha aceptado los documentos legales vigentes. */
function AcceptTerms({ onDone }) {
  const [terms, setTerms] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const submit = async (e) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      onDone(await api('/me', { method: 'PATCH', body: { acceptTerms: terms } }))
    } catch (err) {
      setError(err.message)
      setBusy(false)
    }
  }
  return (
    <AuthLayout title="Antes de seguir" lead="Para usar la app necesitamos que leas y aceptes nuestros documentos legales.">
      <form className="auth-form" onSubmit={submit}>
        <TermsCheck checked={terms} onChange={setTerms} />
        <Notice>{error}</Notice>
        <button className="btn btn-clay btn-block" disabled={busy}>{busy ? 'Guardando…' : 'Aceptar y continuar'}</button>
      </form>
      <LeaveLink />
    </AuthLayout>
  )
}

function CompleteProfile({ me, onDone }) {
  const isStudent = !!me.student
  const h = me.student?.health
  const s = me.student
  const [form, setForm] = useState({
    fullName: me.fullName ?? '',
    phone: me.phone ?? '',
    birthDate: me.birthDate?.slice(0, 10) ?? '',
    guardianName: s?.guardianName ?? '',
    guardianPhone: s?.guardianPhone ?? '',
    guardianEmail: s?.guardianEmail ?? '',
    guardianConsent: false,
    weightKg: h?.weightKg ?? '',
    heightCm: h?.heightCm ?? '',
    specialConditions: h?.specialConditions ?? '',
    consent: false,
    terms: false,
  })
  // Cuentas nuevas, invitadas o con documentos legales que cambiaron
  const needsTerms = me.missing.includes('terms')
  const age = ageOf(form.birthDate)
  const tooYoung = age !== null && age < MIN_AGE
  const minor = isStudent && isMinorDate(form.birthDate)
  // La salud es opcional: solo se guarda (y se pide el consentimiento) si escribió algo
  const sharesHealth = isStudent && !h?.consentAt && [form.weightKg, form.heightCm, form.specialConditions].some((v) => String(v).trim())
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value })
  const num = (v) => (v === '' ? undefined : Number(v))

  const submit = async (e) => {
    e.preventDefault()
    if (tooYoung) return
    setBusy(true)
    setError('')
    try {
      let next = await api('/me', {
        method: 'PATCH',
        body: {
          fullName: form.fullName,
          phone: form.phone,
          birthDate: form.birthDate,
          ...(needsTerms && { acceptTerms: form.terms }),
          ...(minor && {
            guardianName: form.guardianName,
            guardianPhone: form.guardianPhone,
            guardianEmail: form.guardianEmail.trim() || undefined,
            ...(!s?.guardianConsentAt && { guardianConsent: form.guardianConsent }),
          }),
        },
      })
      if (sharesHealth) {
        next = await api('/me/health', {
          method: 'PUT',
          body: {
            weightKg: num(form.weightKg),
            heightCm: num(form.heightCm),
            specialConditions: form.specialConditions.trim() || undefined,
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
    <AuthLayout
      wide
      title="Completa tu registro"
      lead={isStudent
        ? 'Solo nos faltan unos datos para que puedas reservar.'
        : `Entras como ${me.role === 'admin' ? 'head coach' : 'coach'}. Solo nos falta tu celular y tu fecha de nacimiento.`}
    >
      <form className="auth-form" onSubmit={submit}>
        <fieldset>
          <legend>Tus datos</legend>
          <label>
            Nombre completo
            <input required minLength={2} maxLength={120} value={form.fullName} onChange={set('fullName')} autoComplete="name" />
          </label>
          <div className="auth-row">
            <label>
              Celular
              <input type="tel" required minLength={10} maxLength={20} value={form.phone} onChange={set('phone')} autoComplete="tel" />
            </label>
            <label>
              Fecha de nacimiento
              <input type="date" required value={form.birthDate} onChange={set('birthDate')} autoComplete="bday" />
            </label>
          </div>
          <p className="auth-help">Usamos tu fecha de nacimiento solo para saber si eres menor de edad.</p>
        </fieldset>

        {tooYoung && (
          <Notice>
            Para tener una cuenta necesitas tener al menos {MIN_AGE} años. Pídele a tu madre, padre o tutor que se
            comunique con el estudio.
          </Notice>
        )}

        {minor && !tooYoung && (
          <fieldset>
            <legend>Tu madre, padre o tutor</legend>
            <p className="auth-help">
              Como eres menor de edad, necesitamos sus datos y su autorización para que entrenes con nosotras y
              guardemos tu información.
            </p>
            <div className="auth-row">
              <label>
                Nombre
                <input required minLength={2} maxLength={120} value={form.guardianName} onChange={set('guardianName')} />
              </label>
              <label>
                Celular
                <input type="tel" required minLength={10} maxLength={20} value={form.guardianPhone} onChange={set('guardianPhone')} />
              </label>
            </div>
            <label>
              Correo (opcional)
              <input type="email" maxLength={200} value={form.guardianEmail} onChange={set('guardianEmail')} />
            </label>
            {!s?.guardianConsentAt && (
              <label className="auth-check">
                <input type="checkbox" required checked={form.guardianConsent} onChange={set('guardianConsent')} />
                <span>
                  Soy su madre, padre o tutor (o estoy presente) y autorizo que entrene en {studio.name} y que se
                  traten sus datos como dice el <a href={LEGAL_PATHS.privacidad} target="_blank" rel="noreferrer">Aviso de privacidad</a>.
                </span>
              </label>
            )}
          </fieldset>
        )}

        {isStudent && !h?.consentAt && (
          <fieldset>
            <legend>Tu salud (opcional)</legend>
            <p className="auth-help">
              Si quieres, cuéntanos para que tu coach adapte los ejercicios. Solo lo ven tú y tus coaches, se guarda
              cifrado y puedes borrarlo cuando quieras. Puedes dejarlo en blanco.
            </p>
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
              <textarea rows={3} maxLength={2000} value={form.specialConditions} onChange={set('specialConditions')} />
            </label>
            {sharesHealth && (
              <label className="auth-check">
                <input type="checkbox" required checked={form.consent} onChange={set('consent')} />
                <span>
                  Acepto que {studio.name} guarde estos datos de salud para cuidar mi entrenamiento, como dice
                  el <a href={LEGAL_PATHS.privacidad} target="_blank" rel="noreferrer">Aviso de privacidad</a>.
                </span>
              </label>
            )}
          </fieldset>
        )}

        {needsTerms && <TermsCheck checked={form.terms} onChange={(terms) => setForm({ ...form, terms })} />}
        <Notice>{error}</Notice>
        <button className="btn btn-clay btn-block" disabled={busy || tooYoung}>{busy ? 'Guardando…' : 'Guardar y continuar'}</button>
      </form>
      <LeaveLink />
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
    go('/cuenta', { replace: true })
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
      lead={invited ? `Bienvenida a ${studio.name}. Con esta contraseña y tu correo entras a la app.` : undefined}
    >
      <form className="auth-form" onSubmit={submit}>
        <PasswordFields password={password} confirm={confirm} onPassword={setPassword} onConfirm={setConfirm} label="Contraseña nueva" />
        <Notice>{error}</Notice>
        <button className="btn btn-clay btn-block" disabled={busy}>{busy ? 'Guardando…' : 'Guardar contraseña'}</button>
      </form>
    </AuthLayout>
  )
}
