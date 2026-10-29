import { useState } from 'react'
import { api } from '../lib/api.js'
import { shortDate, studioDate } from '../lib/time.js'
import { Empty, Notice, Section, Toggle } from './ui.jsx'
import { useAction, useLoad } from './hooks.js'
import { confirmDialog } from '../lib/feedback.js'

/** Disciplinas del estudio (solo admin). */
export function Disciplines() {
  const list = useLoad('/disciplines/all')
  return (
    <div className="p-stack">
      <Section
        title="Disciplinas"
        action={
          <Toggle label="Nueva disciplina">
            {(close) => <DisciplineForm onDone={() => { close(); list.reload() }} onCancel={close} />}
          </Toggle>
        }
      >
        <Notice>{list.error}</Notice>
      </Section>
      {list.data?.map((d) => <DisciplineCard key={d.id} d={d} onChange={list.reload} />)}
    </div>
  )
}

/** "Pilates Mat" → "pilates-mat" (sin acentos ni espacios) */
const slugify = (text) =>
  text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)

function DisciplineForm({ d, onDone, onCancel }) {
  const [form, setForm] = useState({
    name: d?.name ?? '',
    description: d?.description ?? '',
    defaultCapacity: String(d?.defaultCapacity ?? 12),
  })
  const action = useAction()
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })

  const submit = (e) => {
    e.preventDefault()
    const body = { name: form.name.trim(), description: form.description || undefined, defaultCapacity: Number(form.defaultCapacity) }
    action.run(async () => {
      await api(d ? `/disciplines/${d.id}` : '/disciplines', { method: d ? 'PATCH' : 'POST', body: d ? body : { ...body, slug: slugify(form.name) } })
      onDone()
    }, 'Disciplina guardada.')
  }

  return (
    <form className="auth-form p-inline-form" onSubmit={submit}>
      <div className="auth-row">
        <label>
          Nombre
          <input required minLength={2} maxLength={60} value={form.name} onChange={set('name')} placeholder="Yoga" />
        </label>
        <label>
          Cupo por defecto
          <input type="number" required min="1" max="100" value={form.defaultCapacity} onChange={set('defaultCapacity')} />
        </label>
      </div>
      <label>
        Descripción
        <input maxLength={300} value={form.description} onChange={set('description')} />
      </label>
      <Notice>{action.error}</Notice>
      <div className="p-actions">
        <button className="btn btn-clay btn-small" disabled={action.busy}>{d ? 'Guardar' : 'Crear'}</button>
        <button type="button" className="btn btn-glass btn-small" onClick={onCancel}>Cancelar</button>
      </div>
    </form>
  )
}

function DisciplineCard({ d, onChange }) {
  const [editing, setEditing] = useState(false)
  const action = useAction()
  const toggle = () =>
    action.run(async () => {
      await api(`/disciplines/${d.id}`, { method: 'PATCH', body: { isActive: !d.isActive } })
      onChange()
    }, d.isActive ? 'Disciplina desactivada.' : 'Disciplina activada.')

  return (
    <section className={`p-section glass ${d.isActive ? '' : 'is-off'}`}>
      <header className="p-section-head">
        <div>
          <h2>{d.name}</h2>
          <p className="p-meta">
            {d.slug} · cupo por defecto {d.defaultCapacity}
            {d.description && ` · ${d.description}`}
            {!d.isActive && ' · desactivada'}
          </p>
        </div>
        <div className="p-actions">
          <button className="btn btn-glass btn-small" onClick={() => setEditing(!editing)}>{editing ? 'Cerrar' : 'Editar'}</button>
          <button className="btn btn-glass btn-small" onClick={toggle} disabled={action.busy}>{d.isActive ? 'Desactivar' : 'Reactivar'}</button>
        </div>
      </header>
      {editing && <DisciplineForm d={d} onDone={() => { setEditing(false); onChange() }} onCancel={() => setEditing(false)} />}
      <Notice>{action.error}</Notice>
    </section>
  )
}

/** Días que el estudio no abre (solo admin). */
export function Closures() {
  const list = useLoad('/closures')
  const [form, setForm] = useState({ date: '', reason: '' })
  const action = useAction()

  const add = (e) => {
    e.preventDefault()
    action.run(async () => {
      const r = await api('/closures', { method: 'POST', body: form })
      setForm({ date: '', reason: '' })
      list.reload()
      return r
    }, (r) => `Día cerrado. Sesiones canceladas: ${r.cancelledSessions}. Reservas con crédito devuelto: ${r.refundedBookings}.`)
  }

  const remove = async (c) => {
    if (!await confirmDialog(`¿Abrir de nuevo el ${shortDate(c.date)}? Se vuelven a generar sus sesiones.`)) return
    action.run(async () => {
      await api(`/closures/${c.date}`, { method: 'DELETE' })
      list.reload()
    }, 'Día abierto de nuevo.')
  }

  return (
    <div className="p-stack">
      <Section title="Días cerrados">
        <p className="auth-help">Festivos o días sin clases. Se cancelan las sesiones de ese día, las alumnas recuperan su crédito y la racha no se rompe.</p>
        <form className="auth-form p-inline-form" onSubmit={add}>
          <div className="auth-row">
            <label>
              Fecha
              <input type="date" required min={studioDate()} value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            </label>
            <label>
              Motivo
              <input required minLength={3} maxLength={120} value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} placeholder="Día de Muertos" />
            </label>
          </div>
          <button className="btn btn-clay btn-small" disabled={action.busy}>Cerrar ese día</button>
        </form>
        <Notice>{action.error || list.error}</Notice>
        {list.data?.length === 0 && <Empty>No hay días cerrados próximamente.</Empty>}
        {!!list.data?.length && (
          <ul className="p-chips">
            {list.data.map((c) => (
              <li key={c.id}>
                <span>{shortDate(c.date)} · {c.reason}</span>
                <button aria-label={`Abrir ${c.date}`} onClick={() => remove(c)} disabled={action.busy}>×</button>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </div>
  )
}
