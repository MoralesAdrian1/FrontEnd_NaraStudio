import { useEffect, useRef } from 'react'
import { studio } from '@brand/studio.js'

/** Lo que dura la animación antes de cerrarse sola (ms). */
const DURATION = 7000

/**
 * Al volver de Stripe con el pago hecho: una terminal bancaria lee la tarjeta y aprueba el pago,
 * luego aparece la palomita verde y la bienvenida. Se cierra sola, con Esc o con el botón.
 */
export default function PaymentWelcome({ onClose }) {
  const ref = useRef(null)
  useEffect(() => {
    const d = ref.current
    if (!d.open) d.showModal()
    const t = setTimeout(() => d.close(), DURATION)
    return () => clearTimeout(t)
  }, [])

  return (
    <dialog ref={ref} className="pw" aria-labelledby="pw-title" onClose={onClose} onClick={(e) => e.target === ref.current && ref.current.close()}>
      <div className="pw-inner">
        <div className="pw-stage" aria-hidden="true">
          <div className="pw-device">
            <div className="pw-card">
              <span className="pw-card-chip" />
              <span className="pw-card-num">•••• ••••</span>
            </div>
            <div className="pw-terminal">
              <span className="pw-slot" />
              <div className="pw-screen">
                <span className="pw-reading">Procesando<i>.</i><i>.</i><i>.</i></span>
                <span className="pw-approved">✓ Aprobado</span>
              </div>
              <div className="pw-keys">
                {Array.from({ length: 12 }, (_, i) => <span key={i} />)}
              </div>
            </div>
          </div>
          <svg className="pw-check" viewBox="0 0 96 96">
            <circle cx="48" cy="48" r="44" />
            <path d="M28 50 L42 64 L69 34" />
          </svg>
        </div>

        <div className="pw-text">
          <h2 id="pw-title">¡Bienvenida a {studio.shortName ?? studio.name}!</h2>
          <p>Tu pago quedó aprobado. Te mandamos el comprobante por correo.</p>
          <button className="btn btn-ok" onClick={() => ref.current.close()}>Comenzar</button>
        </div>
        <div className="pw-progress" aria-hidden="true" style={{ animationDuration: `${DURATION}ms` }} />
      </div>
    </dialog>
  )
}
