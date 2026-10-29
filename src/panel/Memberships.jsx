import { useEffect, useState } from 'react'
import { api } from '../lib/api.js'
import { clock, shortDate } from '../lib/time.js'
import { creditsLabel, dateTime, KIND_LABEL, longDate, planDisciplines, planPrice, planSummary, STATUS_LABEL } from './plan-labels.js'
import { Empty, Notice, Section } from './ui.jsx'
import { useAction, useLoad, useNow } from './hooks.js'
import { confirmDialog } from '../lib/feedback.js'

/** La alumna: sus membresías y la compra de un plan. */
export default function Memberships() {
  const mine = useLoad('/memberships/mine')
  const plans = useLoad('/plans')
  const preselected = Number(new URLSearchParams(window.location.search).get('plan')) || null
  const [chosen, setChosen] = useState(preselected)

  // La tarjeta elegida se abre en su lugar; se lleva a la vista (también al llegar desde la landing)
  useEffect(() => {
    if (chosen && plans.data) document.querySelector('.p-plan.is-chosen')?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [chosen, plans.data])

  const current = (mine.data ?? []).filter((m) => m.status === 'active' || m.status === 'pending_payment')
  const past = (mine.data ?? []).filter((m) => m.status === 'expired' || m.status === 'cancelled')

  return (
    <div className="p-stack">
      <Section title="Mis membresías">
        <Notice>{mine.error}</Notice>
        {mine.data && current.length === 0 && <Empty>Aún no tienes una membresía activa. Elige un plan abajo.</Empty>}
        <div className="p-cards">
          {current.map((m) => <MembershipCard key={m.id} m={m} onChange={mine.reload} />)}
        </div>
      </Section>

      <Section title="Comprar un plan">
        <Notice>{plans.error}</Notice>
        <div className="p-plan-grid">
          {plans.data?.map((p) => {
            const open = chosen === p.id
            return (
              <article key={p.id} className={`p-plan ${open ? 'is-chosen' : ''} ${p.isCombo ? 'is-combo' : ''}`}>
                <button className="p-plan-head" aria-expanded={open} onClick={() => setChosen(open ? null : p.id)}>
                  <span className="p-plan-kind">{KIND_LABEL[p.kind]} · {planDisciplines(p)}</span>
                  <b>{p.name}</b>
                  <span className="p-plan-price">{planPrice(p)}</span>
                  <small>{planSummary(p)}</small>
                  <span className="p-plan-cta">{open ? 'Cerrar' : 'Elegir'}</span>
                </button>
                {open && (
                  <Checkout
                    plan={p}
                    onDone={() => { setChosen(null); mine.reload(); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
                  />
                )}
              </article>
            )
          })}
        </div>
      </Section>

      {past.length > 0 && (
        <Section title="Historial">
          <ul className="p-history">
            {past.map((m) => (
              <li key={m.id}>
                <span>{m.plan.name}</span>
                <small>{STATUS_LABEL[m.status]} · {longDate(m.createdAt)}</small>
              </li>
            ))}
          </ul>
        </Section>
      )}
    </div>
  )
}

function MembershipCard({ m, onChange }) {
  const action = useAction()
  const pending = m.status === 'pending_payment'
  const withdraw = async () => {
    if (!await confirmDialog('¿Retirar esta solicitud?')) return
    action.run(async () => {
      await api(`/memberships/${m.id}/cancel`, { method: 'POST' })
      onChange()
    }, 'Solicitud retirada.')
  }
  return (
    <article className={`p-membership ${pending ? 'is-pending' : ''}`}>
      <span className="chip-clay">{STATUS_LABEL[m.status]}</span>
      <h3>{m.plan.name}</h3>
      {pending ? (
        <>
          <PendingHowTo m={m} />
          <button className="btn btn-glass btn-small" onClick={withdraw} disabled={action.busy}>Retirar solicitud</button>
        </>
      ) : (
        <>
          <p className="p-credits">{creditsLabel(m)}</p>
          {m.classSession && <p>Para {m.classSession.name}, {dateTime(m.classSession.startsAt)}</p>}
          {m.expiresAt && <p className="p-meta">Vence el {longDate(m.expiresAt)}</p>}
        </>
      )}
      <Notice>{action.error}</Notice>
    </article>
  )
}

/** Pago en efectivo: se paga el día que asiste a la clase que reservó. */
function PendingHowTo({ m }) {
  const price = <b>{planPrice({ priceCents: m.pricePaidCents })}</b>
  if (m.classSession) {
    return <p>Pagas {price} en efectivo el día que asistas: <b>{m.classSession.name}</b>, {dateTime(m.classSession.startsAt)}. Tu lugar ya está apartado.</p>
  }
  if (m.bookedClass) {
    return (
      <p>
        Reservaste <b>{m.bookedClass.name}</b>, {dateTime(m.bookedClass.startsAt)}. Pagas {price} en efectivo ese día y se
        activan tus demás clases.
      </p>
    )
  }
  return (
    <>
      <p>
        Reserva tu primera clase: pagas {price} en efectivo el día que asistas y se activan tus demás clases.
        Resérvala antes del <b>{dateTime(m.requestExpiresAt)}</b>.
      </p>
      <a className="btn btn-ok btn-small" href="#reservar">Reservar mi clase</a>
    </>
  )
}

function Checkout({ plan, onDone }) {
  const single = plan.kind === 'single_class'
  const sessions = useLoad(single ? '/sessions' : null)
  const [sessionId, setSessionId] = useState('')
  const [method, setMethod] = useState('cash')
  const action = useAction()
  const now = useNow()
  const slugs = plan.shares.map((s) => s.discipline.slug)
  const options = (sessions.data ?? []).filter(
    (s) => s.status === 'scheduled' && Date.parse(s.startsAt) > now && s.spotsLeft > 0 && slugs.includes(s.discipline.slug),
  )

  const submit = (e) => {
    e.preventDefault()
    action.run(async () => {
      await api('/memberships/cash-request', {
        method: 'POST',
        body: { planId: plan.id, classSessionId: single ? Number(sessionId) : undefined },
      })
      window.history.replaceState(null, '', window.location.pathname + window.location.hash)
      onDone()
    }, single
      ? `Listo: apartaste tu clase. Pagas ${planPrice(plan)} en efectivo el día que asistas.`
      : `Listo: pediste ${plan.name}. Reserva tu primera clase y paga ${planPrice(plan)} en efectivo el día que asistas.`)
  }

  return (
    <form className="auth-form p-checkout" onSubmit={submit}>
      {single && (
        <label>
          ¿A qué clase vas a ir?
          <select required value={sessionId} onChange={(e) => setSessionId(e.target.value)}>
            <option value="">Elige una clase</option>
            {options.map((s) => (
              <option key={s.id} value={s.id}>
                {shortDate(s.date)} · {clock(s.time)} · {s.class.name} ({s.spotsLeft} lugares)
              </option>
            ))}
          </select>
        </label>
      )}
      <fieldset className="p-pay">
        <legend>Forma de pago</legend>
        <label className="auth-check">
          <input type="radio" name="pay" checked={method === 'cash'} onChange={() => setMethod('cash')} />
          <span>{single ? 'Efectivo el día que asistas · tu lugar queda apartado' : 'Efectivo el día que asistas · reservas tu primera clase y pagas al llegar'}</span>
        </label>
        <label className="auth-check is-disabled">
          <input type="radio" name="pay" disabled />
          <span>Tarjeta · muy pronto</span>
        </label>
      </fieldset>
      <Notice>{action.error}</Notice>
      <button className="btn btn-clay" disabled={action.busy}>{action.busy ? 'Enviando…' : 'Pagar en efectivo el día de mi clase'}</button>
    </form>
  )
}
