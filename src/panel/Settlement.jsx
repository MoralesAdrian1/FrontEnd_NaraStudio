import { useState } from 'react'
import { api } from '../lib/api.js'
import { addDays, money, shortDate, studioDate, weekStart } from '../lib/time.js'
import { dateTime } from './plan-labels.js'
import { Empty, Notice, Section } from './ui.jsx'
import { useAction, useLoad } from './hooks.js'
import { confirmDialog } from '../lib/feedback.js'

const METHOD = { cash: 'Efectivo', card: 'Tarjeta', transfer: 'Transferencia' }

/** Corte semanal: lo que entró por coach (efectivo y tarjeta) y quién le debe a quién. */
export default function Settlement({ me }) {
  const thisWeek = weekStart(studioDate())
  const [start, setStart] = useState(thisWeek)
  const week = useLoad(`/settlements?start=${start}`)
  const w = week.data
  const action = useAction()
  const isAdmin = me.role === 'admin'
  const name = (id) => w?.coaches.find((c) => c.id === id)?.name.split(' ')[0] ?? '—'
  const mine = (id) => id === me.coach?.id

  const closeWeek = async () => {
    if (!await confirmDialog('¿Cerrar el corte? Sus cobros quedan congelados en esta semana.')) return
    action.run(async () => {
      await api(`/settlements/${start}/close`, { method: 'POST' })
      week.reload()
    }, 'Corte cerrado.')
  }
  const removePayment = async (id) => {
    if (!await confirmDialog('¿Borrar este pago registrado?')) return
    action.run(async () => {
      await api(`/settlements/payments/${id}`, { method: 'DELETE' })
      week.reload()
    }, 'Pago borrado.')
  }

  return (
    <div className="p-stack">
      <Section
        title="Corte semanal"
        action={
          <span className="p-week-nav">
            <button className="btn btn-glass btn-small" onClick={() => setStart(addDays(start, -7))} aria-label="Semana anterior">←</button>
            <b>{shortDate(start)} – {shortDate(addDays(start, 6))}</b>
            <button className="btn btn-glass btn-small" onClick={() => setStart(addDays(start, 7))} disabled={start >= thisWeek} aria-label="Semana siguiente">→</button>
          </span>
        }
      >
        <Notice>{week.error || action.error}</Notice>
        {week.loading && <p className="p-meta">Cargando…</p>}
        {w && (
          <p className="auth-help">
            {w.status === 'closed'
              ? `Corte cerrado el ${dateTime(w.closedAt)}.`
              : w.isOver
                ? 'La semana ya terminó; el corte se cierra solo el lunes a las 12:30 a.m.'
                : 'Semana en curso: los números cambian con cada cobro.'}{' '}
            El efectivo cuenta el día que se cobró y la tarjeta el día que Stripe deposita en la cuenta de {name(w.cardHolderId)}.
          </p>
        )}
        {isAdmin && w?.isOver && w.status === 'open' && (
          <button className="btn btn-glass btn-small" onClick={closeWeek} disabled={action.busy}>Cerrar corte ahora</button>
        )}
      </Section>

      {w && (
        <>
          <Section title={isAdmin ? 'Ingresos por coach' : 'Mis ingresos'}>
            {w.income.length === 0 && <Empty>No hubo cobros esta semana.</Empty>}
            <div className="p-cards">
              {w.income.map((i) => (
                <article key={i.coachId} className="p-income">
                  <h3>{isAdmin ? name(i.coachId) : 'Te tocan'} <span>{money(i.totalCents)}</span></h3>
                  <dl className="p-income-split">
                    <div><dt>Efectivo</dt><dd>{money(i.cashCents)}</dd></div>
                    <div><dt>Tarjeta</dt><dd>{money(i.cardCents)}</dd></div>
                  </dl>
                  <ul className="p-income-disc">
                    {i.byDiscipline.map((d) => (
                      <li key={d.disciplineId}>
                        <span>{d.name}</span>
                        <small>{money(d.cashCents + d.cardCents)}</small>
                      </li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>
          </Section>

          <Section title="Quién le debe a quién">
            {w.debts.length === 0 && <Empty>Nadie le debe a nadie esta semana: cada quien se quedó con lo suyo.</Empty>}
            <ul className="p-debts">
              {w.debts.map((d) => (
                <Debt key={`${d.fromCoachId}-${d.toCoachId}`} d={d} start={start} name={name} mine={mine} onDone={week.reload} />
              ))}
            </ul>
            {w.settlements.length > 0 && (
              <>
                <h3 className="p-subhead">Pagos registrados</h3>
                <ul className="p-history">
                  {w.settlements.map((s) => (
                    <li key={s.id}>
                      <span>{name(s.fromCoachId)} → {name(s.toCoachId)} · <b>{money(s.amountCents)}</b> · {METHOD[s.method]}</span>
                      <small>
                        {dateTime(s.paidAt)}{s.notes && ` · ${s.notes}`}{' '}
                        <button className="auth-link" onClick={() => removePayment(s.id)} disabled={action.busy}>Borrar</button>
                      </small>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </Section>

          <Section title="Cobros de la semana">
            {w.payments.length === 0 && <Empty>Sin cobros.</Empty>}
            <ul className="p-history">
              {w.payments.map((p) => (
                <li key={p.id}>
                  <span><b>{p.student}</b> · {p.plan} · {money(p.netCents)}</span>
                  <small>
                    {shortDate(p.date)} · {METHOD[p.method]}{p.method === 'cash' && ` (cobró ${name(p.receivedById)})`}
                    {p.feeCents > 0 && ` · comisión ${money(p.feeCents)}`}
                    {' · '}{p.shares.map((s) => `${name(s.coachId)} ${money(s.amountCents)}`).join(' + ')}
                  </small>
                </li>
              ))}
            </ul>
          </Section>
        </>
      )}
    </div>
  )
}

function Debt({ d, start, name, mine, onDone }) {
  const [open, setOpen] = useState(false)
  const [amount, setAmount] = useState(String(d.pendingCents / 100))
  const [method, setMethod] = useState('cash')
  const [notes, setNotes] = useState('')
  const action = useAction()
  const who = mine(d.fromCoachId) ? `Le debes a ${name(d.toCoachId)}` : mine(d.toCoachId) ? `${name(d.fromCoachId)} te debe` : `${name(d.fromCoachId)} le debe a ${name(d.toCoachId)}`

  const save = (e) => {
    e.preventDefault()
    action.run(async () => {
      await api(`/settlements/${start}/payments`, {
        method: 'POST',
        body: { fromCoachId: d.fromCoachId, toCoachId: d.toCoachId, amountCents: Math.round(Number(amount) * 100), method, notes: notes || undefined },
      })
      setOpen(false)
      onDone()
    }, 'Pago registrado.')
  }

  return (
    <li className={`p-debt ${d.pendingCents === 0 ? 'is-paid' : ''}`}>
      <div className="p-debt-head">
        <span>{who}</span>
        <b>{money(d.amountCents)}</b>
      </div>
      <small className="p-meta">
        {d.detail.map((x) => `${METHOD[x.method]}: ${name(x.fromCoachId)} cobró ${money(x.amountCents)} que le tocan a ${name(x.toCoachId)}`).join(' · ')}
      </small>
      <small>{d.pendingCents === 0 ? 'Pagado' : d.paidCents > 0 ? `Pagado ${money(d.paidCents)} · falta ${money(d.pendingCents)}` : 'Pendiente'}</small>
      {d.pendingCents > 0 && !open && (
        <button className="btn btn-clay btn-small" onClick={() => setOpen(true)}>Registrar pago</button>
      )}
      {open && (
        <form className="p-debt-form" onSubmit={save}>
          <label>
            Monto
            <input type="number" min="0.01" step="0.01" required value={amount} onChange={(e) => setAmount(e.target.value)} />
          </label>
          <label>
            Forma
            <select value={method} onChange={(e) => setMethod(e.target.value)}>
              <option value="cash">Efectivo</option>
              <option value="transfer">Transferencia</option>
            </select>
          </label>
          <label className="wide">
            Nota (opcional)
            <input value={notes} maxLength={200} onChange={(e) => setNotes(e.target.value)} />
          </label>
          <Notice>{action.error}</Notice>
          <span className="p-actions">
            <button className="btn btn-clay btn-small" disabled={action.busy}>Guardar</button>
            <button type="button" className="btn btn-glass btn-small" onClick={() => setOpen(false)}>Cancelar</button>
          </span>
        </form>
      )}
    </li>
  )
}
