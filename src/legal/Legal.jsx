import { useEffect, useState } from 'react'
import { AuthLayout } from '../auth/AuthLayout.jsx'
import { LEGAL, LEGAL_PATHS, LEGAL_UPDATED } from '../data/legal.js'
import { getConsent, onConsent, setConsent } from '../lib/consent.js'
import { studio } from '@brand/studio.js'
import './legal.css'

const NAMES = { terminos: 'Términos y condiciones', privacidad: 'Aviso de privacidad', cookies: 'Cookies y almacenamiento', reembolsos: 'Política de reembolsos' }

/** /terminos, /privacidad y /cookies */
export function LegalPage({ doc }) {
  const { title, lead, sections } = LEGAL[doc]
  useEffect(() => {
    document.title = `${title} · ${studio.name}`
  }, [title])
  return (
    <AuthLayout wide title={title} lead={lead}>
      <article className="legal">
        <p className="legal-date">Última actualización: {LEGAL_UPDATED}</p>
        {sections.map(([heading, body]) => (
          <section key={heading}>
            <h2>{heading}</h2>
            {body.map((item, i) =>
              typeof item === 'string' ? (
                <p key={i}>{item}</p>
              ) : (
                <ul key={i}>{item.list.map((x) => <li key={x.slice(0, 40)}>{x}</li>)}</ul>
              ),
            )}
          </section>
        ))}
        {doc === 'cookies' && <StoragePreferences />}
        <nav className="legal-nav" aria-label="Documentos legales">
          {Object.entries(LEGAL_PATHS).filter(([id]) => id !== doc).map(([id, href]) => (
            <a key={id} href={href}>{NAMES[id]}</a>
          ))}
        </nav>
      </article>
    </AuthLayout>
  )
}

/** En /cookies: ver y cambiar la elección actual. */
function StoragePreferences() {
  const [choice, setChoice] = useState(getConsent)
  useEffect(() => onConsent(setChoice), [])
  return (
    <section className="legal-prefs">
      <h2>Tu elección</h2>
      <p>
        {choice === 'all' && 'Aceptaste el almacenamiento necesario y el de rendimiento.'}
        {choice === 'necessary' && 'Elegiste solo el almacenamiento necesario.'}
        {!choice && 'Todavía no eliges.'}
      </p>
      <div className="legal-actions">
        <button className="btn btn-glass btn-small" onClick={() => setConsent('all')} disabled={choice === 'all'}>Aceptar todo</button>
        <button className="btn btn-glass btn-small" onClick={() => setConsent('necessary')} disabled={choice === 'necessary'}>Solo lo necesario</button>
      </div>
    </section>
  )
}
