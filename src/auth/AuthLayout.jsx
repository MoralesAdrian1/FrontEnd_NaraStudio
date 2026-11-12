import '../App.css'
import './auth.css'
import { studio } from '@brand/studio.js'

/** Marco de las páginas de cuenta y legales: logo, tarjeta y fondo. */
export function AuthLayout({ title, lead, children, wide = false }) {
  return (
    <div className="auth">
      <div className="blobs" aria-hidden="true">
        <span className="blob b1" />
        <span className="blob b2" />
      </div>
      <a className="auth-back" href="/">← Volver al inicio</a>
      <main className={`auth-card glass ${wide ? 'wide' : ''}`}>
        <img className="auth-logo" src={studio.logo.dark} alt={studio.logo.alt} width="180" height="81" />
        <h1>{title}</h1>
        {lead && <p className="auth-lead">{lead}</p>}
        {children}
      </main>
    </div>
  )
}
