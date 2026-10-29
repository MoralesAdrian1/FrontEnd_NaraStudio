import { useState } from 'react'
import { api } from '../lib/api.js'
import { DAYS } from '../lib/time.js'
import { KIND_LABEL, planPrice, planSummary } from './plan-labels.js'
import { Empty, Notice, Section, Toggle } from './ui.jsx'
import { useAction, useLoad } from './hooks.js'

const KINDS = ['monthly', 'weekly', 'pack', 'single_class']
const DEFAULT_DAYS = { monthly: 30, weekly: 7, pack: 30, single_class: 1 }
const WEEKDAYS = [1, 2, 3, 4, 5, 6, 0]

/** Planes que vende la coach (el admin ve todos y crea combinados). */
export default function Plans({ me }) {
  const plans = useLoad('/plans/mine')
  const isAdmin = me.role === 'admin'
  return (
    <div className="p-stack">
      <Section
        title={isAdmin ? 'Planes del estudio' : 'Mis planes'}
        action={
          <Toggle label="Nuevo plan">
            {(close) => <NewPlan me={me} onDone={() => { close(); plans.reload() }} onCancel={close} />}
          </Toggle>
        }
      >
        <p className="auth-help">Cambiar el precio no afecta a quien ya compró: cada membresía guarda el precio que pagó.</p>
        <Notice>{plans.error}</Notice>
        {plans.data?.length === 0 && <Empty>Aún no hay planes.</Empty>}
      </Section>
      {plans.data?.map((p) => <PlanCard key={p.id} p={p} canEdit={isAdmin || p.createdById === me.coach?.id} onChange={plans.reload} />)}
    </div>
  )
}

function NewPlan({ me, onDone, onCancel }) {
  const isAdmin = me.role === 'admin'
  const coaches = useLoad(isAdmin ? '/coaches' : null)
  const myDisciplines = me.coach.disciplines.map((d) => d.discipline).filter((d) => d.isActive)
  const [form, setForm] = useState({
    name: '', description: '', kind: 'monthly', price: '', unlimited: true, credits: '10',
    durationDays: '30', allowsAutoRenew: false, disciplineId: myDisciplines[0]?.id ?? '',
    trainingDays: [1, 2, 3, 4, 5],
  })
  const [shares, setShares] = useState([{ disciplineId: '', coachId: '', percent: '100' }])
  const action = useAction()
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value })
  const setKind = (e) => {
    const kind = e.target.value
    setForm({ ...form, kind, durationDays: String(DEFAULT_DAYS[kind]), unlimited: kind === 'monthly', allowsAutoRenew: kind === 'monthly' && form.allowsAutoRenew })
  }
  const toggleDay = (d) =>
    setForm({ ...form, trainingDays: form.trainingDays.includes(d) ? form.trainingDays.filter((x) => x !== d) : [...form.trainingDays, d] })

  // Opciones del reparto (admin): cada coach con sus disciplinas
  const pairs = (coaches.data ?? []).flatMap((c) => c.disciplines.map((d) => ({ coach: c, discipline: d })))
  const setShare = (i, value) => {
    const [coachId, disciplineId] = value.split(':')
    setShares(shares.map((s, j) => (j === i ? { ...s, coachId, disciplineId } : s)))
  }
  const setPercent = (i, percent) => setShares(shares.map((s, j) => (j === i ? { ...s, percent } : s)))
  const total = shares.reduce((s, x) => s + Number(x.percent || 0), 0)

  const single = form.kind === 'single_class'
  const submit = (e) => {
    e.preventDefault()
    action.run(async () => {
      await api('/plans', {
        method: 'POST',
        body: {
          name: form.name,
          description: form.description || undefined,
          kind: form.kind,
          priceCents: Math.round(Number(form.price) * 100),
          credits: single || form.unlimited ? undefined : Number(form.credits),
          durationDays: Number(form.durationDays),
          trainingDays: form.trainingDays,
          allowsAutoRenew: form.kind === 'monthly' && form.allowsAutoRenew,
          ...(isAdmin
            ? { shares: shares.map((s) => ({ coachId: Number(s.coachId), disciplineId: Number(s.disciplineId), basisPoints: Math.round(Number(s.percent) * 100) })) }
            : { disciplineId: Number(form.disciplineId) }),
        },
      })
      onDone()
    }, 'Plan creado.')
  }

  return (
    <form className="auth-form p-inline-form" onSubmit={submit}>
      <div className="auth-row three">
        <label>
          Nombre
          <input required minLength={2} maxLength={80} value={form.name} onChange={set('name')} placeholder="Mes Barre" />
        </label>
        <label>
          Tipo
          <select value={form.kind} onChange={setKind}>
            {KINDS.map((k) => <option key={k} value={k}>{KIND_LABEL[k]}</option>)}
          </select>
        </label>
        <label>
          Precio (MXN)
          <input type="number" required min="0" step="1" value={form.price} onChange={set('price')} placeholder="700" />
        </label>
      </div>

      {!single && (
        <div className="auth-row three">
          <label className="auth-check p-center">
            <input type="checkbox" checked={form.unlimited} onChange={set('unlimited')} />
            <span>Clases ilimitadas</span>
          </label>
          <label>
            Clases incluidas
            <input type="number" min="1" max="200" disabled={form.unlimited} value={form.credits} onChange={set('credits')} />
          </label>
          <label>
            Vigencia (días)
            <input type="number" required min="1" max="365" value={form.durationDays} onChange={set('durationDays')} />
          </label>
        </div>
      )}

      {isAdmin ? (
        <fieldset className="p-shares">
          <legend>¿A quién le toca el dinero?</legend>
          {shares.map((s, i) => (
            <div className="p-share" key={i}>
              <select required value={s.coachId ? `${s.coachId}:${s.disciplineId}` : ''} onChange={(e) => setShare(i, e.target.value)}>
                <option value="">Coach y disciplina</option>
                {pairs.map(({ coach, discipline }) => (
                  <option key={`${coach.id}:${discipline.id}`} value={`${coach.id}:${discipline.id}`}>{coach.name} · {discipline.name}</option>
                ))}
              </select>
              <input type="number" required min="1" max="100" value={s.percent} onChange={(e) => setPercent(i, e.target.value)} aria-label="Porcentaje" />
              <span>%</span>
              {shares.length > 1 && <button type="button" className="auth-link" onClick={() => setShares(shares.filter((_, j) => j !== i))}>Quitar</button>}
            </div>
          ))}
          <div className="p-actions">
            <button type="button" className="btn btn-glass btn-small" onClick={() => setShares([...shares, { disciplineId: '', coachId: '', percent: '' }])}>Agregar disciplina (combinado)</button>
            <small className={total === 100 ? '' : 'p-warn'}>Suma: {total} %</small>
          </div>
        </fieldset>
      ) : (
        <label>
          Disciplina
          <select required value={form.disciplineId} onChange={set('disciplineId')}>
            {myDisciplines.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </label>
      )}

      {!single && (
        <fieldset className="p-days">
          <legend>Días que cuentan para la racha</legend>
          {WEEKDAYS.map((d) => (
            <label key={d} className="auth-check">
              <input type="checkbox" checked={form.trainingDays.includes(d)} onChange={() => toggleDay(d)} />
              <span>{DAYS[d].slice(0, 3)}</span>
            </label>
          ))}
        </fieldset>
      )}

      {form.kind === 'monthly' && (
        <label className="auth-check">
          <input type="checkbox" checked={form.allowsAutoRenew} onChange={set('allowsAutoRenew')} />
          <span>Permitir cobro automático cada mes (con tarjeta)</span>
        </label>
      )}
      <label>
        Descripción (opcional)
        <input maxLength={300} value={form.description} onChange={set('description')} />
      </label>
      <Notice>{action.error || coaches.error}</Notice>
      <div className="p-actions">
        <button className="btn btn-clay btn-small" disabled={action.busy || (isAdmin && total !== 100)}>Crear plan</button>
        <button type="button" className="btn btn-glass btn-small" onClick={onCancel}>Cancelar</button>
      </div>
    </form>
  )
}

function PlanCard({ p, canEdit, onChange }) {
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({ name: p.name, description: p.description ?? '', price: String(p.priceCents / 100), allowsAutoRenew: p.allowsAutoRenew })
  const action = useAction()
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value })

  const save = (e) => {
    e.preventDefault()
    action.run(async () => {
      await api(`/plans/${p.id}`, {
        method: 'PATCH',
        body: {
          name: form.name,
          description: form.description || undefined,
          priceCents: Math.round(Number(form.price) * 100),
          ...(p.kind === 'monthly' && { allowsAutoRenew: form.allowsAutoRenew }),
        },
      })
      setEditing(false)
      onChange()
    }, 'Plan guardado.')
  }
  const toggle = () =>
    action.run(async () => {
      await api(`/plans/${p.id}`, { method: 'PATCH', body: { isActive: !p.isActive } })
      onChange()
    }, p.isActive ? 'Plan desactivado.' : 'Plan activado.')

  return (
    <section className={`p-section glass ${p.isActive ? '' : 'is-off'}`}>
      <header className="p-section-head">
        <div>
          <h2>{p.name} <span className="p-price">{planPrice(p)}</span></h2>
          <p className="p-meta">
            {KIND_LABEL[p.kind]} · {planSummary(p)}
            {p.allowsAutoRenew && ' · cobro automático'}
            {!p.isActive && ' · no se vende'}
          </p>
          <p className="p-meta">
            {p.shares.map((s) => `${s.discipline.name}: ${s.coach.name} ${s.basisPoints / 100} %`).join(' · ')}
          </p>
        </div>
        {canEdit && (
          <div className="p-actions">
            <button className="btn btn-glass btn-small" onClick={() => setEditing(!editing)}>{editing ? 'Cerrar' : 'Editar'}</button>
            <button className="btn btn-glass btn-small" onClick={toggle} disabled={action.busy}>{p.isActive ? 'Dejar de vender' : 'Volver a vender'}</button>
          </div>
        )}
      </header>
      {editing && (
        <form className="auth-form p-inline-form" onSubmit={save}>
          <div className="auth-row">
            <label>
              Nombre
              <input required minLength={2} maxLength={80} value={form.name} onChange={set('name')} />
            </label>
            <label>
              Precio (MXN)
              <input type="number" required min="0" step="1" value={form.price} onChange={set('price')} />
            </label>
          </div>
          <label>
            Descripción
            <input maxLength={300} value={form.description} onChange={set('description')} />
          </label>
          {p.kind === 'monthly' && (
            <label className="auth-check">
              <input type="checkbox" checked={form.allowsAutoRenew} onChange={set('allowsAutoRenew')} />
              <span>Permitir cobro automático cada mes</span>
            </label>
          )}
          <button className="btn btn-clay btn-small" disabled={action.busy}>Guardar</button>
        </form>
      )}
      <Notice>{action.error}</Notice>
    </section>
  )
}
