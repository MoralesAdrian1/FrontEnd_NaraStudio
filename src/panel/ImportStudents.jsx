import { useState } from 'react'
import { api } from '../lib/api.js'
import { Notice, Section } from './ui.jsx'
import { useAction } from './hooks.js'

const TEMPLATE = '/plantilla-alumnas.xlsx'
const MAX_ROWS = 500

// Encabezados que se aceptan para cada dato (sin acentos ni mayúsculas)
const HEADERS = {
  fullName: ['nombre completo', 'nombre'],
  phone: ['celular', 'telefono', 'whatsapp'],
  email: ['correo', 'correo electronico', 'email'],
  birthDate: ['fecha de nacimiento', 'nacimiento', 'cumpleanos'],
  address: ['direccion', 'domicilio'],
}

const norm = (v) => String(v ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase()
const pad = (n) => String(n).padStart(2, '0')

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

/** Lee la primera hoja: { rows, errors } con el número de fila del Excel. */
async function parse(file) {
  const { readSheet } = await import('read-excel-file/browser')
  const [head = [], ...data] = await readSheet(file)
  const col = Object.fromEntries(
    Object.entries(HEADERS).map(([key, names]) => [key, head.findIndex((h) => names.includes(norm(h)))]),
  )
  if (col.fullName < 0) throw new Error('No encontré la columna "Nombre completo". Usa la plantilla.')

  const rows = []
  const errors = []
  data.forEach((cells, i) => {
    const line = i + 2
    const get = (key) => (col[key] < 0 ? '' : cells[col[key]] ?? '')
    if (cells.every((c) => c === null || String(c).trim() === '')) return
    const row = { line, fullName: String(get('fullName')).trim() }
    const phone = String(get('phone')).replace(/\D/g, '')
    const email = String(get('email')).trim().toLowerCase()
    const birth = get('birthDate')
    const address = String(get('address')).trim()
    const problems = []
    if (row.fullName.length < 2) problems.push('falta el nombre')
    if (phone.length >= 8 && phone.length <= 20) row.phone = phone
    else if (phone) problems.push('el celular no es válido')
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) row.email = email
    else if (email) problems.push('el correo no es válido')
    const birthDate = birth === '' ? undefined : toIsoDate(birth)
    if (birthDate) row.birthDate = birthDate
    else if (birthDate === null) problems.push('la fecha de nacimiento no se entiende')
    if (address) row.address = address.slice(0, 300)
    if (problems.length) errors.push({ line, name: row.fullName, problems })
    else rows.push(row)
  })
  return { rows, errors }
}

/** Admin: cargar desde Excel a las alumnas que ya iban al estudio. */
export default function ImportStudents() {
  const [file, setFile] = useState(null)
  const [parsed, setParsed] = useState(null)
  const [invite, setInvite] = useState(true)
  const [result, setResult] = useState(null)
  const reading = useAction()
  const sending = useAction()

  const choose = (e) => {
    const f = e.target.files?.[0]
    setFile(f ?? null)
    setParsed(null)
    setResult(null)
    if (!f) return
    reading.run(async () => {
      const p = await parse(f)
      if (p.rows.length > MAX_ROWS) throw new Error(`El archivo tiene ${p.rows.length} alumnas; sube como máximo ${MAX_ROWS} a la vez.`)
      setParsed(p)
    }, false)
  }

  const send = () =>
    sending.run(async () => {
      const r = await api('/students/import', { method: 'POST', body: { rows: parsed.rows, invite } })
      setResult(r)
      setParsed(null)
      setFile(null)
      return r
    }, (r) => `Se registraron ${r.created} alumnas.`)

  const withEmail = parsed?.rows.filter((r) => r.email).length ?? 0

  return (
    <div className="p-stack">
      <Section title="Carga masiva de alumnas" action={<a className="btn btn-glass btn-small" href={TEMPLATE} download>Descargar plantilla</a>}>
        <ol className="p-steps">
          <li>Descarga la plantilla y llena una fila por alumna. Solo el nombre es obligatorio; con el correo le llega su invitación a la app.</li>
          <li>Guárdala como Excel (.xlsx) y súbela aquí. Revisa lo que se va a cargar antes de confirmar.</li>
          <li>Las que ya están registradas (mismo correo o celular) se saltan, así que puedes subir el archivo otra vez sin duplicar.</li>
        </ol>

        <label className="p-file">
          <span className="btn btn-clay btn-small">{file ? 'Elegir otro archivo' : 'Elegir archivo de Excel'}</span>
          <input type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={choose} />
          <small>{reading.busy ? 'Leyendo…' : file?.name ?? 'Ningún archivo elegido'}</small>
        </label>
        <Notice>{reading.error}</Notice>

        {parsed && (
          <div className="p-detail">
            <p><b>{parsed.rows.length}</b> alumnas listas para cargar{withEmail < parsed.rows.length && ` (${parsed.rows.length - withEmail} sin correo)`}.</p>
            {parsed.errors.length > 0 && (
              <>
                <p className="p-warn-soft">Estas filas tienen errores y no se cargarán. Corrígelas en el Excel y vuelve a subirlo si las necesitas:</p>
                <ul className="p-import-errors">
                  {parsed.errors.map((e) => <li key={e.line}>Fila {e.line}{e.name && ` (${e.name})`}: {e.problems.join(', ')}</li>)}
                </ul>
              </>
            )}
            {parsed.rows.length > 0 && (
              <>
                <div className="p-import-preview">
                  <table>
                    <thead><tr><th>Nombre</th><th>Celular</th><th>Correo</th><th>Nacimiento</th></tr></thead>
                    <tbody>
                      {parsed.rows.slice(0, 8).map((r, i) => (
                        <tr key={i}><td>{r.fullName}</td><td>{r.phone ?? '—'}</td><td>{r.email ?? '—'}</td><td>{r.birthDate ?? '—'}</td></tr>
                      ))}
                    </tbody>
                  </table>
                  {parsed.rows.length > 8 && <small>…y {parsed.rows.length - 8} más.</small>}
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
            {result.skipped.length > 0 && (
              <>
                <p>{result.skipped.length === 1 ? 'Se saltó 1 porque ya estaba' : `Se saltaron ${result.skipped.length} porque ya estaban`}:</p>
                <ul className="p-import-errors">
                  {result.skipped.map((s) => <li key={s.row}>Fila {s.row} ({s.fullName}): {s.reason}</li>)}
                </ul>
              </>
            )}
          </div>
        )}
      </Section>
    </div>
  )
}
