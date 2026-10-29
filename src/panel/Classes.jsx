import { useState } from 'react'
import { api } from '../lib/api.js'
import { clock, DAYS } from '../lib/time.js'
import { Empty, Notice, Section, Toggle } from './ui.jsx'
import { useAction, useLoad } from './hooks.js'
import { confirmDialog } from '../lib/feedback.js'

const WEEKDAYS = [1, 2, 3, 4, 5, 6, 0] // de lunes a domingo

/** Mis clases y sus horarios recurrentes (el admin ve todas). */
export default function Classes({ me }) {
  const classes = useLoad('/classes/mine')
  const isAdmin = me.role === 'admin'
  const allDisciplines = useLoad('/disciplines')
  const coaches = useLoad(isAdmin ? '/coaches/all' : null)
  const disciplines = isAdmin
    ? (allDisciplines.data ?? [])
    : me.coach.disciplines.map((d) => d.discipline).filter((d) => d.isActive)

  return (
    <div className="p-stack">
      <Section
        title={isAdmin ? 'Clases del estudio' : 'Mis clases'}
        action={
          <Toggle label="Nueva clase">
            {(close) => <NewClass disciplines={disciplines} onDone={() => { close(); classes.reload() }} onCancel={close} />}
          </Toggle>
        }
      >
        <Notice>{classes.error}</Notice>
        {classes.data?.length === 0 && <Empty>Aún no hay clases. Crea la primera con “Nueva clase”.</Empty>}
      </Section>
      {classes.data?.map((c) => (
        <ClassCard key={c.id} cls={c} showCoach={isAdmin} coaches={coaches.data ?? []} onChange={classes.reload} />
      ))}
    </div>
  )
}

function NewClass({ disciplines, onDone, onCancel }) {
  const [form, setForm] = useState({ name: '', disciplineId: disciplines[0]?.id ?? '', capacity: '', durationMin: '60' })
  const action = useAction()
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })
  const discipline = disciplines.find((d) => d.id === Number(form.disciplineId))

  const submit = (e) => {
    e.preventDefault()
    action.run(async () => {
      await api('/classes', {
        method: 'POST',
        body: {
          name: form.name,
          disciplineId: Number(form.disciplineId),
          capacity: form.capacity ? Number(form.capacity) : undefined,
          durationMin: Number(form.durationMin),
        },
      })
      onDone()
    }, 'Clase creada.')
  }

  return (
    <form className="auth-form p-inline-form" onSubmit={submit}>
      <div className="auth-row">
        <label>
          Nombre
          <input required minLength={2} maxLength={60} value={form.name} onChange={set('name')} placeholder="Barre & Sculpt" />
        </label>
        <label>
          Disciplina
          <select required value={form.disciplineId} onChange={set('disciplineId')}>
            {disciplines.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </label>
      </div>
      <div className="auth-row">
        <label>
          Cupo
          <input type="number" min="1" max="100" value={form.capacity} onChange={set('capacity')} placeholder={discipline ? `${discipline.defaultCapacity} (de la disciplina)` : ''} />
        </label>
        <label>
          Duración (min)
          <input type="number" required min="15" max="240" step="5" value={form.durationMin} onChange={set('durationMin')} />
        </label>
      </div>
      <Notice>{action.error}</Notice>
      <div className="p-actions">
        <button className="btn btn-clay btn-small" disabled={action.busy}>Crear clase</button>
        <button type="button" className="btn btn-glass btn-small" onClick={onCancel}>Cancelar</button>
      </div>
    </form>
  )
}

function ClassCard({ cls, showCoach, coaches, onChange }) {
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({ name: cls.name, capacity: String(cls.capacity), durationMin: String(cls.durationMin), coachId: String(cls.coach.id) })
  // Coaches activas que imparten la disciplina de la clase
  const candidates = coaches.filter((c) => c.isActive && c.disciplines.some((d) => d.id === cls.discipline.id))
  const action = useAction()
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })

  const save = (e) => {
    e.preventDefault()
    action.run(async () => {
      await api(`/classes/${cls.id}`, {
        method: 'PATCH',
        body: {
          name: form.name,
          capacity: Number(form.capacity),
          durationMin: Number(form.durationMin),
          ...(showCoach && { coachId: Number(form.coachId) }),
        },
      })
      setEditing(false)
      onChange()
    }, 'Clase guardada.')
  }

  const toggleActive = async () => {
    const msg = cls.isActive
      ? `¿Desactivar “${cls.name}”? Se cancelan sus próximas sesiones y las alumnas recuperan su crédito.`
      : `¿Reactivar “${cls.name}”?`
    if (!await confirmDialog(msg)) return
    action.run(async () => {
      await api(`/classes/${cls.id}`, { method: 'PATCH', body: { isActive: !cls.isActive } })
      onChange()
    }, cls.isActive ? 'Clase desactivada.' : 'Clase activada.')
  }

  const endSchedule = async (s) => {
    if (!await confirmDialog(`¿Quitar el horario de ${DAYS[s.weekday]} ${clock(s.startTime)}? Se cancelan sus próximas sesiones.`)) return
    action.run(async () => {
      await api(`/classes/${cls.id}/schedules/${s.id}`, { method: 'DELETE' })
      onChange()
    }, (r) => `Horario quitado. Sesiones canceladas: ${r.cancelledSessions}.`)
  }

  return (
    <section className={`p-section glass ${cls.isActive ? '' : 'is-off'}`}>
      <header className="p-section-head">
        <div>
          <h2>{cls.name}</h2>
          <p className="p-meta">
            {cls.discipline.name} · cupo {cls.capacity} · {cls.durationMin} min
            {showCoach && ` · ${cls.coach.name}`}
            {!cls.isActive && ' · desactivada'}
          </p>
        </div>
        <div className="p-actions">
          <button className="btn btn-glass btn-small" onClick={() => setEditing(!editing)}>{editing ? 'Cerrar' : 'Editar'}</button>
          <button className="btn btn-glass btn-small" onClick={toggleActive} disabled={action.busy}>{cls.isActive ? 'Desactivar' : 'Reactivar'}</button>
        </div>
      </header>

      {editing && (
        <form className="auth-form p-inline-form" onSubmit={save}>
          <div className="auth-row three">
            <label>
              Nombre
              <input required minLength={2} maxLength={60} value={form.name} onChange={set('name')} />
            </label>
            <label>
              Cupo
              <input type="number" required min="1" max="100" value={form.capacity} onChange={set('capacity')} />
            </label>
            <label>
              Duración (min)
              <input type="number" required min="15" max="240" step="5" value={form.durationMin} onChange={set('durationMin')} />
            </label>
          </div>
          {showCoach && (
            <label>
              Coach
              <select value={form.coachId} onChange={set('coachId')}>
                {candidates.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </label>
          )}
          <p className="auth-help">El nuevo cupo y la coach aplican a las próximas sesiones.</p>
          <button className="btn btn-clay btn-small" disabled={action.busy}>Guardar cambios</button>
        </form>
      )}

      <h3 className="p-sub">Horarios que se repiten cada semana</h3>
      {cls.schedules.length === 0 ? (
        <Empty>Sin horarios. Agrega uno para que se generen sus sesiones.</Empty>
      ) : (
        <ul className="p-chips">
          {[...cls.schedules]
            .sort((a, b) => ((a.weekday + 6) % 7) - ((b.weekday + 6) % 7) || a.startTime.localeCompare(b.startTime))
            .map((s) => (
              <li key={s.id}>
                <span>{DAYS[s.weekday]} · {clock(s.startTime)}</span>
                {s.validUntil && <small>hasta {s.validUntil}</small>}
                <button aria-label={`Quitar ${DAYS[s.weekday]} ${clock(s.startTime)}`} onClick={() => endSchedule(s)} disabled={action.busy}>×</button>
              </li>
            ))}
        </ul>
      )}
      <Notice>{action.error}</Notice>
      {cls.isActive && (
        <Toggle label="Agregar horario" className="btn btn-glass btn-small">
          {(close) => <NewSchedule classId={cls.id} onDone={() => { close(); onChange() }} onCancel={close} />}
        </Toggle>
      )}
    </section>
  )
}

function NewSchedule({ classId, onDone, onCancel }) {
  const [form, setForm] = useState({ weekday: '1', startTime: '', validFrom: '' })
  const action = useAction()
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })

  const submit = (e) => {
    e.preventDefault()
    action.run(async () => {
      await api(`/classes/${classId}/schedules`, {
        method: 'POST',
        body: { weekday: Number(form.weekday), startTime: form.startTime, validFrom: form.validFrom || undefined },
      })
      onDone()
    }, 'Horario agregado.')
  }

  return (
    <form className="auth-form p-inline-form" onSubmit={submit}>
      <div className="auth-row three">
        <label>
          Día
          <select value={form.weekday} onChange={set('weekday')}>
            {WEEKDAYS.map((d) => <option key={d} value={d}>{DAYS[d]}</option>)}
          </select>
        </label>
        <label>
          Hora
          <input type="time" required value={form.startTime} onChange={set('startTime')} />
        </label>
        <label>
          Desde (opcional)
          <input type="date" value={form.validFrom} onChange={set('validFrom')} />
        </label>
      </div>
      <Notice>{action.error}</Notice>
      <div className="p-actions">
        <button className="btn btn-clay btn-small" disabled={action.busy}>Agregar</button>
        <button type="button" className="btn btn-glass btn-small" onClick={onCancel}>Cancelar</button>
      </div>
    </form>
  )
}
