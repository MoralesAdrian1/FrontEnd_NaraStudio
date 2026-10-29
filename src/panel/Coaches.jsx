import { useState } from 'react'
import { api } from '../lib/api.js'
import { publicUrl } from '../lib/storage.js'
import { Empty, Notice, Section, Toggle } from './ui.jsx'
import { useAction, useLoad } from './hooks.js'
import { confirmDialog } from '../lib/feedback.js'

/** Coaches del estudio (solo admin): dar de alta, disciplinas, activar o desactivar. */
export default function Coaches() {
  const coaches = useLoad('/coaches/all')
  const disciplines = useLoad('/disciplines')
  return (
    <div className="p-stack">
      <Section
        title="Coaches"
        action={
          <Toggle label="Dar de alta coach">
            {(close) => (
              <Promote disciplines={disciplines.data ?? []} onDone={() => { close(); coaches.reload() }} onCancel={close} />
            )}
          </Toggle>
        }
      >
        <Notice>{coaches.error}</Notice>
        {coaches.data?.length === 0 && <Empty>Aún no hay coaches.</Empty>}
      </Section>
      {coaches.data?.map((c) => (
        <CoachCard key={c.id} c={c} disciplines={disciplines.data ?? []} onChange={coaches.reload} />
      ))}
    </div>
  )
}

function DisciplinePicker({ disciplines, value, onChange }) {
  const toggle = (id) => onChange(value.includes(id) ? value.filter((x) => x !== id) : [...value, id])
  return (
    <fieldset className="p-days">
      <legend>Disciplinas que imparte</legend>
      {disciplines.map((d) => (
        <label key={d.id} className="auth-check">
          <input type="checkbox" checked={value.includes(d.id)} onChange={() => toggle(d.id)} />
          <span>{d.name}</span>
        </label>
      ))}
    </fieldset>
  )
}

function Promote({ disciplines, onDone, onCancel }) {
  const [email, setEmail] = useState('')
  const [ids, setIds] = useState([])
  const action = useAction()
  const submit = (e) => {
    e.preventDefault()
    action.run(async () => {
      await api('/coaches', { method: 'POST', body: { email: email.trim(), disciplineIds: ids } })
      onDone()
    }, 'Coach dada de alta.')
  }
  return (
    <form className="auth-form p-inline-form" onSubmit={submit}>
      <p className="auth-help">
        Primero la coach crea su cuenta en la app (Entrar → Crear cuenta, o con Google). Después escribe aquí su
        correo y elige sus disciplinas.
      </p>
      <label>
        Correo de la coach
        <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="juana@correo.com" />
      </label>
      <DisciplinePicker disciplines={disciplines} value={ids} onChange={setIds} />
      <Notice>{action.error}</Notice>
      <div className="p-actions">
        <button className="btn btn-clay btn-small" disabled={action.busy || !ids.length}>Dar de alta</button>
        <button type="button" className="btn btn-glass btn-small" onClick={onCancel}>Cancelar</button>
      </div>
    </form>
  )
}

function CoachCard({ c, disciplines, onChange }) {
  const [editing, setEditing] = useState(false)
  const [ids, setIds] = useState(c.disciplines.map((d) => d.id))
  const action = useAction()

  const saveDisciplines = () =>
    action.run(async () => {
      await api(`/coaches/${c.id}`, { method: 'PATCH', body: { disciplineIds: ids } })
      setEditing(false)
      onChange()
    }, 'Disciplinas guardadas.')
  const toggleActive = async () => {
    const msg = c.isActive
      ? `¿Desactivar a ${c.name}? Ya no podrá entrar a su panel de coach.`
      : `¿Reactivar a ${c.name}?`
    if (!await confirmDialog(msg)) return
    action.run(async () => {
      await api(`/coaches/${c.id}`, { method: 'PATCH', body: { isActive: !c.isActive } })
      onChange()
    }, c.isActive ? 'Coach desactivada.' : 'Coach activada.')
  }

  return (
    <section className={`p-section glass ${c.isActive ? '' : 'is-off'}`}>
      <header className="p-section-head">
        <div className="p-coach">
          {c.photoPath ? <img src={publicUrl(c.photoPath)} alt="" /> : <span aria-hidden="true">{c.name[0]}</span>}
          <div>
            <h2>{c.name}</h2>
            <p className="p-meta">
              {c.isHeadCoach ? 'Head coach · ' : ''}
              {c.email}
              {c.phone && ` · ${c.phone}`}
              {!c.isActive && ' · desactivada'}
            </p>
            <p className="p-meta">
              {c.disciplines.map((d) => d.name).join(' · ') || 'Sin disciplinas'} · {c.activeClasses} clases activas
            </p>
          </div>
        </div>
        <div className="p-actions">
          <button className="btn btn-glass btn-small" onClick={() => setEditing(!editing)}>{editing ? 'Cerrar' : 'Disciplinas'}</button>
          {!c.isHeadCoach && (
            <button className="btn btn-glass btn-small" onClick={toggleActive} disabled={action.busy}>{c.isActive ? 'Desactivar' : 'Reactivar'}</button>
          )}
        </div>
      </header>
      {editing && (
        <div className="p-inline-form auth-form">
          <DisciplinePicker disciplines={disciplines} value={ids} onChange={setIds} />
          <button className="btn btn-clay btn-small" onClick={saveDisciplines} disabled={action.busy || !ids.length}>Guardar</button>
        </div>
      )}
      {c.bio && <p>{c.bio}</p>}
      {c.certifications.length > 0 && (
        <ul className="p-chips">
          {c.certifications.map((x) => (
            <li key={x.id}>
              {x.filePath ? <a href={publicUrl(x.filePath)} target="_blank" rel="noreferrer">{x.name}</a> : <span>{x.name}</span>}
            </li>
          ))}
        </ul>
      )}
      <Notice>{action.error}</Notice>
    </section>
  )
}
