import { useEffect, useState } from 'react'
import { LEGAL_PATHS } from '../data/legal-paths.js'
import { getConsent, onConsent, resetConsent, setConsent } from '../lib/consent.js'
import './legal.css'

/** Links a los documentos, para el pie de página y los formularios. */
export function LegalLinks({ className = '' }) {
  return (
    <span className={`legal-links ${className}`}>
      <a href={LEGAL_PATHS.terminos}>Términos y condiciones</a>
      <a href={LEGAL_PATHS.privacidad}>Aviso de privacidad</a>
      <a href={LEGAL_PATHS.reembolsos}>Política de reembolsos</a>
      <a href={LEGAL_PATHS.cookies}>Cookies y almacenamiento</a>
      <button type="button" onClick={resetConsent}>Preferencias de almacenamiento</button>
    </span>
  )
}

/**
 * Aviso de almacenamiento: aparece hasta que la visitante elige. Las dos opciones pesan lo mismo
 * (mismo estilo y tamaño) y no hay nada marcado de antemano.
 */
export function ConsentBanner() {
  const [choice, setChoice] = useState(getConsent)
  useEffect(() => onConsent(setChoice), [])
  if (choice) return null
  return (
    <aside className="consent glass" role="region" aria-label="Aviso de almacenamiento">
      <p>
        Guardamos tu sesión en este navegador y, si aceptas, una copia temporal de planes y horarios para que la página cargue más rápido.
        No usamos publicidad ni rastreo. <a href={LEGAL_PATHS.cookies}>Más información</a>
      </p>
      <div className="legal-actions">
        <button className="btn btn-glass btn-small" onClick={() => setConsent('all')}>Aceptar</button>
        <button className="btn btn-glass btn-small" onClick={() => setConsent('necessary')}>Solo lo necesario</button>
      </div>
    </aside>
  )
}
