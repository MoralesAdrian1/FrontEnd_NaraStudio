import { useState } from 'react'
import { api } from '../lib/api.js'
import { Notice, Section } from './ui.jsx'
import { useAction, useLoad } from './hooks.js'

const TEMPLATE = '/plantilla-alumnas.xlsx'
const MAX_ROWS = 500
const DAY_MS = 86_400_000

// Encabezados que se aceptan para cada dato (sin acentos ni mayúsculas)
const HEADERS = {
  fullName: ['nombre', 'nombre completo'],
  email: ['correo', 'correo electronico', 'email'],
  phone: ['telefono', 'celular', 'whatsapp'],
  birthDate: ['fecha nacimiento', 'fecha de nacimiento', 'nacimiento'],
  plan: ['membresia', 'plan'],
  startDate: ['fecha de inicio', 'fecha inicio', 'inicio'],
  credits: ['tokens disponibles', 'tokens disponibles (solo si aplica)', 'tokens', 'clases disponibles'],
}

const norm = (v) => String(v ?? '').normalize('NFD').replace(/\p{M}/gu, '').replace(/\s+/g, ' ').trim().toLowerCase()
const pad = (n) => String(n).padStart(2, '0')
const blank = (v) => v === null || v === undefined || String(v).trim() === ''

/** Fecha de Excel (celda de fecha, 15/03/1990 o 1990-03-15) a AAAA-MM-DD. */
function toIsoDate(v) {
  if (v instanceof Date) return `${v.getUTCFullYear()}-${pad(v.getUTCMonth() + 1)}-${pad(v.getUTCDate())}`
  const s = String(v).trim()
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/)
  if (m) return `${m[1]}-${pad(m[2])}-${pad(m[3])}`
  m = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/)
  if (m) return `${m[3]}-${pad(m[2])}-${pad(m[1])}`
  return null
}

const showDate = (iso) => iso.split('-').reverse().join('/')

/**
 * Lee la primera hoja: { rows, errors }. Cada fila trae lo que se manda al backend (data) y lo
 * que se muestra en la revisión (plan, warning).
 */
async function parse(file, plans) {
  const { readSheet } = await import('read-excel-file/browser')
  const [head = [], ...sheet] = await readSheet(file)
  const col = Object.fromEntries(
    Object.entries(HEADERS).map(([key, names]) => [key, head.findIndex((h) => names.includes(norm(h)))]),
  )
  if (col.fullName < 0) throw new Error('No encontré la columna "Nombre". Usa la plantilla.')
  const byName = new Map(plans.map((p) => [norm(p.name), p]))

  const rows = []
  const errors = []
  sheet.forEach((cells, i) => {
    const line = i + 2
    const get = (key) => (col[key] < 0 ? '' : cells[col[key]] ?? '')
    if (cells.every(blank)) return
    const data = { line, fullName: String(get('fullName')).trim() }
    const problems = []
    if (data.fullName.length < 2) problems.push('falta el nombre')

    const email = String(get('email')).trim().toLowerCase()
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) data.email = email
    else if (email) problems.push('el correo no es válido')

    const phone = String(get('phone')).replace(/\D/g, '')
    if (phone.length >= 8 && phone.length <= 20) data.phone = phone
    else if (phone) problems.push('el teléfono no es válido')

    if (!blank(get('birthDate'))) {
      const birthDate = toIsoDate(get('birthDate'))
      if (birthDate) data.birthDate = birthDate
      else problems.push('la fecha de nacimiento no se entiende (usa DD/MM/AAAA)')
    }

    let plan = null
    let warning = ''
    if (!blank(get('plan'))) {
      plan = byName.get(norm(get('plan')))
      if (!plan) problems.push(`no hay un plan llamado "${String(get('plan')).trim()}"`)
    }
    if (plan) {
      data.planId = plan.id
      const start = blank(get('startDate')) ? null : toIsoDate(get('startDate'))
      if (start) data.startDate = start
      else if (!blank(get('startDate'))) problems.push('la fecha de inicio no se entiende (usa DD/MM/AAAA)')
      if (!blank(get('credits'))) {
        const credits = Number(get('credits'))
        if (plan.credits === null) warning = 'su plan es ilimitado: los tokens no aplican'
        else if (Number.isInteger(credits) && credits >= 0 && credits <= 999) data.credits = credits
        else problems.push('los tokens deben ser un número entero')
      }
      const ends = Date.parse(`${data.startDate ?? new Date().toISOString().slice(0, 10)}T00:00:00-06:00`) + plan.durationDays * DAY_MS
      if (ends <= Date.now()) {
        warning = 'su membresía ya venció: se registra sin plan'
        delete data.planId
      }
    } else if (!blank(get('startDate')) || !blank(get('credits'))) {
      problems.push('tiene fecha de inicio o tokens, pero falta la membresía')
    }

    if (problems.length) errors.push({ line, name: data.fullName, problems })
    else rows.push({ data, plan: data.planId ? plan : null, warning })
  })
  return { rows, errors }
}

/** Lo que le queda de su membresía, para la revisión. */
function membershipLabel({ data, plan }) {
  if (!plan) return '—'
  const credits = plan.credits === null ? 'ilimitado' : `${data.credits ?? plan.credits} tokens`
  return `${plan.name} · desde ${data.startDate ? showDate(data.startDate) : 'hoy'} · ${credits}`
}

/** Admin: cargar desde Excel a las alumnas que ya iban al estudio, con su membresía vigente. */
export default function ImportStudents() {
  const plans = useLoad('/plans')
  const [file, setFile] = useState(null)
  const [parsed, setParsed] = useState(null)
  const [invite, setInvite] = useState(true)
  const [result, setResult] = useState(null)
  const reading = useAction()
  const sending = useAction()
  // La clase individual se compra para una clase concreta: no se importa
  const importable = plans.data?.filter((p) => p.kind !== 'single_class')

  const choose = (e) => {
    const f = e.target.files?.[0]
    e.target.value = ''
    setFile(f ?? null)
    setParsed(null)
    setResult(null)
    if (!f) return
    reading.run(async () => {
      if (!importable) throw new Error('Todavía no cargan los planes; espera un momento y vuelve a elegir el archivo.')
      const p = await parse(f, importable)
      if (p.rows.length > MAX_ROWS) throw new Error(`El archivo tiene ${p.rows.length} alumnas; sube como máximo ${MAX_ROWS} a la vez.`)
      setParsed(p)
    }, false)
  }

  const send = () =>
    sending.run(async () => {
      const r = await api('/students/import', { method: 'POST', body: { rows: parsed.rows.map((r) => r.data), invite } })
      setResult(r)
      setParsed(null)
      setFile(null)
      return r
    }, (r) => `Se registraron ${r.created} alumnas.`)

  const withEmail = parsed?.rows.filter((r) => r.data.email).length ?? 0
  const withPlan = parsed?.rows.filter((r) => r.plan).length ?? 0
  const warned = parsed?.rows.filter((r) => r.warning) ?? []
  const notes = result ? [...result.skipped, ...result.warnings].sort((a, b) => a.row - b.row) : []

  return (
    <div className="p-stack">
      <Section title="Carga masiva de alumnas" action={<a className="btn btn-glass btn-small" href={TEMPLATE} download>Descargar plantilla</a>}>
        <ol className="p-steps">
          <li>Descarga la plantilla y llena una fila por alumna. Solo el nombre es obligatorio; con el correo le llega su invitación a la app.</li>
          <li>
            Si tiene una membresía vigente, escribe el nombre del plan tal cual, la fecha en que empezó y, en los paquetes, cuántos
            tokens le quedan. Entra activa y sin cobro: ya la pagó en el estudio.
          </li>
          <li>Guárdala como Excel (.xlsx) y súbela aquí. Revisa lo que se va a cargar antes de confirmar.</li>
          <li>Las que ya están registradas (mismo correo o teléfono) se saltan, así que puedes subir el archivo otra vez sin duplicar.</li>
        </ol>
        {importable && (
          <p className="p-meta">Planes que puedes poner en "Membresía": {importable.map((p) => p.name).join(' · ')}</p>
        )}

        <label className="p-file">
          <span className="btn btn-clay btn-small">{file ? 'Elegir otro archivo' : 'Elegir archivo de Excel'}</span>
          <input type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={choose} />
          <small>{reading.busy ? 'Leyendo…' : file?.name ?? 'Ningún archivo elegido'}</small>
        </label>
        <Notice>{reading.error || plans.error}</Notice>

        {parsed && (
          <div className="p-detail">
            <p>
              <b>{parsed.rows.length}</b> alumnas listas para cargar, {withPlan} con membresía
              {withEmail < parsed.rows.length && ` (${parsed.rows.length - withEmail} sin correo)`}.
            </p>
            {parsed.errors.length > 0 && (
              <>
                <p className="p-warn-soft">Estas filas tienen errores y no se cargarán. Corrígelas en el Excel y vuelve a subirlo:</p>
                <ul className="p-import-errors">
                  {parsed.errors.map((e) => <li key={e.line}>Fila {e.line}{e.name && ` (${e.name})`}: {e.problems.join(', ')}</li>)}
                </ul>
              </>
            )}
            {warned.length > 0 && (
              <>
                <p>Se cargan, pero revisa:</p>
                <ul className="p-import-errors">
                  {warned.map((r) => <li key={r.data.line}>Fila {r.data.line} ({r.data.fullName}): {r.warning}</li>)}
                </ul>
              </>
            )}
            {parsed.rows.length > 0 && (
              <>
                <div className="p-import-preview">
                  <table>
                    <thead><tr><th>Nombre</th><th>Correo</th><th>Teléfono</th><th>Nacimiento</th><th>Membresía</th></tr></thead>
                    <tbody>
                      {parsed.rows.slice(0, 10).map((r) => (
                        <tr key={r.data.line}>
                          <td>{r.data.fullName}</td>
                          <td>{r.data.email ?? '—'}</td>
                          <td>{r.data.phone ?? '—'}</td>
                          <td>{r.data.birthDate ? showDate(r.data.birthDate) : '—'}</td>
                          <td>{membershipLabel(r)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {parsed.rows.length > 10 && <small>…y {parsed.rows.length - 10} más.</small>}
                </div>
                <label className="auth-check">
                  <input type="checkbox" checked={invite} onChange={(e) => setInvite(e.target.checked)} />
                  <span>
                    Mandar la invitación a la app {withEmail === 1 ? 'a la que tiene' : `a las ${withEmail} que tienen`} correo. Salen poco a poco; el servicio de correo manda
                    hasta 100 al día, así que si son más, reenvía las que falten desde su ficha en Alumnas.
                  </span>
                </label>
                <Notice>{sending.error}</Notice>
                <div className="p-actions">
                  <button className="btn btn-clay btn-small" onClick={send} disabled={sending.busy}>
                    {sending.busy ? 'Cargando…' : `Cargar ${parsed.rows.length} alumnas`}
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {result && (
          <div className="p-detail">
            <p>
              Se registraron <b>{result.created}</b> alumnas.
              {result.invitations > 0 && ` Se están mandando ${result.invitations === 1 ? 'la invitación' : `${result.invitations} invitaciones`}.`}
            </p>
            {notes.length > 0 && (
              <ul className="p-import-errors">
                {notes.map((s) => <li key={`${s.row}-${s.reason}`}>Fila {s.row} ({s.fullName}): {s.reason}</li>)}
              </ul>
            )}
          </div>
        )}
      </Section>
    </div>
  )
}
