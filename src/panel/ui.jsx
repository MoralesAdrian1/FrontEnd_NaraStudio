import { useEffect, useId, useRef, useState } from 'react'
import { studentPhotoUrl } from '../lib/storage.js'

/** Foto de la alumna, o su inicial si no tiene. */
export function StudentPhoto({ name, path, small = false }) {
  const cls = `p-photo ${small ? 'is-small' : ''}`
  if (path) return <img className={cls} src={studentPhotoUrl(path)} alt="" loading="lazy" width="96" height="96" />
  return <span className={cls} aria-hidden="true">{name?.[0] ?? '?'}</span>
}

export function Notice({ kind = 'error', children }) {
  if (!children) return null
  return <p className={`auth-notice ${kind}`} role={kind === 'error' ? 'alert' : 'status'}>{children}</p>
}

export function Section({ title, action, children }) {
  return (
    <section className="p-section glass">
      <header className="p-section-head">
        <h2>{title}</h2>
        {action}
      </header>
      {children}
    </section>
  )
}

export function Empty({ children }) {
  return <p className="p-empty">{children}</p>
}

/** Formulario en línea que se abre y se cierra. */
export function Toggle({ label, children, className = 'btn btn-clay btn-small' }) {
  const [open, setOpen] = useState(false)
  return open ? (
    children(() => setOpen(false))
  ) : (
    <button className={className} onClick={() => setOpen(true)}>{label}</button>
  )
}

/** Ventana modal nativa: se abre al montarse y avisa al cerrarse (Esc, fuera o botón). */
export function Dialog({ title, onClose, children, wide = false }) {
  const ref = useRef(null)
  const titleId = useId()
  useEffect(() => {
    const d = ref.current
    if (!d.open) d.showModal()
  }, [])
  return (
    <dialog
      ref={ref}
      className={`p-dialog ${wide ? 'is-wide' : ''}`}
      aria-labelledby={titleId}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && ref.current.close()}
    >
      <div className="p-dialog-inner">
        <header className="p-dialog-head">
          <h2 id={titleId}>{title}</h2>
          <button className="auth-link" onClick={() => ref.current.close()}>Cerrar</button>
        </header>
        {children}
      </div>
    </dialog>
  )
}
