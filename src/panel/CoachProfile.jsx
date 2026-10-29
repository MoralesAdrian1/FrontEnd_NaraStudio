import { useState } from 'react'
import { api } from '../lib/api.js'
import { publicUrl, uploadCoachFile } from '../lib/storage.js'
import { longDate } from './plan-labels.js'
import { Notice, Section, Toggle } from './ui.jsx'
import { useAction, useLoad } from './hooks.js'
import { confirmDialog } from '../lib/feedback.js'

/** Perfil público de la coach: descripción, redes, foto y certificaciones en PDF. */
export default function CoachProfile() {
  const coach = useLoad('/coaches/me')
  if (coach.error) return <Notice>{coach.error}</Notice>
  if (!coach.data) return null
  return <CoachForm key={coach.data.id} c={coach.data} onChange={coach.reload} />
}

function CoachForm({ c, onChange }) {
  const [form, setForm] = useState({ bio: c.bio ?? '', instagram: c.instagram ?? '', tiktok: c.tiktok ?? '' })
  const data = useAction()
  const photo = useAction()
  const certs = useAction()
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value.replace(/^@/, '') })

  const save = (e) => {
    e.preventDefault()
    data.run(async () => {
      await api('/coaches/me', {
        method: 'PATCH',
        body: { bio: form.bio, instagram: form.instagram || undefined, tiktok: form.tiktok || undefined },
      })
      onChange()
    }, 'Perfil guardado.')
  }

  const uploadPhoto = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    photo.run(async () => {
      const path = await uploadCoachFile(file, 'foto')
      await api('/coaches/me', { method: 'PATCH', body: { photoPath: path } })
      onChange()
    }, 'Foto actualizada.')
  }

  const removeCert = async (x) => {
    if (!await confirmDialog(`¿Quitar “${x.name}”?`)) return
    certs.run(async () => {
      await api(`/coaches/me/certifications/${x.id}`, { method: 'DELETE' })
      onChange()
    }, 'Certificación quitada.')
  }

  return (
    <Section title="Mi perfil de coach">
      <p className="auth-help">Esto es lo que ven las alumnas en la landing.</p>
      <div className="p-coach-photo">
        {c.photoPath ? <img src={publicUrl(c.photoPath)} alt={`Foto de ${c.name}`} /> : <span aria-hidden="true">{c.name[0]}</span>}
        <label className="btn btn-glass btn-small">
          {photo.busy ? 'Subiendo…' : c.photoPath ? 'Cambiar foto' : 'Subir foto'}
          <input type="file" accept="image/jpeg,image/png,image/webp" onChange={uploadPhoto} hidden />
        </label>
      </div>
      <Notice>{photo.error}</Notice>

      <form className="auth-form" onSubmit={save}>
        <label>
          Descripción
          <textarea rows={4} maxLength={600} value={form.bio} onChange={set('bio')} placeholder="Tu formación, tu estilo y qué pueden esperar de tus clases" />
        </label>
        <div className="auth-row">
          <label>
            Instagram (usuario)
            <input value={form.instagram} onChange={set('instagram')} placeholder="narastudio" />
          </label>
          <label>
            TikTok (usuario)
            <input value={form.tiktok} onChange={set('tiktok')} placeholder="narastudio" />
          </label>
        </div>
        <Notice>{data.error}</Notice>
        <button className="btn btn-clay" disabled={data.busy}>Guardar perfil</button>
      </form>

      <h3 className="p-sub">Certificaciones</h3>
      <ul className="p-history">
        {c.certifications.map((x) => (
          <li key={x.id}>
            <span>
              {x.filePath ? <a href={publicUrl(x.filePath)} target="_blank" rel="noreferrer">{x.name}</a> : x.name}
            </span>
            <small>
              {[x.issuer, x.issuedAt && longDate(x.issuedAt)].filter(Boolean).join(' · ')}{' '}
              <button className="auth-link" onClick={() => removeCert(x)} disabled={certs.busy}>Quitar</button>
            </small>
          </li>
        ))}
      </ul>
      <Notice>{certs.error}</Notice>
      <Toggle label="Agregar certificación" className="btn btn-glass btn-small">
        {(close) => <NewCertification onDone={() => { close(); onChange() }} onCancel={close} />}
      </Toggle>
    </Section>
  )
}

function NewCertification({ onDone, onCancel }) {
  const [form, setForm] = useState({ name: '', issuer: '', issuedAt: '' })
  const [file, setFile] = useState(null)
  const action = useAction()
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })
  const submit = (e) => {
    e.preventDefault()
    action.run(async () => {
      const filePath = file ? await uploadCoachFile(file, 'certificado') : undefined
      await api('/coaches/me/certifications', {
        method: 'POST',
        body: { name: form.name, issuer: form.issuer || undefined, issuedAt: form.issuedAt || undefined, filePath },
      })
      onDone()
    }, 'Certificación agregada.')
  }
  return (
    <form className="auth-form p-inline-form" onSubmit={submit}>
      <div className="auth-row three">
        <label>
          Nombre
          <input required minLength={2} maxLength={120} value={form.name} onChange={set('name')} placeholder="Barre · The Body Method" />
        </label>
        <label>
          Institución (opcional)
          <input maxLength={120} value={form.issuer} onChange={set('issuer')} />
        </label>
        <label>
          Fecha (opcional)
          <input type="date" value={form.issuedAt} onChange={set('issuedAt')} />
        </label>
      </div>
      <label>
        Archivo PDF (opcional, máximo 5 MB)
        <input type="file" accept="application/pdf" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
      </label>
      <Notice>{action.error}</Notice>
      <div className="p-actions">
        <button className="btn btn-clay btn-small" disabled={action.busy}>{action.busy ? 'Subiendo…' : 'Agregar'}</button>
        <button type="button" className="btn btn-glass btn-small" onClick={onCancel}>Cancelar</button>
      </div>
    </form>
  )
}
