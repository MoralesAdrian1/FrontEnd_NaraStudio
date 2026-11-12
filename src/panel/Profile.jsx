import { useState } from 'react'
import { studio } from '@brand/studio.js'
import { api } from '../lib/api.js'
import { confirmDialog } from '../lib/feedback.js'
import { uploadStudentPhoto } from '../lib/storage.js'
import { signOutAndLeave } from '../lib/supabase.js'
import { LEGAL_PATHS } from '../data/legal.js'
import { Notice, Section, StudentPhoto } from './ui.jsx'
import { useAction } from './hooks.js'

/** Mis datos (y de salud, si es alumna). */
export default function Profile({ me, onMe }) {
  const isStudent = !!me.student
  const s = me.student
  const [form, setForm] = useState({
    fullName: me.fullName ?? '',
    publicName: s?.publicName ?? '',
    phone: me.phone ?? '',
    birthDate: me.birthDate?.slice(0, 10) ?? '',
    guardianName: s?.guardianName ?? '',
    guardianPhone: s?.guardianPhone ?? '',
    guardianEmail: s?.guardianEmail ?? '',
  })
  const data = useAction()
  const photo = useAction()
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })

  const saveData = (e) => {
    e.preventDefault()
    data.run(async () => {
      const next = await api('/me', {
        method: 'PATCH',
        body: {
          fullName: form.fullName,
          phone: form.phone || undefined,
          birthDate: form.birthDate || undefined,
          ...(isStudent && { publicName: form.publicName || undefined }),
          ...(s?.isMinor && {
            guardianName: form.guardianName || undefined,
            guardianPhone: form.guardianPhone || undefined,
            guardianEmail: form.guardianEmail || undefined,
          }),
        },
      })
      onMe(next)
    }, 'Datos guardados.')
  }

  const uploadPhoto = (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    photo.run(async () => {
      const path = await uploadStudentPhoto(file, s.photoPath)
      onMe(await api('/me', { method: 'PATCH', body: { photoPath: path } }))
    }, 'Foto actualizada.')
  }

  return (
    <div className="p-stack">
      <Section title="Mis datos">
        {isStudent && (
          <>
            <div className="p-coach-photo">
              <StudentPhoto name={me.fullName} url={s.photoUrl} />
              <label className="btn btn-glass btn-small">
                {photo.busy ? 'Subiendo…' : s.photoPath ? 'Cambiar foto' : 'Subir foto'}
                <input type="file" accept="image/*" onChange={uploadPhoto} hidden disabled={photo.busy} />
              </label>
            </div>
            <Notice>{photo.error}</Notice>
          </>
        )}
        <form className="auth-form" onSubmit={saveData}>
          <label>
            Nombre completo
            <input required minLength={2} maxLength={120} value={form.fullName} onChange={set('fullName')} autoComplete="name" />
          </label>
          {isStudent && (
            <label>
              Nombre en la tabla de reconocimientos
              <input value={form.publicName} onChange={set('publicName')} placeholder="Por ejemplo, Ana R." maxLength={40} />
            </label>
          )}
          <div className="auth-row">
            <label>
              Celular
              <input type="tel" minLength={10} maxLength={20} value={form.phone} onChange={set('phone')} autoComplete="tel" />
            </label>
            <label>
              Fecha de nacimiento
              <input type="date" value={form.birthDate} onChange={set('birthDate')} autoComplete="bday" />
            </label>
          </div>
          <label>
            Correo
            <input value={me.email} disabled />
          </label>
          {s?.isMinor && (
            <fieldset>
              <legend>Tu madre, padre o tutor</legend>
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
            </fieldset>
          )}
          <Notice>{data.error}</Notice>
          <button className="btn btn-clay" disabled={data.busy}>{data.busy ? 'Guardando…' : 'Guardar'}</button>
        </form>
      </Section>

      {isStudent && <Health me={me} onMe={onMe} />}
      {isStudent && me.role === 'student' && <DeleteAccount me={me} />}
    </div>
  )
}

/** Datos de salud: opcionales, con consentimiento expreso y se pueden borrar. */
function Health({ me, onMe }) {
  const h = me.student.health
  const [health, setHealth] = useState({
    weightKg: h?.weightKg ?? '',
    heightCm: h?.heightCm ?? '',
    specialConditions: h?.specialConditions ?? '',
    consent: !!h?.consentAt,
  })
  const care = useAction()
  const setH = (k) => (e) => setHealth({ ...health, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value })
  const num = (v) => (v === '' ? undefined : Number(v))

  const save = (e) => {
    e.preventDefault()
    care.run(async () => {
      onMe(await api('/me/health', {
        method: 'PUT',
        body: {
          weightKg: num(health.weightKg),
          heightCm: num(health.heightCm),
          specialConditions: health.specialConditions || undefined,
          consent: health.consent,
        },
      }))
    }, 'Datos de salud guardados.')
  }

  const revoke = async () => {
    if (!await confirmDialog('¿Borrar tus datos de salud? Tu coach ya no los verá. Puedes volver a escribirlos cuando quieras.')) return
    care.run(async () => {
      onMe(await api('/me/health', { method: 'DELETE' }))
      setHealth({ weightKg: '', heightCm: '', specialConditions: '', consent: false })
    }, 'Borramos tus datos de salud.')
  }

  return (
    <Section title="Mi salud (opcional)">
      <form className="auth-form" onSubmit={save}>
        <p className="auth-help">
          Para que tu coach adapte los ejercicios. Solo lo ven tú y tus coaches, y se guarda cifrado. No es obligatorio.
        </p>
        <div className="auth-row">
          <label>
            Peso (kg)
            <input type="number" inputMode="decimal" min="20" max="300" step="0.1" value={health.weightKg} onChange={setH('weightKg')} />
          </label>
          <label>
            Estatura (cm)
            <input type="number" inputMode="numeric" min="80" max="250" step="1" value={health.heightCm} onChange={setH('heightCm')} />
          </label>
        </div>
        <label>
          Lesiones, alergias u otras condiciones
          <textarea rows={3} maxLength={2000} value={health.specialConditions} onChange={setH('specialConditions')} />
        </label>
        <label className="auth-check">
          <input type="checkbox" required checked={health.consent} onChange={setH('consent')} />
          <span>
            Acepto que {studio.name} guarde estos datos de salud para cuidar mi entrenamiento, como dice
            el <a href={LEGAL_PATHS.privacidad} target="_blank" rel="noreferrer">Aviso de privacidad</a>.
          </span>
        </label>
        <Notice>{care.error}</Notice>
        <div className="p-actions">
          <button className="btn btn-clay" disabled={care.busy}>{care.busy ? 'Guardando…' : 'Guardar'}</button>
          {h && <button type="button" className="auth-link" onClick={revoke} disabled={care.busy}>Borrar mis datos de salud</button>}
        </div>
      </form>
    </Section>
  )
}

/** Borrar la cuenta y los datos personales. Se confirma escribiendo el correo. */
function DeleteAccount({ me }) {
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState('')
  const action = useAction()
  const submit = async (e) => {
    e.preventDefault()
    if (!await confirmDialog('¿Borrar tu cuenta para siempre? Pierdes las clases y planes que te queden. No se puede deshacer.', { danger: true })) return
    const done = await action.run(async () => {
      await api('/me/delete', { method: 'POST', body: { confirmEmail: email } })
      return true
    }, 'Tu cuenta y tus datos se borraron.')
    if (done) setTimeout(() => signOutAndLeave('/'), 1200)
  }
  return (
    <Section title="Borrar mi cuenta">
      <p className="auth-help">
        Borramos tu cuenta, tus datos personales, tu foto y tus datos de salud. Tus pagos se conservan sin tu nombre,
        porque la ley nos pide guardarlos. Si te quedan clases o un plan activo, se pierden.
      </p>
      {!open ? (
        <button className="btn btn-glass btn-small" onClick={() => setOpen(true)}>Quiero borrar mi cuenta</button>
      ) : (
        <form className="auth-form" onSubmit={submit}>
          <label>
            Para confirmar, escribe tu correo ({me.email})
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="off" />
          </label>
          <Notice>{action.error}</Notice>
          <div className="p-actions">
            <button className="btn btn-clay btn-small" disabled={action.busy || email.trim().toLowerCase() !== me.email.toLowerCase()}>
              {action.busy ? 'Borrando…' : 'Borrar mi cuenta'}
            </button>
            <button type="button" className="btn btn-glass btn-small" onClick={() => setOpen(false)}>Cancelar</button>
          </div>
        </form>
      )}
    </Section>
  )
}
