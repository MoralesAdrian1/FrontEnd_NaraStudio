import { useState } from 'react'
import { api } from '../lib/api.js'
import { clock, shortDate, studioDate, whenLabel } from '../lib/time.js'
import { Dialog, Empty, Notice, Section, Toggle } from './ui.jsx'
import { useAction, useLoad, useNow } from './hooks.js'
import Roster from './Roster.jsx'

/** Próximas sesiones de mis clases: lugares ocupados, cancelar y abrir clases sueltas. */
export default function Sessions({ me }) {
  const sessions = useLoad('/sessions')
  const classes = useLoad('/classes/mine')
  const isAdmin = me.role === 'admin'
  const [mineOnly, setMineOnly] = useState(!isAdmin)
  const today = studioDate()

  const list = (sessions.data ?? []).filter(
    (s) => s.date >= today && (!mineOnly || s.coach.id === me.coach?.id),
  )
  const byDate = list.reduce((acc, s) => ((acc[s.date] ??= []).push(s), acc), {})

  return (
    <div className="p-stack">
      <Section
        title="Próximas sesiones"
        action={
          <Toggle label="Clase suelta">
            {(close) => (
              <NewSession
                classes={(classes.data ?? []).filter((c) => c.isActive)}
                onDone={() => { close(); sessions.reload() }}
                onCancel={close}
              />
            )}
          </Toggle>
        }
      >
        {isAdmin && (
          <label className="auth-check p-filter">
            <input type="checkbox" checked={mineOnly} onChange={(e) => setMineOnly(e.target.checked)} />
            <span>Solo mis clases</span>
          </label>
        )}
        <Notice>{sessions.error}</Notice>
        {sessions.data && list.length === 0 && <Empty>No hay sesiones en las próximas dos semanas.</Empty>}
      </Section>

      {Object.entries(byDate).map(([date, items]) => (
        <section className="p-section glass" key={date}>
          <h2 className="p-day">
            {whenLabel(date, today)} <small>{shortDate(date)}</small>
          </h2>
          <ul className="p-sessions">
            {items.map((s) => <SessionRow key={s.id} s={s} showCoach={isAdmin} onChange={sessions.reload} />)}
          </ul>
        </section>
      ))}
    </div>
  )
}

function SessionRow({ s, showCoach, onChange }) {
  const [cancelling, setCancelling] = useState(false)
  const [listOpen, setListOpen] = useState(false)
  const [reason, setReason] = useState('')
  const action = useAction()
  const now = useNow()
  const past = Date.parse(s.startsAt) <= now
  const cancelled = s.status === 'cancelled'

  const cancel = (e) => {
    e.preventDefault()
    action.run(async () => {
      await api(`/sessions/${s.id}/cancel`, { method: 'POST', body: { reason } })
      setCancelling(false)
      onChange()
    }, 'Sesión cancelada: las alumnas recuperan su crédito.')
  }

  return (
    <li className={`p-session ${cancelled ? 'is-cancelled' : ''} ${past ? 'is-past' : ''}`}>
      <span className="p-session-time">{clock(s.time)}</span>
      <span className="p-session-name">
        <b>{s.class.name}</b>
        <small>
          {s.discipline.name}
          {showCoach && ` · ${s.coach.name}`}
          {!s.recurring && ' · clase suelta'}
        </small>
      </span>
      <span className="p-session-spots">
        {cancelled ? (
          <small>Cancelada{s.cancelReason ? `: ${s.cancelReason}` : ''}</small>
        ) : (
          <>
            <b>{s.booked}/{s.capacity}</b>
            <small>{s.spotsLeft === 0 ? 'llena' : `${s.spotsLeft} libres`}</small>
          </>
        )}
      </span>
      <span className="p-actions">
        {!cancelled && (
          <button className="btn btn-clay btn-small" onClick={() => setListOpen(true)} aria-haspopup="dialog">
            Lista
          </button>
        )}
        {!cancelled && !past && !cancelling && (
          <button className="btn btn-glass btn-small" onClick={() => setCancelling(true)}>Cancelar</button>
        )}
      </span>
      {cancelling && (
        <form className="p-cancel" onSubmit={cancel}>
          <input required minLength={3} maxLength={200} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Motivo (lo verán las alumnas)" />
          <button className="btn btn-clay btn-small" disabled={action.busy}>Confirmar</button>
          <button type="button" className="btn btn-glass btn-small" onClick={() => setCancelling(false)}>No</button>
          {s.booked > 0 && <small>{s.booked} reservas recuperarán su crédito.</small>}
        </form>
      )}
      {listOpen && (
        <Dialog wide title={`${s.class.name} · ${clock(s.time)}`} onClose={() => setListOpen(false)}>
          <Roster sessionId={s.id} onChange={onChange} />
        </Dialog>
      )}
      <Notice>{action.error}</Notice>
    </li>
  )
}

function NewSession({ classes, onDone, onCancel }) {
  const [form, setForm] = useState({ classId: classes[0]?.id ?? '', date: '', startTime: '' })
  const action = useAction()
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })

  if (!classes.length) return <Empty>Primero crea una clase en “Mis clases”.</Empty>

  const submit = (e) => {
    e.preventDefault()
    action.run(async () => {
      await api('/sessions', {
        method: 'POST',
        body: { classId: Number(form.classId), date: form.date, startTime: form.startTime },
      })
      onDone()
    }, 'Clase suelta creada.')
  }

  return (
    <form className="auth-form p-inline-form" onSubmit={submit}>
      <div className="auth-row three">
        <label>
          Clase
          <select value={form.classId} onChange={set('classId')}>
            {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </label>
        <label>
          Fecha
          <input type="date" required min={studioDate()} value={form.date} onChange={set('date')} />
        </label>
        <label>
          Hora
          <input type="time" required value={form.startTime} onChange={set('startTime')} />
        </label>
      </div>
      <Notice>{action.error}</Notice>
      <div className="p-actions">
        <button className="btn btn-clay btn-small" disabled={action.busy}>Abrir clase</button>
        <button type="button" className="btn btn-glass btn-small" onClick={onCancel}>Cancelar</button>
      </div>
    </form>
  )
}
