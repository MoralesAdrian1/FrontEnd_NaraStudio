import { useState } from 'react'
import { api } from '../lib/api.js'
import { uploadStudentPhoto } from '../lib/storage.js'
import { Notice, Section, StudentPhoto } from './ui.jsx'
import { useAction } from './hooks.js'

/** Mis datos (y de salud, si es alumna). */
export default function Profile({ me, onMe }) {
  const isStudent = !!me.student
  const h = me.student?.health
  const [form, setForm] = useState({
    fullName: me.fullName ?? '',
    publicName: me.student?.publicName ?? '',
    phone: me.phone ?? '',
    birthDate: me.birthDate?.slice(0, 10) ?? '',
    address: me.student?.address ?? '',
  })
  const [health, setHealth] = useState({
    weightKg: h?.weightKg ?? '',
    heightCm: h?.heightCm ?? '',
    specialConditions: h?.specialConditions ?? '',
    consent: !!h?.consentAt,
  })
  const data = useAction()
  const care = useAction()
  const photo = useAction()
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })
  const setH = (k) => (e) => setHealth({ ...health, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value })
  const num = (v) => (v === '' ? undefined : Number(v))

  const saveData = (e) => {
    e.preventDefault()
    data.run(async () => {
      const next = await api('/me', {
        method: 'PATCH',
        body: {
          fullName: form.fullName,
          phone: form.phone || undefined,
          birthDate: form.birthDate || undefined,
          ...(isStudent && { address: form.address || undefined, publicName: form.publicName || undefined }),
        },
      })
      onMe(next)
    }, 'Datos guardados.')
  }

  const saveHealth = (e) => {
    e.preventDefault()
    care.run(async () => {
      const next = await api('/me/health', {
        method: 'PUT',
        body: {
          weightKg: num(health.weightKg),
          heightCm: num(health.heightCm),
          specialConditions: health.specialConditions || undefined,
          consent: health.consent,
        },
      })
      onMe(next)
    }, 'Datos de salud guardados.')
  }

  const uploadPhoto = (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    photo.run(async () => {
      const path = await uploadStudentPhoto(file, me.student.photoPath)
      onMe(await api('/me', { method: 'PATCH', body: { photoPath: path } }))
    }, 'Foto actualizada.')
  }

  return (
    <div className="p-stack">
      <Section title="Mis datos">
        {isStudent && (
          <>
            <div className="p-coach-photo">
              <StudentPhoto name={me.fullName} path={me.student.photoPath} />
              <label className="btn btn-glass btn-small">
                {photo.busy ? 'Subiendo…' : me.student.photoPath ? 'Cambiar foto' : 'Subir foto'}
                <input type="file" accept="image/*" onChange={uploadPhoto} hidden disabled={photo.busy} />
              </label>
            </div>
            <Notice>{photo.error}</Notice>
          </>
        )}
        <form className="auth-form" onSubmit={saveData}>
          <label>
            Nombre completo
            <input required minLength={2} value={form.fullName} onChange={set('fullName')} autoComplete="name" />
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
              <input type="tel" minLength={10} value={form.phone} onChange={set('phone')} autoComplete="tel" />
            </label>
            <label>
              Fecha de nacimiento
              <input type="date" value={form.birthDate} onChange={set('birthDate')} autoComplete="bday" />
            </label>
          </div>
          {isStudent && (
            <label>
              Dirección
              <input value={form.address} onChange={set('address')} autoComplete="street-address" />
            </label>
          )}
          <label>
            Correo
            <input value={me.email} disabled />
          </label>
          <Notice>{data.error}</Notice>
          <button className="btn btn-clay" disabled={data.busy}>{data.busy ? 'Guardando…' : 'Guardar'}</button>
        </form>
      </Section>

      {isStudent && (
        <Section title="Mi salud">
          <form className="auth-form" onSubmit={saveHealth}>
            <p className="auth-help">Solo lo ven tú y tus coaches, para adaptar los ejercicios.</p>
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
              <textarea rows={3} value={health.specialConditions} onChange={setH('specialConditions')} />
            </label>
            <label className="auth-check">
              <input type="checkbox" required checked={health.consent} onChange={setH('consent')} />
              <span>Acepto que Nara Studio guarde estos datos de salud para cuidar mi entrenamiento.</span>
            </label>
            <Notice>{care.error}</Notice>
            <button className="btn btn-clay" disabled={care.busy}>{care.busy ? 'Guardando…' : 'Guardar'}</button>
          </form>
        </Section>
      )}
    </div>
  )
}
