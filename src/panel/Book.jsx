import { useState } from 'react'
import { api } from '../lib/api.js'
import { clock, money, shortDate, studioDate, whenLabel } from '../lib/time.js'
import { longDate, planPrice } from './plan-labels.js'
import { Dialog, Empty, Notice, Section } from './ui.jsx'
import { useAction, useLoad, useNow } from './hooks.js'
import { confirmDialog } from '../lib/feedback.js'

const STATUS = {
  booked: 'Reservada',
  attended: 'Asististe',
  no_show: 'Faltaste',
  cancelled_by_student: 'Cancelaste',
  cancelled_by_studio: 'Cancelada por el estudio',
}

/** La clase que se eligió en la landing (/cuenta?reservar=ID). */
const requestedId = () => Number(new URLSearchParams(window.location.search).get('reservar')) || null
const clearRequested = () => {
  const url = new URL(window.location.href)
  url.searchParams.delete('reservar')
  window.history.replaceState(null, '', url.pathname + url.search + url.hash)
}

/** La alumna reserva sus clases y ve sus próximas reservas. */
export default function Book() {
  const available = useLoad('/bookings/available')
  const mine = useLoad('/bookings/mine')
  const requests = useLoad('/memberships/mine')
  const action = useAction()
  const now = useNow()
  const today = studioDate()
  const [chosenId, setChosenId] = useState(requestedId)
  const reload = () => {
    available.reload()
    mine.reload()
    requests.reload()
  }

  const sessions = available.data?.sessions ?? []
  const chosen = chosenId && sessions.find((s) => s.id === chosenId)
  // La clase de la landing ya no se puede reservar desde aquí (pasó, o su semana aún no abre)
  const missing = chosenId && available.data && !chosen
  const pendingFor = (s) =>
    (requests.data ?? []).find((m) => m.status === 'pending_payment' && m.classSession?.id === s.id)

  /** Cierra la ventana; si se reservó o se pidió la clase, recarga la lista. */
  const close = (changed = false) => {
    setChosenId(null)
    clearRequested()
    if (changed) {
      reload()
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  const cancel = async (id, label) => {
    if (!await confirmDialog(`¿Cancelar tu lugar en ${label}? Recuperas tu crédito.`)) return
    action.run(async () => {
      await api(`/bookings/${id}/cancel`, { method: 'POST' })
      reload()
    }, 'Reserva cancelada: recuperaste tu crédito.')
  }

  const upcoming = (mine.data ?? []).filter((b) => b.status === 'booked' && Date.parse(b.startsAt) > now).reverse()
  const byDate = sessions.reduce((acc, s) => ((acc[s.date] ??= []).push(s), acc), {})

  return (
    <div className="p-stack">
      <Section title="Mis próximas clases">
        <Notice>{mine.error || action.error}</Notice>
        {missing && (
          <Notice>
            Esa clase no se puede reservar ahora: ya pasó o su semana todavía no abre (abre el sábado a las 6:00 a.m.). Elige otra abajo.
          </Notice>
        )}
        {mine.data && upcoming.length === 0 && <Empty>No tienes clases reservadas. Elige una abajo.</Empty>}
        <ul className="p-history">
          {upcoming.map((b) => (
            <li key={b.id}>
              <span><b>{b.className}</b> · {whenLabel(b.date, today)} {clock(b.time)}</span>
              <small>
                con {b.coachName} · {b.planName}{' '}
                <button className="auth-link" onClick={() => cancel(b.id, b.className)} disabled={action.busy}>Cancelar</button>
              </small>
              {b.payAtClassCents !== null && (
                <small className="p-pay-tag">Pendiente de pago: pagas {money(b.payAtClassCents)} en efectivo el día de tu clase</small>
              )}
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Reservar">
        <Notice>{available.error}</Notice>
        {available.loading && <p className="p-meta">Cargando clases…</p>}
        {available.data && (
          <p className="auth-help">
            Puedes reservar hasta el {longDate(`${available.data.bookableUntil}T18:00:00Z`)}. La semana siguiente se abre el sábado a las 6:00 a.m.
          </p>
        )}
        {available.data && sessions.length === 0 && <Empty>No hay clases disponibles por ahora.</Empty>}
      </Section>

      {Object.entries(byDate).map(([date, items]) => (
        <section className="p-section glass" key={date}>
          <h2 className="p-day">{whenLabel(date, today)} <small>{shortDate(date)}</small></h2>
          <ul className="p-sessions">
            {items.map((s) => (
              <li key={s.id} className={`p-session ${s.status === 'cancelled' ? 'is-cancelled' : ''}`}>
                <span className="p-session-time">{clock(s.time)}</span>
                <span className="p-session-name">
                  <b>{s.class.name}</b>
                  <small>{s.discipline.name} · con {s.coach.name}</small>
                </span>
                <SpotsLeft s={s} />
                <BookAction
                  s={s}
                  pending={pendingFor(s)}
                  busy={action.busy}
                  onBook={() => setChosenId(s.id)}
                  onCancel={() => cancel(s.myBooking.id, s.class.name)}
                />
              </li>
            ))}
          </ul>
        </section>
      ))}

      {chosen && <BookDialog s={chosen} pending={pendingFor(chosen)} today={today} onClose={close} />}
    </div>
  )
}

const isMine = (s) => s.myBooking && (s.myBooking.status === 'booked' || s.myBooking.status === 'attended')

function SpotsLeft({ s }) {
  if (s.status === 'cancelled') return <span className="p-session-spots"><small>Cancelada</small></span>
  if (s.spotsLeft === 0) return <span className="p-session-spots"><small>Llena</small></span>
  return (
    <span className="p-session-spots is-open">
      <b>{s.spotsLeft}</b>
      <small>{s.spotsLeft === 1 ? 'lugar libre' : 'lugares libres'}</small>
    </span>
  )
}

function BookAction({ s, pending, busy, onBook, onCancel }) {
  if (s.status === 'cancelled') return <span />
  if (isMine(s)) {
    return (
      <span className="p-booked">
        <b>{STATUS[s.myBooking.status]}</b>
        {s.myBooking.status === 'booked' && <button className="auth-link" onClick={onCancel} disabled={busy}>Cancelar</button>}
      </span>
    )
  }
  if (pending) return <span className="p-booked"><b>Pago pendiente</b><small>en efectivo</small></span>
  if (s.spotsLeft === 0) return <span className="p-meta">Llena</span>
  return <button className="btn btn-ok btn-small" onClick={onBook} disabled={busy}>Reservar</button>
}

/**
 * Confirmar la reserva. Con un plan que la cubre, solo se confirma; sin plan, se paga la
 * clase individual de esa disciplina.
 */
function BookDialog({ s, pending, today, onClose }) {
  const when = `${whenLabel(s.date, today).toLowerCase()} a las ${clock(s.time)}`
  const title = `${s.class.name} · ${whenLabel(s.date, today)} ${clock(s.time)}`

  let body
  if (isMine(s)) body = <p>Ya tienes lugar en esta clase.</p>
  else if (pending) body = <p>Ya apartaste esta clase. Pagas <b>{planPrice({ priceCents: pending.pricePaidCents })}</b> en efectivo el día que asistas.</p>
  else if (s.status !== 'scheduled' || s.spotsLeft === 0) body = <p>Esta clase ya no tiene lugares.</p>
  else if (s.coveredBy) body = <ConfirmBooking s={s} when={when} onDone={onClose} />
  else body = <PaySingleClass s={s} when={when} onDone={onClose} />

  return (
    <Dialog title={title} onClose={() => onClose()}>
      <p className="p-meta">{s.discipline.name} · con {s.coach.name} · <span className="p-ok-text">{s.spotsLeft} {s.spotsLeft === 1 ? 'lugar libre' : 'lugares libres'}</span></p>
      {body}
    </Dialog>
  )
}

function ConfirmBooking({ s, when, onDone }) {
  const action = useAction()
  const book = () =>
    action.run(async () => {
      await api('/bookings', { method: 'POST', body: { sessionId: s.id } })
      onDone(true)
    }, `Listo: reservaste ${s.class.name} ${when}.`)
  return (
    <div className="p-dialog-body">
      {s.payAtClassCents !== null ? (
        <p>
          Reservas con tu <b>{s.coveredBy}</b>, que está pendiente de pago. Pagas <b>{money(s.payAtClassCents)}</b> en efectivo
          el día que asistas y con eso se activan tus demás clases.
        </p>
      ) : (
        <p>Se usa un crédito de tu plan <b>{s.coveredBy}</b>. Si cancelas antes de la clase, lo recuperas.</p>
      )}
      <Notice>{action.error}</Notice>
      <button className="btn btn-ok" onClick={book} disabled={action.busy}>{action.busy ? 'Reservando…' : 'Confirmar reserva'}</button>
    </div>
  )
}

function PaySingleClass({ s, when, onDone }) {
  const plans = useLoad('/plans')
  const action = useAction()
  const plan = plans.data?.find((p) => p.kind === 'single_class' && p.shares.some((x) => x.discipline.slug === s.discipline.slug))

  const pay = (e) => {
    e.preventDefault()
    action.run(async () => {
      await api('/memberships/cash-request', { method: 'POST', body: { planId: plan.id, classSessionId: s.id } })
      onDone(true)
    }, `Listo: apartaste ${s.class.name} ${when}. Pagas ${planPrice(plan)} en efectivo el día que asistas.`)
  }

  if (plans.loading) return <p className="p-meta">Cargando precio…</p>
  if (plans.error) return <Notice>{plans.error}</Notice>
  if (!plan) {
    return <p>No tienes un plan para esta clase. <a href="#membresias">Elige un plan</a> para reservar.</p>
  }
  return (
    <form className="p-dialog-body" onSubmit={pay}>
      <p>No tienes un plan activo para esta clase. Puedes pagar solo esta clase:</p>
      <p className="p-dialog-price"><b>{plan.name}</b> <span>{planPrice(plan)}</span></p>
      <fieldset className="p-pay">
        <legend>Forma de pago</legend>
        <label className="auth-check">
          <input type="radio" name="pay" defaultChecked />
          <span>Efectivo el día que asistas · tu lugar queda apartado y pagas al llegar a la clase</span>
        </label>
        <label className="auth-check is-disabled">
          <input type="radio" name="pay" disabled />
          <span>Tarjeta · muy pronto</span>
        </label>
      </fieldset>
      <Notice>{action.error}</Notice>
      <button className="btn btn-ok" disabled={action.busy}>{action.busy ? 'Apartando…' : 'Apartar y pagar al llegar'}</button>
      <a className="auth-link" href="#membresias" onClick={() => onDone()}>O compra un plan con más clases</a>
    </form>
  )
}
