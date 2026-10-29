import { useState } from 'react'
import { api } from '../lib/api.js'
import { clock, shortDate } from '../lib/time.js'
import { creditsLabel, KIND_LABEL, longDate, planPrice, STATUS_LABEL } from './plan-labels.js'
import { Empty, Notice, Section, StudentPhoto, Toggle } from './ui.jsx'
import { useAction, useLoad, useNow } from './hooks.js'
import { confirmDialog } from '../lib/feedback.js'

/** Alumnas de la coach: buscar, registrar (con invitación a la app) y vender un plan en efectivo. */
export default function Students() {
  const [q, setQ] = useState('')
  const [search, setSearch] = useState('')
  const list = useLoad(`/students${search ? `?q=${encodeURIComponent(search)}` : ''}`)
  const [openId, setOpenId] = useState(null)

  return (
    <div className="p-stack">
      <Section
        title="Alumnas"
        action={
          <Toggle label="Registrar alumna">
            {(close) => <NewStudent onDone={(s) => { close(); list.reload(); setOpenId(s.id) }} onCancel={close} />}
          </Toggle>
        }
      >
        <form className="p-search" onSubmit={(e) => { e.preventDefault(); setSearch(q.trim()) }}>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por nombre, celular o correo" aria-label="Buscar alumna" />
          <button className="btn btn-glass btn-small">Buscar</button>
        </form>
        <Notice>{list.error}</Notice>
        {list.data?.length === 0 && <Empty>{search ? 'Nadie coincide con esa búsqueda.' : 'Aún no tienes alumnas. Aparecen aquí cuando compran un plan tuyo o las registras.'}</Empty>}
        <ul className="p-students">
          {list.data?.map((s) => (
            <li key={s.id}>
              <button className={`p-student ${openId === s.id ? 'is-open' : ''}`} onClick={() => setOpenId(openId === s.id ? null : s.id)}>
                <b>{s.fullName}</b>
                <small>{s.activePlans.length ? s.activePlans.join(' · ') : 'Sin plan activo'}{!s.usesApp && ' · sin app'}</small>
              </button>
              {openId === s.id && <StudentDetail id={s.id} onChange={list.reload} />}
            </li>
          ))}
        </ul>
      </Section>
    </div>
  )
}

function NewStudent({ onDone, onCancel }) {
  const [form, setForm] = useState({ fullName: '', phone: '', email: '', birthDate: '' })
  const action = useAction()
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })
  const submit = (e) => {
    e.preventDefault()
    action.run(async () => {
      const s = await api('/students', {
        method: 'POST',
        body: { fullName: form.fullName, phone: form.phone, email: form.email.trim(), birthDate: form.birthDate || undefined },
      })
      onDone(s)
      return s
    }, (s) =>
      s.invitationSent
        ? `Alumna registrada. Le llegó a ${s.email} la invitación para crear su contraseña.`
        : 'Alumna registrada, pero no se pudo mandar la invitación. Reenvíala desde su ficha.')
  }
  return (
    <form className="auth-form p-inline-form" onSubmit={submit}>
      <p className="auth-help">
        Se crea su cuenta y le llega un correo para poner su contraseña. Aunque no use la app, su cuenta queda activa:
        la agregas a la lista de tus clases y le vendes planes en efectivo.
      </p>
      <div className="auth-row">
        <label>
          Nombre completo
          <input required minLength={2} value={form.fullName} onChange={set('fullName')} />
        </label>
        <label>
          Celular
          <input type="tel" required minLength={10} value={form.phone} onChange={set('phone')} />
        </label>
      </div>
      <div className="auth-row">
        <label>
          Correo
          <input type="email" required value={form.email} onChange={set('email')} autoComplete="off" />
        </label>
        <label>
          Fecha de nacimiento (opcional)
          <input type="date" value={form.birthDate} onChange={set('birthDate')} />
        </label>
      </div>
      <Notice>{action.error}</Notice>
      <div className="p-actions">
        <button className="btn btn-clay btn-small" disabled={action.busy}>Registrar</button>
        <button type="button" className="btn btn-glass btn-small" onClick={onCancel}>Cancelar</button>
      </div>
    </form>
  )
}

function StudentDetail({ id, onChange }) {
  const student = useLoad(`/students/${id}`)
  const memberships = useLoad(`/students/${id}/memberships`)
  const invite = useAction()
  const s = student.data
  const h = s?.health

  const sendInvite = () =>
    invite.run(async () => {
      const r = await api(`/students/${id}/invite`, { method: 'POST' })
      student.reload()
      onChange()
      if (!r.invitationSent) throw new Error('La cuenta existe, pero no se pudo mandar el correo. Intenta de nuevo en un rato.')
    }, `Invitación enviada a ${s?.email}.`)

  return (
    <div className="p-detail">
      <Notice>{student.error}</Notice>
      {s && (
        <div className="p-account">
          <StudentPhoto name={s.fullName} path={s.photoPath} small />
          <span>
            {!s.usesApp ? 'Sin cuenta en la app' : s.hasSignedIn ? 'Ya entra a la app' : s.hasSignedIn === false ? 'Invitación enviada: todavía no entra' : 'Tiene cuenta en la app'}
          </span>
          {(!s.usesApp || s.hasSignedIn === false) && s.email && (
            <button className="auth-link" onClick={sendInvite} disabled={invite.busy}>
              {invite.busy ? 'Enviando…' : s.usesApp ? 'Reenviar invitación' : 'Invitar a la app'}
            </button>
          )}
        </div>
      )}
      <Notice>{invite.error}</Notice>
      {s && (
        <dl className="p-facts">
          <div><dt>Celular</dt><dd>{s.phone ? <a href={`tel:${s.phone}`}>{s.phone}</a> : '—'}</dd></div>
          <div><dt>Correo</dt><dd>{s.email ?? '—'}</dd></div>
          <div><dt>Nacimiento</dt><dd>{s.birthDate ? longDate(s.birthDate) : '—'}</dd></div>
          <div><dt>Peso / estatura</dt><dd>{h ? `${h.weightKg ?? '—'} kg · ${h.heightCm ?? '—'} cm` : '—'}</dd></div>
          <div className="wide"><dt>Condiciones especiales</dt><dd>{h?.specialConditions || '—'}</dd></div>
        </dl>
      )}
      <h3 className="p-sub">Membresías</h3>
      {memberships.loading && <p className="p-meta">Cargando…</p>}
      <Notice>{memberships.error}</Notice>
      {memberships.data?.length === 0 && <Empty>Sin membresías.</Empty>}
      <ul className="p-history">
        {memberships.data?.map((m) => (
          <li key={m.id}>
            <span>{m.plan.name} · {STATUS_LABEL[m.status]}</span>
            <small>
              {m.status === 'active' ? `${creditsLabel(m)} · vence ${longDate(m.expiresAt)}` : longDate(m.createdAt)}
            </small>
          </li>
        ))}
      </ul>
      <Toggle label="Vender plan en efectivo" className="btn btn-clay btn-small">
        {(close) => <Sell studentId={id} onDone={() => { close(); memberships.reload(); onChange() }} onCancel={close} />}
      </Toggle>
    </div>
  )
}

function Sell({ studentId, onDone, onCancel }) {
  const plans = useLoad('/plans/mine')
  const [planId, setPlanId] = useState('')
  const [sessionId, setSessionId] = useState('')
  const action = useAction()
  const now = useNow()
  const active = (plans.data ?? []).filter((p) => p.isActive)
  const plan = active.find((p) => p.id === Number(planId))
  const single = plan?.kind === 'single_class'
  const sessions = useLoad(single ? '/sessions' : null)
  const slugs = plan?.shares.map((s) => s.discipline.slug) ?? []
  const options = (sessions.data ?? []).filter(
    (s) => s.status === 'scheduled' && Date.parse(s.startsAt) > now && s.spotsLeft > 0 && slugs.includes(s.discipline.slug),
  )

  const submit = async (e) => {
    e.preventDefault()
    if (!await confirmDialog(`¿Recibiste ${planPrice(plan)} en efectivo? Se activa ${plan.name}.`)) return
    action.run(async () => {
      await api('/memberships/sell', {
        method: 'POST',
        body: { studentId, planId: plan.id, classSessionId: single ? Number(sessionId) : undefined },
      })
      onDone()
    }, 'Venta registrada: plan activado.')
  }

  return (
    <form className="auth-form p-inline-form" onSubmit={submit}>
      <label>
        Plan
        <select required value={planId} onChange={(e) => { setPlanId(e.target.value); setSessionId('') }}>
          <option value="">Elige un plan</option>
          {active.map((p) => <option key={p.id} value={p.id}>{p.name} · {KIND_LABEL[p.kind]} · {planPrice(p)}</option>)}
        </select>
      </label>
      {single && (
        <label>
          Clase
          <select required value={sessionId} onChange={(e) => setSessionId(e.target.value)}>
            <option value="">Elige la clase</option>
            {options.map((s) => <option key={s.id} value={s.id}>{shortDate(s.date)} · {clock(s.time)} · {s.class.name}</option>)}
          </select>
        </label>
      )}
      <Notice>{action.error || plans.error}</Notice>
      <div className="p-actions">
        <button className="btn btn-clay btn-small" disabled={action.busy || !plan}>Cobrar y activar</button>
        <button type="button" className="btn btn-glass btn-small" onClick={onCancel}>Cancelar</button>
      </div>
    </form>
  )
}
