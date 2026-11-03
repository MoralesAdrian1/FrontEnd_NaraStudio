import { useState } from 'react'
import { api } from '../lib/api.js'
import { money } from '../lib/time.js'
import { KIND_LABEL } from './plan-labels.js'
import { Dialog, Empty, Notice, StudentPhoto } from './ui.jsx'
import { NewStudent } from './Students.jsx'
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
 * efectivo al llegar y agregar alumnas con membresía activa que no reservaron. Con addInDialog, el
 * catálogo se abre con un botón en su propia ventana.
 */
export default function Roster({ sessionId, onChange, addInDialog = false }) {
  const roster = useLoad(`/bookings/sessions/${sessionId}`)
  const action = useAction()
  const [paying, setPaying] = useState(null)
  const [adding, setAdding] = useState(false)
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
  const canAdd = r?.canMark && r.status !== 'cancelled'

  return (
    <div className="p-roster">
      <Notice>{roster.error || action.error}</Notice>
      {roster.loading && <p className="p-meta">Cargando lista…</p>}
      {r && (
        <>
          <div className="p-roster-head">
            <p className="p-meta">
              {r.capacity - r.spotsLeft} de {r.capacity} lugares
              {toCollect > 0 && <> · <b className="p-warn-soft">{toCollect} {toCollect === 1 ? 'paga' : 'pagan'} en efectivo hoy</b></>}
            </p>
            {addInDialog && canAdd && (
              <button className="btn btn-clay btn-small" onClick={() => setAdding(true)}>+ Agregar alumna</button>
            )}
          </div>
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
          {canAdd && !addInDialog && <AddStudents sessionId={sessionId} spotsLeft={r.spotsLeft} salePlans={r.salePlans} onDone={refresh} />}
        </>
      )}
      {adding && r && (
        <Dialog title="Agregar alumna a la lista" wide onClose={() => setAdding(false)}>
          <AddStudents sessionId={sessionId} spotsLeft={r.spotsLeft} salePlans={r.salePlans} onDone={refresh} bare />
        </Dialog>
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
function AddStudents({ sessionId, spotsLeft, salePlans, onDone, bare = false }) {
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
      {!bare && <h3 className="p-sub">Agregar alumna a la lista</h3>}
      {spotsLeft === 0 ? (
        <p className="p-meta">La clase está llena.</p>
      ) : (
        <>
          <p className="auth-help">Alumnas con membresía para esta clase, aunque no usen la app. Se agregan con asistencia y gastan un crédito; a las que pagan hoy les cobras al agregarlas.</p>
          {(list.data?.length ?? 0) > 6 && (
            <input className="p-filter-input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por nombre o celular" aria-label="Buscar alumna" />
          )}
          <Notice>{list.error || action.error}</Notice>
          {list.data?.length === 0 && <p className="p-meta">Nadie más tiene membresía para esta clase.</p>}
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
          <WithoutPlan sessionId={sessionId} plans={salePlans} onDone={onDone} />
        </>
      )}
    </div>
  )
}

/**
 * Llegó sin plan: se busca entre todas las alumnas (o se registra ahí mismo y le llega la
 * invitación) y se le cobra en efectivo la clase individual o una membresía.
 */
function WithoutPlan({ sessionId, plans, onDone }) {
  const [q, setQ] = useState('')
  const [chosen, setChosen] = useState(null)
  const [registering, setRegistering] = useState(false)
  const needle = q.trim()
  const found = useLoad(needle.length >= 2 ? `/students?q=${encodeURIComponent(needle)}` : null)

  const restart = () => {
    setChosen(null)
    setQ('')
  }

  return (
    <div className="p-walkin">
      <h3 className="p-sub">¿Llegó sin plan?</h3>
      {!plans.length ? (
        <p className="p-meta">No hay planes a la venta para esta disciplina. Créalos en “Planes”.</p>
      ) : chosen ? (
        <Charge
          sessionId={sessionId}
          student={chosen}
          plans={plans}
          onDone={() => { restart(); onDone() }}
          onCancel={() => setChosen(null)}
        />
      ) : registering ? (
        <NewStudent onDone={(s) => { setRegistering(false); setChosen(s) }} onCancel={() => setRegistering(false)} />
      ) : (
        <>
          <p className="auth-help">Búscala y cóbrale en efectivo la clase de hoy o una membresía. Si es nueva, regístrala y le llega su invitación a la app.</p>
          <div className="p-actions">
            <input className="p-filter-input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Nombre, celular o correo" aria-label="Buscar alumna sin plan" />
            <button className="btn btn-glass btn-small" onClick={() => setRegistering(true)}>+ Registrar alumna nueva</button>
          </div>
          <Notice>{found.error}</Notice>
          {found.data?.length === 0 && <p className="p-meta">No encontramos a nadie con “{needle}”. Regístrala como alumna nueva.</p>}
          <ul className="p-candidates">
            {(found.data ?? []).slice(0, 8).map((s) => (
              <li key={s.id}>
                <StudentPhoto name={s.fullName} path={s.photoPath} small />
                <span className="p-roster-name">
                  <b>{s.fullName}</b>
                  <small>{s.activePlans.length ? s.activePlans.join(', ') : 'Sin plan activo'}{!s.usesApp && ' · sin app'}</small>
                </span>
                <button className="btn btn-glass btn-small" onClick={() => setChosen(s)} aria-label={`Cobrar a ${s.fullName}`}>
                  Cobrar
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}

/** Qué paga (clase de hoy o membresía) y cuánto; al confirmar queda pagado y con asistencia. */
function Charge({ sessionId, student, plans, onDone, onCancel }) {
  const [planId, setPlanId] = useState(plans[0].id)
  const action = useAction()
  const plan = plans.find((p) => p.id === planId)
  const charge = () =>
    action.run(async () => {
      await api('/memberships/sell-at-class', { method: 'POST', body: { sessionId, studentId: student.id, planId } })
      onDone()
    }, `${student.fullName}: pago y asistencia registrados. Le llega su recibo por correo.`)

  return (
    <div className="p-dialog-body">
      <p>¿Qué paga <b>{student.fullName}</b>?</p>
      <div className="p-plan-pick" role="radiogroup" aria-label="Plan que paga">
        {plans.map((p) => (
          <label key={p.id} className={p.id === planId ? 'is-on' : ''}>
            <input type="radio" name="sale-plan" checked={p.id === planId} onChange={() => setPlanId(p.id)} />
            <span>
              <b>{p.name}</b>
              <small>{p.kind === 'single_class' ? 'Solo la clase de hoy' : `${KIND_LABEL[p.kind]} · la clase de hoy cuenta como la primera`}</small>
            </span>
            <span>{money(p.priceCents)}</span>
          </label>
        ))}
      </div>
      <p className="auth-help">Confirma solo cuando tengas el efectivo en la mano. Se registra el pago y su asistencia.</p>
      <Notice>{action.error}</Notice>
      <span className="p-actions">
        <button className="btn btn-ok" onClick={charge} disabled={action.busy}>
          {action.busy ? 'Guardando…' : `Recibí ${money(plan.priceCents)}`}
        </button>
        <button className="btn btn-glass" onClick={onCancel} disabled={action.busy}>Cancelar</button>
      </span>
    </div>
  )
}
