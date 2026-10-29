import { useEffect, useRef, useState } from 'react'
import { onRequests } from '../lib/api.js'
import { registerFeedback } from '../lib/feedback.js'

/** Muestra los avisos de lib/feedback.js: éxito o error, confirmaciones y carga. Va una vez en el panel. */

// Lo que borra, cancela o quita se pinta como acción peligrosa
const DANGER = /cancel|quitar|borrar|rechaz|desactiv|retirar|cerrar/i

const LOADING_DELAY_MS = 350
const TOAST_MS = { ok: 4500, info: 6000, error: 8000 }
const ICON = { ok: '✓', error: '!', info: 'i' }

export function Feedback() {
  const [toasts, setToasts] = useState([])
  const [question, setQuestion] = useState(null)
  const [requests, setRequests] = useState({ reads: 0, writes: 0 })
  const [shown, setShown] = useState(null) // 'reads' | 'writes' | null
  const nextId = useRef(0)

  // Registra los avisos para notify() y confirmDialog()
  useEffect(() => {
    const dismiss = (id) => setToasts((t) => t.filter((x) => x.id !== id))
    const push = ({ kind, text }) => {
      const id = ++nextId.current
      setToasts((t) => [...t.slice(-3), { id, kind, text }])
      setTimeout(() => dismiss(id), TOAST_MS[kind] ?? TOAST_MS.info)
    }
    const ask = (q) => new Promise((resolve) => setQuestion({ ...q, resolve }))
    const unregister = registerFeedback({ push, ask })
    const off = onRequests(setRequests)
    return () => {
      unregister()
      off()
    }
  }, [])

  // La carga aparece solo si tarda un poco: así no parpadea en cada clic
  useEffect(() => {
    const kind = requests.writes ? 'writes' : requests.reads ? 'reads' : null
    if (!kind) {
      const t = setTimeout(() => setShown(null), 0)
      return () => clearTimeout(t)
    }
    const t = setTimeout(() => setShown(kind), LOADING_DELAY_MS)
    return () => clearTimeout(t)
  }, [requests])

  const answer = (yes) => {
    question?.resolve(yes)
    setQuestion(null)
  }

  return (
    <>
      <div className="fb-toasts" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`fb-toast is-${t.kind}`} role={t.kind === 'error' ? 'alert' : 'status'}>
            <span className="fb-icon" aria-hidden="true">{ICON[t.kind]}</span>
            <p>{t.text}</p>
            <button aria-label="Cerrar aviso" onClick={() => setToasts((all) => all.filter((x) => x.id !== t.id))}>×</button>
          </div>
        ))}
      </div>

      {shown === 'writes' && (
        <div className="fb-busy" role="status" aria-live="assertive">
          <div className="fb-busy-card">
            <span className="fb-spinner" aria-hidden="true" />
            <b>Guardando…</b>
          </div>
        </div>
      )}
      {shown === 'reads' && (
        <div className="fb-loading" role="status">
          <span className="fb-spinner small" aria-hidden="true" />
          Cargando…
        </div>
      )}

      {question && <ConfirmBox q={question} onAnswer={answer} />}
    </>
  )
}

function ConfirmBox({ q, onAnswer }) {
  const ref = useRef(null)
  const danger = q.danger ?? DANGER.test(q.text)
  useEffect(() => {
    if (!ref.current.open) ref.current.showModal()
  }, [])
  return (
    <dialog ref={ref} className="p-dialog fb-confirm" aria-labelledby="fb-confirm-text" onClose={() => onAnswer(ref.current.returnValue === 'yes')}>
      <form method="dialog" className="p-dialog-inner">
        <span className={`fb-icon big ${danger ? 'is-error' : 'is-info'}`} aria-hidden="true">{danger ? '!' : '?'}</span>
        <p id="fb-confirm-text" className="fb-confirm-text">{q.text}</p>
        <div className="fb-confirm-actions">
          <button value="no" className="btn btn-glass">{q.cancelLabel ?? 'No, volver'}</button>
          <button value="yes" className={`btn ${danger ? 'btn-danger' : 'btn-clay'}`} autoFocus>{q.confirmLabel ?? 'Sí, continuar'}</button>
        </div>
      </form>
    </dialog>
  )
}
