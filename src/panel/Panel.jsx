import { useEffect, useMemo, useState } from 'react'
import '../App.css'
import '../auth/auth.css'
import './panel.css'
import { supabase } from '../lib/supabase.js'
import { Closures, Disciplines } from './Admin.jsx'
import Book from './Book.jsx'
import Classes from './Classes.jsx'
import CoachProfile from './CoachProfile.jsx'
import Coaches from './Coaches.jsx'
import Memberships from './Memberships.jsx'
import Plans from './Plans.jsx'
import Progress, { StreakBadge } from './Progress.jsx'
import { useLoad } from './hooks.js'
import { Feedback } from './feedback.jsx'
import Profile from './Profile.jsx'
import Requests from './Requests.jsx'
import Settlement from './Settlement.jsx'
import Sessions from './Sessions.jsx'
import Students from './Students.jsx'

const ROLE_LABEL = { admin: 'Head coach', coach: 'Coach', student: 'Alumna' }

/** Mis datos y, para las coaches, su perfil público */
function MyProfile(props) {
  return (
    <div className="p-stack">
      <Profile {...props} />
      {props.me.coach && <CoachProfile />}
    </div>
  )
}

/**
 * Secciones por rol: grupos de [id, título, componente]. La admin tiene más funciones y las
 * ve por categorías; alumnas y coaches, en una sola lista.
 */
function groupsFor(role) {
  const profile = ['perfil', 'Mi perfil', MyProfile]
  if (role === 'student') {
    return [{ items: [['reservar', 'Reservar', Book], ['racha', 'Mi racha', Progress], ['membresias', 'Membresías', Memberships], profile] }]
  }
  if (role === 'coach') {
    return [{
      items: [
        ['sesiones', 'Sesiones', Sessions],
        ['clases', 'Mis clases', Classes],
        ['solicitudes', 'Pagos en efectivo', Requests],
        ['corte', 'Corte semanal', Settlement],
        ['alumnas', 'Alumnas', Students],
        ['planes', 'Planes', Plans],
        profile,
      ],
    }]
  }
  return [
    { title: 'Clases', items: [['sesiones', 'Sesiones', Sessions], ['clases', 'Clases', Classes], ['cerrados', 'Días cerrados', Closures]] },
    { title: 'Alumnas y ventas', items: [['alumnas', 'Alumnas', Students], ['solicitudes', 'Pagos en efectivo', Requests], ['planes', 'Planes', Plans]] },
    { title: 'Dinero', items: [['corte', 'Corte semanal', Settlement]] },
    { title: 'Estudio', items: [['coaches', 'Coaches', Coaches], ['disciplinas', 'Disciplinas', Disciplines]] },
    { title: 'Cuenta', items: [profile] },
  ]
}

// Si llega de la landing con una clase elegida (?reservar=ID), abre Reservar
const readTab = () =>
  new URLSearchParams(window.location.search).has('reservar') ? 'reservar' : window.location.hash.slice(1)

export default function Panel({ me, onMe }) {
  const groups = useMemo(() => groupsFor(me.role), [me.role])
  const tabs = useMemo(() => groups.flatMap((g) => g.items), [groups])
  const [tab, setTab] = useState(() => (tabs.some(([id]) => id === readTab()) ? readTab() : tabs[0][0]))
  const [menuOpen, setMenuOpen] = useState(false)
  // Las alumnas siempre ven su racha en la barra; se actualiza al cambiar de sección
  const streak = useLoad(me.role === 'student' ? '/progress/me' : null)
  const reloadStreak = streak.reload
  useEffect(() => {
    reloadStreak()
  }, [tab, reloadStreak])
  const [, title, Current] = tabs.find(([id]) => id === tab) ?? tabs[0]
  const disciplines = me.coach?.disciplines.map((d) => d.discipline.name).join(' · ')

  useEffect(() => {
    const onHash = () => tabs.some(([id]) => id === readTab()) && setTab(readTab())
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [tabs])

  // En el teléfono el menú es un cajón: Esc lo cierra
  useEffect(() => {
    if (!menuOpen) return undefined
    const onKey = (e) => e.key === 'Escape' && setMenuOpen(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [menuOpen])

  const choose = (id) => {
    setTab(id)
    setMenuOpen(false)
    window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}#${id}`)
    window.scrollTo({ top: 0 })
  }
  const badge = me.role === 'student' && <StreakBadge streak={streak.data} onOpen={() => choose('racha')} />
  const logout = async () => {
    await supabase.auth.signOut()
    window.location.assign('/')
  }

  return (
    <div className={`panel ${menuOpen ? 'menu-open' : ''}`}>
      <div className="blobs" aria-hidden="true">
        <span className="blob b1" />
        <span className="blob b2" />
      </div>

      {/* Teléfono: barra con el logo y el botón del menú */}
      <header className="panel-top glass">
        <a className="logo" href="/" aria-label="Ir al inicio">
          <img src="/img/nara-logo-dark.png" alt="Nara Studio" width="120" height="54" />
        </a>
        <span className="panel-top-title">{title}</span>
        {badge}
        <button className="btn btn-glass btn-small panel-menu-btn" aria-expanded={menuOpen} aria-controls="panel-side" onClick={() => setMenuOpen(true)}>
          <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
            <path d="M4 7h16M4 12h16M4 17h16" />
          </svg>
          Menú
        </button>
      </header>
      <div className="panel-scrim" aria-hidden="true" onClick={() => setMenuOpen(false)} />

      <aside className="panel-side glass" id="panel-side">
        <div className="panel-side-head">
          <a className="logo" href="/" aria-label="Ir al inicio">
            <img src="/img/nara-logo-dark.png" alt="Nara Studio" width="120" height="54" />
          </a>
          <span className="panel-side-badge">{badge}</span>
          <button className="auth-link panel-side-close" onClick={() => setMenuOpen(false)}>Cerrar</button>
        </div>

        <nav className="panel-nav" aria-label="Secciones del panel">
          {groups.map((g, i) => (
            <div key={g.title ?? i} className="panel-group">
              {g.title && <p className="panel-group-title">{g.title}</p>}
              {g.items.map(([id, label]) => (
                <button key={id} className={id === tab ? 'is-on' : ''} aria-current={id === tab ? 'page' : undefined} onClick={() => choose(id)}>
                  {label}
                </button>
              ))}
            </div>
          ))}
        </nav>

        <div className="panel-who">
          <b>{me.fullName}</b>
          <small>{ROLE_LABEL[me.role]}{disciplines && ` · ${disciplines}`}</small>
          <button className="btn btn-glass btn-small" onClick={logout}>Salir</button>
        </div>
      </aside>

      <main className="panel-main">
        <h1 className="sr-only">{title}</h1>
        <Current me={me} onMe={onMe} />
      </main>

      {/* Avisos de éxito o error, confirmaciones y carga */}
      <Feedback />
    </div>
  )
}
