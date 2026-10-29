import { useState } from 'react'
import { api } from '../lib/api.js'
import { money } from '../lib/time.js'
import { KIND_LABEL } from './plan-labels.js'
import { Dialog, Empty, Notice, StudentPhoto } from './ui.jsx'
import { useAction, useLoad } from './hooks.js'

const STATUS = {
  booked: 'Reservó',
  attended: 'Asistió',
  no_show: 'Faltó',
  cancelled_by_student: 'Canceló',
  cancelled_by_studio: 'Cancelada por el estudio',
}

/**
 * Lista de una sesión (va dentro de una ventana): confirmar asistencia, cobrar a quien paga en
 * efectivo al llegar y agregar alumnas con membresía activa que no reservaron.
 */
export default function Roster({ sessionId, onChange }) {
  const roster = useLoad(`/bookings/sessions/${sessionId}`)
  const action = useAction()
  const [paying, setPaying] = useState(null)
  const r = roster.data
  const refresh = () => {
    roster.reload()
    onChange?.()
  }

  const mark = (b, status) =>
    action.run(async () => {
      await api(`/bookings/${b.id}/attendance`, { method: 'POST', body: { status } })
      refresh()
    }, status === 'attended' ? `${b.student.fullName}: asistencia confirmada.` : 'Asistencia guardada.')

  const active = r?.bookings.filter((b) => b.status !== 'cancelled_by_student' && b.status !== 'cancelled_by_studio') ?? []
  const cancelled = r?.bookings.filter((b) => !active.includes(b)) ?? []
  const toCollect = active.filter((b) => b.payment).length

  return (
    <div className="p-roster">
      <Notice>{roster.error || action.error}</Notice>
      {roster.loading && <p className="p-meta">Cargando lista…</p>}
      {r && (
        <>
          <p className="p-meta">
            {r.capacity - r.spotsLeft} de {r.capacity} lugares
            {toCollect > 0 && <> · <b className="p-warn-soft">{toCollect} {toCollect === 1 ? 'paga' : 'pagan'} en efectivo hoy</b></>}
          </p>
          {!r.canMark && <p className="auth-help">La asistencia se confirma a partir de 2 horas antes de la clase.</p>}
          {active.length === 0 && <Empty>Nadie ha reservado todavía.</Empty>}
          <ul className="p-roster-list">
            {active.map((b) => (
              <li key={b.id} className={`is-${b.status}`}>
                <StudentPhoto name={b.student.fullName} path={b.student.photoPath} small />
                <span className="p-roster-name">
                  <b>{b.student.fullName}</b>
                  <small>
                    {b.planName}
                    {!b.student.usesApp && ' · sin app'}
                    {b.student.phone && <> · <a href={`tel:${b.student.phone}`}>{b.student.phone}</a></>}
                  </small>
                  {b.payment && <small className="p-pay-tag">Paga hoy {money(b.payment.amountCents)} en efectivo</small>}
                  {b.student.specialConditions && <small className="p-warn-soft">⚠ {b.student.specialConditions}</small>}
                </span>
                {r.canMark ? (
                  <span className="p-mark" role="group" aria-label={`Asistencia de ${b.student.fullName}`}>
                    {b.payment ? (
                      <button className="is-pay" onClick={() => setPaying(b)} disabled={action.busy}>Asistencia y pago</button>
                    ) : (
                      <button className={b.status === 'attended' ? 'is-on' : ''} onClick={() => mark(b, b.status === 'attended' ? 'booked' : 'attended')} disabled={action.busy}>
                        {b.status === 'attended' ? '✓ Asistió' : 'Confirmar asistencia'}
                      </button>
                    )}
                    <button className={b.status === 'no_show' ? 'is-off' : ''} onClick={() => mark(b, b.status === 'no_show' ? 'booked' : 'no_show')} disabled={action.busy}>
                      Faltó
                    </button>
                  </span>
                ) : (
                  <small>{STATUS[b.status]}</small>
                )}
              </li>
            ))}
          </ul>
          {cancelled.length > 0 && (
            <p className="p-meta">Cancelaron: {cancelled.map((b) => b.student.fullName).join(', ')}</p>
          )}
          {r.canMark && r.status !== 'cancelled' && <AddStudents sessionId={sessionId} spotsLeft={r.spotsLeft} onDone={refresh} />}
        </>
      )}
      {paying && <CollectDialog b={paying} onClose={(done) => { setPaying(null); if (done) refresh() }} />}
    </div>
  )
}

/** Ventana de cobro: qué paga (clase o membresía) y cuánto cobrar. */
function CollectDialog({ b, onClose }) {
  const action = useAction()
  const { payment } = b
  const isClass = payment.kind === 'single_class'
  const collect = () =>
    action.run(async () => {
      await api('/memberships/collect', { method: 'POST', body: { bookingId: b.id } })
      onClose(true)
    }, `${b.student.fullName}: asistencia y pago registrados. Le llega su recibo por correo.`)

  return (
    <Dialog title={`Cobrar a ${b.student.fullName}`} onClose={() => onClose(false)}>
      <div className="p-dialog-body">
        <p>{isClass ? 'Paga esta clase:' : 'Paga su membresía; con este pago se activan sus demás clases:'}</p>
        <p className="p-dialog-price">
          <b>{KIND_LABEL[payment.kind]} · {payment.planName}</b>
          <span>{money(payment.amountCents)}</span>
        </p>
        <p className="auth-help">Confirma solo cuando tengas el efectivo en la mano. Se marca su asistencia y se registra el pago.</p>
        <Notice>{action.error}</Notice>
        <button className="btn btn-ok" onClick={collect} disabled={action.busy}>
          {action.busy ? 'Guardando…' : `Recibí ${money(payment.amountCents)}`}
        </button>
      </div>
    </Dialog>
  )
}

/** Catálogo: alumnas con membresía activa para esta clase que no están en la lista. */
function AddStudents({ sessionId, spotsLeft, onDone }) {
  const list = useLoad(`/bookings/sessions/${sessionId}/candidates`)
  const [q, setQ] = useState('')
  const action = useAction()
  const needle = q.trim().toLowerCase()
  const shown = (list.data ?? []).filter((s) => !needle || s.fullName.toLowerCase().includes(needle) || s.phone?.includes(needle))

  const add = (s) =>
    action.run(async () => {
      await api(`/bookings/sessions/${sessionId}/walk-in`, { method: 'POST', body: { studentId: s.id } })
      list.reload()
      onDone()
    }, s.paysToday ? `${s.fullName} agregada. Cóbrale con “Asistencia y pago”.` : `${s.fullName} agregada con asistencia.`)

  return (
    <div className="p-walkin">
      <h3 className="p-sub">Agregar alumna a la lista</h3>
      {spotsLeft === 0 ? (
        <p className="p-meta">La clase está llena.</p>
      ) : (
        <>
          <p className="auth-help">Alumnas con membresía para esta clase, aunque no usen la app. Se agregan con asistencia y gastan un crédito; a las que pagan hoy les cobras al agregarlas.</p>
          {(list.data?.length ?? 0) > 6 && (
            <input className="p-filter-input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por nombre o celular" aria-label="Buscar alumna" />
          )}
          <Notice>{list.error || action.error}</Notice>
          {list.data?.length === 0 && <p className="p-meta">Nadie más tiene membresía para esta clase. Véndele un plan en “Alumnas”.</p>}
          <ul className="p-candidates">
            {shown.map((s) => (
              <li key={s.id}>
                <StudentPhoto name={s.fullName} path={s.photoPath} small />
                <span className="p-roster-name">
                  <b>{s.fullName}</b>
                  <small>{s.planName}{!s.usesApp && ' · sin app'}</small>
                  {s.paysToday && <small className="p-pay-tag">Paga hoy en efectivo</small>}
                </span>
                <button className="btn btn-glass btn-small" onClick={() => add(s)} disabled={action.busy} aria-label={`Agregar a ${s.fullName}`}>
                  + Agregar
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}
