import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import './App.css'
import { classKinds, combo, copy, credits, demos, disciplines, gallery, instructors, mission, philosophy, schedule, studio, vision } from '@brand/studio.js'
import InstructorDialog from './components/InstructorDialog.jsx'
import { api } from './lib/api.js'
import { publicUrl } from './lib/public-url.js'
import { hasStoredSession } from './lib/session.js'

// El mapa (Leaflet) es pesado: se descarga solo cuando la visitante llega a la ubicación
const StudioMap = lazy(() => import('./components/StudioMap.jsx'))
import { addDays, clock, DAYS, studioDate, studioDateTime, weekdayOf, whenLabel } from './lib/time.js'
import Avatar from './components/Avatar.jsx'
import { LegalLinks } from './legal/Consent.jsx'

const byId = (list) => Object.fromEntries(list.map((x) => [x.id, x]))
const INSTRUCTOR = byId(instructors)
// Perfil fijo (studio.js) de quien imparte cada disciplina: solo si el backend no responde
const PROFILE_BY_DISCIPLINE = Object.fromEntries(disciplines.map((d) => [d.id, d.profile]))

const TONES = Object.fromEntries(disciplines.map((d) => [d.id, d.tone]))
const LOOKS = instructors.map((p) => p.look)
const SHORT_MAX = 170

/** Una coach del backend con la forma de los perfiles de studio.js. */
function toPerson(c, i) {
  const story = (c.bio ?? '').split(/\n\s*\n/).map((t) => t.trim()).filter(Boolean)
  const disciplines = c.disciplines.map((d) => d.name).join(' · ')
  const first = story[0] ?? `Imparte ${disciplines} en ${studio.name}.`
  return {
    id: c.id,
    name: c.name,
    role: c.isHeadCoach ? `Head coach · ${disciplines}` : disciplines,
    isHeadCoach: c.isHeadCoach,
    photo: publicUrl(c.photoPath),
    tone: TONES[c.disciplines[0]?.slug] ?? disciplines[0].tone,
    look: LOOKS[i % LOOKS.length],
    years: null,
    short: first.length > SHORT_MAX ? `${first.slice(0, SHORT_MAX).replace(/\s+\S*$/, '')}…` : first,
    bio: story.length ? story : null,
    experience: [],
    certificates: c.certifications.map((x) => ({ title: x.issuer ? `${x.name} · ${x.issuer}` : x.name, file: publicUrl(x.filePath) })),
    social: [
      c.instagram && { label: 'Instagram', url: `https://instagram.com/${c.instagram}` },
      c.tiktok && { label: 'TikTok', url: `https://tiktok.com/@${c.tiktok}` },
    ].filter(Boolean),
  }
}

/** Las coaches activas del backend (la head coach primero); null si no responde. */
function useCoaches() {
  const [people, setPeople] = useState(null)
  useEffect(() => {
    api('/coaches')
      .then((list) => {
        if (!list.length) return
        const sorted = [...list].sort((a, b) => Number(b.isHeadCoach) - Number(a.isHeadCoach))
        setPeople(sorted.map(toPerson))
      })
      .catch(() => {}) // sin backend se quedan los perfiles de studio.js
  }, [])
  return people
}
const sortByTime = (a, b) => a.time.localeCompare(b.time)
const classesOf = (slots, id) => slots.filter((c) => c.instructor === id)

/** El horario muestra los próximos 7 días: cada columna es la siguiente vez que toca ese día. */
const nextDateOf = (weekday, today = studioDate()) => addDays(today, (weekday - weekdayOf(today) + 7) % 7)

/** Horario fijo de studio.js con sus próximas fechas (si la API no responde). */
function staticSlots() {
  return schedule.map((c) => {
    const date = nextDateOf(c.day)
    return {
      ...c,
      id: `${c.day}-${c.time}`,
      date,
      startsAt: studioDateTime(date, c.time),
      coachName: INSTRUCTOR[c.instructor].name,
      status: 'scheduled',
      spotsLeft: null,
    }
  })
}

/** Sesiones reales del backend con la misma forma que el horario fijo. */
function liveSlots(sessions) {
  // Cada día de la semana muestra su fecha más cercana que tenga clases (hoy incluido)
  const today = studioDate()
  const nearest = {}
  for (const s of sessions) {
    const wd = weekdayOf(s.date)
    if (s.date >= today && (!nearest[wd] || s.date < nearest[wd])) nearest[wd] = s.date
  }
  return sessions
    .filter((s) => nearest[weekdayOf(s.date)] === s.date)
    .map((s) => ({
      id: s.id,
      day: weekdayOf(s.date),
      date: s.date,
      time: s.time,
      startsAt: new Date(s.startsAt),
      name: s.class.name,
      discipline: s.discipline.slug,
      instructor: PROFILE_BY_DISCIPLINE[s.discipline.slug],
      coachId: s.coach.id,
      coachName: s.coach.name,
      status: s.status,
      spotsLeft: s.spotsLeft,
      bookable: s.bookable,
    }))
}

function useSchedule() {
  const [slots, setSlots] = useState(staticSlots)
  useEffect(() => {
    api('/sessions')
      .then((sessions) => {
        const live = liveSlots(sessions)
        if (live.length) setSlots(live)
      })
      .catch(() => {}) // sin backend se queda el horario fijo
  }, [])
  return slots
}

const nextSlot = (slots, now = new Date()) =>
  slots.filter((c) => c.status === 'scheduled' && c.startsAt > now).sort((a, b) => a.startsAt - b.startsAt)[0] ?? null

function useReveal() {
  useEffect(() => {
    document.documentElement.classList.add('js')
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add('is-in')
            io.unobserve(e.target)
          }
        }
      },
      { rootMargin: '0px 0px -10% 0px' },
    )
    const watch = (root) => root.querySelectorAll('[data-reveal]:not(.is-in)').forEach((el) => io.observe(el))
    watch(document)
    // Lo que llega después del backend (coaches, planes) también tiene que aparecer
    const mo = new MutationObserver((changes) => {
      for (const c of changes) {
        for (const node of c.addedNodes) {
          if (!(node instanceof Element)) continue
          if (node.matches('[data-reveal]:not(.is-in)')) io.observe(node)
          watch(node)
        }
      }
    })
    mo.observe(document.body, { childList: true, subtree: true })
    return () => {
      mo.disconnect()
      io.disconnect()
    }
  }, [])
}

// Inclinación 3D que sigue al cursor; escribe variables CSS sin volver a renderizar
function useTilt(max = 10) {
  const ref = useRef(null)
  useEffect(() => {
    const el = ref.current
    if (!el || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const move = (e) => {
      if (e.pointerType === 'touch') return
      const r = el.getBoundingClientRect()
      const x = (e.clientX - r.left) / r.width
      const y = (e.clientY - r.top) / r.height
      el.style.setProperty('--ry', `${(x - 0.5) * max * 2}deg`)
      el.style.setProperty('--rx', `${(0.5 - y) * max * 2}deg`)
      el.style.setProperty('--mx', `${x * 100}%`)
      el.style.setProperty('--my', `${y * 100}%`)
      el.classList.add('is-tilting')
    }
    const leave = () => {
      el.style.setProperty('--rx', '0deg')
      el.style.setProperty('--ry', '0deg')
      el.classList.remove('is-tilting')
    }
    el.addEventListener('pointermove', move)
    el.addEventListener('pointerleave', leave)
    return () => {
      el.removeEventListener('pointermove', move)
      el.removeEventListener('pointerleave', leave)
    }
  }, [max])
  return ref
}

function Blobs() {
  return (
    <div className="blobs" aria-hidden="true">
      <span className="blob b1" />
      <span className="blob b2" />
      <span className="blob b3" />
    </div>
  )
}

const wa = (text) => `https://wa.me/${studio.whatsapp}?text=${encodeURIComponent(text)}`
const WHATSAPP = wa(`Hola ${studio.shortName}, tengo una duda sobre las clases.`)
const SOCIAL = [['Instagram', studio.instagram], ['TikTok', studio.tiktok], ['Facebook', studio.facebook]]
const money = (n) => `$${n.toLocaleString('es-MX')}`

function Header() {
  // Basta con ver si hay sesión guardada; si entra o sale en otra pestaña, se actualiza
  const [signedIn, setSignedIn] = useState(hasStoredSession)
  useEffect(() => {
    const onStorage = () => setSignedIn(hasStoredSession())
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])
  return (
    <header className="bar">
      <div className="bar-inner glass">
        <a className="logo" href="#inicio">
          <img src={studio.logo.dark} alt={studio.logo.alt} width="160" height="72" />
        </a>
        <nav aria-label="Principal">
          <a href="#clases">Clases</a>
          <a href="#horario">Horario</a>
          <a href="#instructoras">Instructoras</a>
          <a href="#ubicacion">Ubicación</a>
        </nav>
        <a className="btn btn-glass btn-small" href={signedIn ? '/cuenta' : '/entrar'}>{signedIn ? 'Mi cuenta' : 'Entrar'}</a>
        <a className="btn btn-clay btn-small" href="#horario">Reservar</a>
      </div>
    </header>
  )
}

function Hero({ next }) {
  return (
    <section className="hero wrap" id="inicio">
      <div className="hero-copy" data-reveal>
        <p className="hero-name">{studio.name} · {studio.tagline}</p>
        <h1>{copy.heroTitle}</h1>
        <p className="lead">{copy.heroLead}</p>
        <div className="actions">
          <a className="btn btn-clay" href="#horario">Reserva tu primera clase</a>
          <a className="btn btn-glass" href="#clases">Ver clases y planes</a>
        </div>
      </div>

      <div className="hero-visual">
        <div className="hero-ring" aria-hidden="true" />
        <div className="hero-photo arch shutter">
          <img src={copy.heroImage.src} alt={copy.heroImage.alt} loading="eager" />
        </div>
        {next && (
          <div className="next-card glass float-a">
            <strong>{next.name}</strong>
            <span className="next-when"><span className="pulse" />
              {whenLabel(next.date)} · {clock(next.time)} · con {next.coachName.split(' ')[0]}
            </span>
          </div>
        )}
        {copy.heroChips.slice(0, 2).map((chip, i) => (
          <span key={chip} className={`chip-clay chip-${i + 1} ${i ? 'float-a' : 'float-b'}`}>{chip}</span>
        ))}
      </div>
    </section>
  )
}

function Marquee() {
  const words = copy.marquee
  const row = (
    <span className="marquee-row">
      {words.map((w) => <span key={w}>{w}<i aria-hidden="true" /></span>)}
    </span>
  )
  return (
    <div className="marquee" aria-label={words.join(', ')}>
      <div className="marquee-track" aria-hidden="true">{row}{row}</div>
    </div>
  )
}

function About({ people, onOpen }) {
  const founder = people.find((p) => p.quote) ?? people.find((p) => p.isHeadCoach)
  return (
    <section className="about wrap" id="nosotras" aria-labelledby="about-title">
      <div className="about-panel glass" data-reveal>
        <div className="about-photo arch">
          <img src={copy.aboutImage.src} alt={copy.aboutImage.alt} loading="lazy" />
        </div>
        <div className="about-text">
          <h2 id="about-title">{copy.aboutTitle}</h2>
          <ul className="motto">
            {copy.motto.map((m, i) => <li key={m} className={`clay-card ${['', 'rose', 'sand'][i % 3]}`}>{m}</li>)}
          </ul>
          {founder && (
            <figure className="founder clay-card rose">
              <Portrait person={founder} className="founder-photo" />
              <div>
                {founder.quote ? <blockquote>«{founder.quote}»</blockquote> : <p>{founder.short}</p>}
                <figcaption>
                  <b>{founder.name}</b> · {founder.role}
                </figcaption>
                <button className="btn btn-clay btn-small" onClick={() => onOpen(founder.id)}>Conoce su historia</button>
              </div>
            </figure>
          )}
        </div>
      </div>
    </section>
  )
}

/** Etiqueta corta del plan en la tarjeta de su disciplina. */
const PLAN_LABEL = { monthly: 'Mes', weekly: 'Semana', single_class: 'Clase individual' }
const planLabel = (p) => (p.kind === 'pack' ? `${p.credits} clases` : PLAN_LABEL[p.kind])

/** Planes reales del backend; si no responde, se quedan los de studio.js (con WhatsApp). */
function usePlans() {
  const [live, setLive] = useState(null)
  useEffect(() => {
    api('/plans')
      .then((plans) => {
        if (!plans.length) return
        const byDiscipline = {}
        for (const p of plans.filter((x) => !x.isCombo)) {
          const id = p.shares[0].discipline.slug
          ;(byDiscipline[id] ??= []).push({ id: p.id, label: planLabel(p), price: p.priceCents / 100 })
        }
        const c = plans.find((x) => x.isCombo)
        setLive({ byDiscipline, combo: c && { id: c.id, label: c.name, price: c.priceCents / 100 } })
      })
      .catch(() => {})
  }, [])
  return live
}

/** Con plan real: a la cuenta con el plan elegido; sin backend: por WhatsApp. */
const wantLink = (p, what) =>
  p.id
    ? { href: `/cuenta?plan=${p.id}#membresias` }
    : { href: wa(`Hola ${studio.shortName}, quiero ${what} (${money(p.price)}).`), target: '_blank', rel: 'noreferrer' }

function Classes() {
  const live = usePlans()
  // Con el backend, solo sus planes; los de studio.js son el respaldo si no responde
  const shownCombo = live ? live.combo : combo
  return (
    <section className="classes wrap" id="clases" aria-labelledby="clases-title">
      <div className="section-head" data-reveal>
        <h2 id="clases-title">Clases y planes</h2>
        <p>{copy.classesLead}</p>
      </div>

      <div className="disc-grid">
        {disciplines.map((d, i) => (
          <article className={`disc clay-card ${i ? 'rose' : ''}`} key={d.id} data-reveal>
            <div className="disc-photo">
              {d.video ? (
                <AutoVideo src={d.video} poster={d.image} label={`Video de una clase de ${d.name}`} />
              ) : (
                <img src={d.image} alt={d.imageAlt} loading="lazy" />
              )}
              <span className="disc-time glass">{d.details[0]}</span>
            </div>
            <div className="disc-body">
              <h3>{d.name}</h3>
              <p className="disc-classes">{d.classes}</p>
              <div className="styles">
                {d.styles.map((st) => (
                  <div key={st.name} className="style">
                    {d.styles.length > 1 && <h4>{st.name}</h4>}
                    <p>{st.text}</p>
                    <p className="in-studio"><b>En {studio.shortName}:</b> {st.inStudio}</p>
                  </div>
                ))}
              </div>
              <ul className="chips">
                {d.details.slice(1).map((x) => <li key={x}>{x}</li>)}
              </ul>
              <ul className="plans" aria-label={`Planes de ${d.name}`}>
                {(live ? live.byDiscipline[d.id] ?? [] : d.plans).map((p) => (
                  <li key={p.label} className="plan glass">
                    <span>{p.label}</span>
                    <b>{money(p.price)}</b>
                    <a className="plan-btn" {...wantLink(p, `el plan ${p.label} de ${d.name}`)}>
                      Lo quiero
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </article>
        ))}
      </div>

      {shownCombo && (
        <div className="combo" data-reveal>
          <div>
            <h3>{shownCombo.label}</h3>
            <p>{copy.comboLead}</p>
          </div>
          <b>{money(shownCombo.price)}</b>
          <a className="btn btn-light" {...wantLink(shownCombo, `el plan ${shownCombo.label}`)}>
            Lo quiero
          </a>
        </div>
      )}
    </section>
  )
}

/** Tipo de clase (su color en el horario): por nombre y, si no, por disciplina. */
const kindIndex = (c) => {
  const byName = classKinds.findIndex((k) => k.match === c.name)
  return byName >= 0 ? byName : classKinds.findIndex((k) => k.match === c.discipline)
}
const kind = (c) => Math.max(kindIndex(c), 0)

/** Lugares de una sesión real; el horario fijo no los conoce. */
function spots(c) {
  if (c.status === 'cancelled') return 'Cancelada'
  if (c.spotsLeft === null) return null
  if (c.spotsLeft === 0) return 'Llena'
  return `${c.spotsLeft} ${c.spotsLeft === 1 ? 'lugar' : 'lugares'}`
}

/** Se puede reservar una sesión real, futura, no cancelada y con lugar. */
const isOpen = (c, now) => typeof c.id === 'number' && c.status === 'scheduled' && c.spotsLeft > 0 && c.startsAt > now

/** Reservar si su semana ya abrió; si no, avisa cuándo abre. */
function BookLink({ c, now, label }) {
  if (!isOpen(c, now)) return null
  if (!c.bookable) return <small className="book-soon">Abre el sábado</small>
  return <a className="book-link" href={bookHref(c)} aria-label={label}>Reservar</a>
}

/** A la cuenta con la clase elegida; sin sesión iniciada, /cuenta manda primero a entrar o crear cuenta. */
const bookHref = (c) => `/cuenta?reservar=${c.id}#reservar`

/** Lugares libres en verde; llena o cancelada en gris. */
function Spots({ c, className }) {
  const text = spots(c)
  if (!text) return null
  const open = c.status === 'scheduled' && c.spotsLeft > 0
  return <small className={`${className} ${open ? 'is-open' : ''}`}>{text}</small>
}

function Schedule({ slots, people, onOpenInstructor }) {
  const [now] = useState(() => new Date())
  const today = studioDate(now)
  const week = [...new Set(slots.map((c) => c.day))].sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7))
  const times = [...new Set(slots.map((c) => c.time))].sort()
  const todayDay = weekdayOf(today)
  const [day, setDay] = useState(week.includes(todayDay) ? todayDay : week[0])
  const next = nextSlot(slots, now)
  const isPast = (c) => c.startsAt <= now
  const isNext = (c) => next && c.id === next.id
  const at = (d, t) => slots.filter((c) => c.day === d && c.time === t)
  const dateOf = (d) => slots.find((c) => c.day === d)?.date
  const label = (c) => `${c.name}, ${DAYS[c.day]} ${clock(c.time)}, con ${c.coachName}${spots(c) ? `, ${spots(c)}` : ''}. Ver perfil`
  const bookLabel = (c) => `Reservar ${c.name}, ${DAYS[c.day]} ${clock(c.time)}`
  const cls = (c) =>
    `k-${kind(c)} ${isPast(c) ? 'past' : ''} ${isNext(c) ? 'is-next' : ''} ${c.status === 'cancelled' ? 'is-cancelled' : ''} ${c.spotsLeft === 0 ? 'is-full' : ''}`

  return (
    <section className="schedule wrap" id="horario" aria-labelledby="horario-title">
      <div className="week glass" data-reveal>
        <div className="week-head">
          <h2 id="horario-title">Horario</h2>
          {next && (
            <p>
              <span className="pulse" /> Próxima: {next.name} {whenLabel(next.date, today).toLowerCase()} a las{' '}
              {clock(next.time)}
            </p>
          )}
        </div>
        <ul className="legend">
          {classKinds.map((k, i) => <li key={k.match} className={`k-${i}`}>{k.label}</li>)}
        </ul>

        {/* Calendario: escritorio y tableta */}
        <div className="cal" role="table" aria-label="Horario semanal" style={{ '--cols': week.length }}>
          <div className="cal-row cal-headrow" role="row">
            <span role="columnheader" className="cal-corner" />
            {week.map((d) => (
              <span role="columnheader" key={d} className={`cal-day ${dateOf(d) === today ? 'is-today' : ''}`}>
                {DAYS[d]}
                <small>{dateOf(d) === today ? 'hoy' : Number(dateOf(d)?.slice(8))}</small>
              </span>
            ))}
          </div>
          {times.map((t) => (
            <div className="cal-row" role="row" key={t}>
              <span role="rowheader" className="cal-time">{clock(t)}</span>
              {week.map((d) => {
                const here = at(d, t)
                if (!here.length) return <span role="cell" key={d} className="cal-empty" />
                return (
                  <span role="cell" key={d} className="cal-cell">
                    {here.map((c) => (
                      <div key={c.id} className={`cal-class ${cls(c)}`}>
                        <button className="cal-open" onClick={() => onOpenInstructor(c.instructor)} aria-label={label(c)}>
                          <b>{c.name}</b>
                          <span>{c.coachName.split(' ')[0]}</span>
                        </button>
                        {isNext(c) && <em>Siguiente</em>}
                        <Spots c={c} className="cal-spots" />
                        <BookLink c={c} now={now} label={bookLabel(c)} />
                      </div>
                    ))}
                  </span>
                )
              })}
            </div>
          ))}
        </div>

        {/* Lista por día: teléfono */}
        <div className="day-list">
          <div className="days" role="tablist" aria-label="Día de la semana">
            {week.map((d) => (
              <button
                key={d}
                role="tab"
                aria-selected={day === d}
                aria-controls="day-panel"
                className="day"
                onClick={() => setDay(d)}
              >
                {DAYS[d].slice(0, 3)}
                {dateOf(d) === today && <span className="today">hoy</span>}
              </button>
            ))}
          </div>
          <ul className="slots" id="day-panel" role="tabpanel" aria-label={DAYS[day]}>
            {slots.filter((c) => c.day === day).sort(sortByTime).map((c) => {
              const who = people[c.instructor]
              return (
                <li key={c.id} className={`slot ${cls(c)}`}>
                  <span className="slot-time">{clock(c.time)}</span>
                  <span className="slot-name">
                    {c.name}
                    <Spots c={c} className="slot-spots" />
                  </span>
                  <button className="slot-who" onClick={() => onOpenInstructor(c.instructor)}>
                    {who && <Portrait person={who} className="mini" />}
                    <span>{c.coachName}</span>
                  </button>
                  {isNext(c) && <span className="slot-flag">Siguiente</span>}
                  <BookLink c={c} now={now} label={bookLabel(c)} />
                </li>
              )
            })}
          </ul>
        </div>

        <p className="motto-line">{copy.scheduleLine}</p>
      </div>
    </section>
  )
}

function Portrait({ person, className = '' }) {
  if (person.photo) {
    return (
      <div className={`portrait ${className}`} style={{ '--tone': person.tone }}>
        <img src={person.photo} alt={`Retrato de ${person.name}`} loading="lazy" />
      </div>
    )
  }
  return (
    <div className={`portrait ${className}`} style={{ '--tone': person.tone }} role="img" aria-label={`Ilustración de ${person.name}, foto próximamente`}>
      <Avatar look={person.look} />
    </div>
  )
}

function InstructorCard({ person, slots, onOpen }) {
  const ref = useTilt(9)
  const mine = classesOf(slots, person.id)
  const stats = [
    person.years && [person.years, 'años de experiencia'],
    [mine.length, 'clases a la semana'],
    [new Set(mine.map((c) => c.day)).size, 'días a la semana'],
    person.certificates.length > 0 && [person.certificates.length, 'certificados'],
    [60, 'minutos por clase'],
  ].filter(Boolean).slice(0, 3)
  return (
    <article className="tcard" ref={ref} style={{ '--tone': person.tone }} data-reveal>
      <div className="tcard-inner">
        <div className="tcard-stage" aria-hidden="true">
          <span className="tcard-disc" />
        </div>
        <Portrait person={person} className="tcard-figure" />
        <span className="chip-clay tcard-role">{person.role}</span>
        <div className="tcard-glass glass">
          <h3>{person.name}</h3>
          <p>{person.short}</p>
          <ul className="tcard-stats">
            {stats.map(([n, label]) => <li key={label}><b>{n}</b> {label}</li>)}
          </ul>
          <button className="btn btn-clay btn-block" onClick={() => onOpen(person.id)}>Ver perfil completo</button>
        </div>
        <span className="tcard-shine" aria-hidden="true" />
      </div>
    </article>
  )
}

function Instructors({ people, slots, onOpen }) {
  const track = useRef(null)
  const [active, setActive] = useState(0)
  // En el carrusel del teléfono: qué tarjeta está a la vista
  const onScroll = () => {
    const el = track.current
    const card = el.firstElementChild
    if (!card) return
    setActive(Math.round(el.scrollLeft / (card.offsetWidth + parseFloat(getComputedStyle(el).columnGap || 0))))
  }
  const go = (i) => {
    const el = track.current
    el.scrollTo({ left: el.children[i].offsetLeft - el.offsetLeft - parseFloat(getComputedStyle(el).paddingLeft), behavior: 'smooth' })
  }
  return (
    <section className="team wrap" id="instructoras" aria-labelledby="team-title">
      <div className="section-head" data-reveal>
        <h2 id="team-title">{copy.teamTitle}</h2>
        <p>{copy.teamLead}</p>
      </div>
      <div className="team-grid" ref={track} onScroll={onScroll}>
        {people.map((p) => <InstructorCard key={p.id} person={p} slots={slots} onOpen={onOpen} />)}
      </div>
      <div className="team-dots" role="group" aria-label="Elegir instructora">
        {people.map((p, i) => (
          <button key={p.id} className={i === active ? 'on' : ''} aria-label={p.name} aria-current={i === active} onClick={() => go(i)} />
        ))}
      </div>
    </section>
  )
}

function Essence() {
  return (
    <section className="essence wrap" id="esencia" aria-labelledby="esencia-title">
      <div className="section-head" data-reveal>
        <h2 id="esencia-title">{copy.essenceTitle}</h2>
        <p>{copy.essenceLead}</p>
      </div>
      <ol className="values">
        {philosophy.map(([name, text], i) => (
          <li key={name} className={`value clay-card ${['', 'rose', 'sand'][i % 3]}`} data-reveal>
            <span className="value-n" aria-hidden="true">{String(i + 1).padStart(2, '0')}</span>
            <h3>{name}</h3>
            <p>{text}</p>
          </li>
        ))}
      </ol>
      <div className="mv">
        <article className="mv-card glass" data-reveal>
          <h3>Misión</h3>
          <p>{mission}</p>
        </article>
        <article className="mv-card glass" data-reveal>
          <h3>Visión</h3>
          <p>{vision}</p>
        </article>
      </div>
      <p className="essence-line" data-reveal>{copy.essenceLine}</p>
    </section>
  )
}

function Gallery() {
  return (
    <section className="gallery wrap" id="estudio" aria-labelledby="estudio-title">
      <div className="section-head" data-reveal>
        <h2 id="estudio-title">Conoce el estudio</h2>
        <p>{copy.galleryLead}</p>
      </div>
      <div className="bento">
        {gallery.map((g, i) => (
          <figure key={g.src} className={`tile tile-${i}`} data-reveal>
            <img src={g.src} alt={g.alt} loading="lazy" />
            <figcaption className="glass">{g.caption}</figcaption>
          </figure>
        ))}
        <div className="tile tile-facts clay-card rose" data-reveal>
          <b>{copy.galleryFact[0]}</b>
          <span>{copy.galleryFact[1]}</span>
        </div>
      </div>
    </section>
  )
}

function Demos() {
  return (
    <section className="demos" id="videos" aria-labelledby="videos-title">
      <div className="wrap">
        <div className="section-head" data-reveal>
          <h2 id="videos-title">Mira cómo es una clase</h2>
          <p>{copy.demosLead}</p>
        </div>
        <div className="demo-grid">
          {demos.map((d) => (
            <figure className="demo" key={d.id} data-reveal>
              {d.src ? (
                <video controls preload="metadata" poster={d.poster ?? undefined} playsInline>
                  <source src={d.src} />
                </video>
              ) : (
                <div className="demo-soon">
                  <img src={d.poster} alt="" loading="lazy" />
                  <span className="play glass" aria-hidden="true" />
                  <span className="soon chip-clay">Video en grabación</span>
                </div>
              )}
              <figcaption>{d.title}</figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  )
}

/**
 * Video decorativo en silencio y en bucle. No se descarga hasta que está cerca de verse, se pausa
 * fuera de pantalla y, si la persona pidió menos movimiento, se queda en la imagen.
 */
function AutoVideo({ src, poster, label }) {
  const ref = useRef(null)
  const [near, setNear] = useState(false)
  useEffect(() => {
    const v = ref.current
    if (!('IntersectionObserver' in window) || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) {
        setNear(true)
        v.play().catch(() => undefined)
      } else v.pause()
    }, { rootMargin: '300px' })
    io.observe(v)
    return () => io.disconnect()
  }, [])
  return <video ref={ref} src={near ? src : undefined} poster={poster} muted loop playsInline preload="none" aria-label={label} />
}

/** El mapa se monta cuando su lugar está por aparecer en pantalla. */
function LazyMap() {
  const ref = useRef(null)
  const [show, setShow] = useState(() => !('IntersectionObserver' in window))
  useEffect(() => {
    if (show) return undefined
    const io = new IntersectionObserver(([e]) => e.isIntersecting && setShow(true), { rootMargin: '600px' })
    io.observe(ref.current)
    return () => io.disconnect()
  }, [show])
  return (
    <div ref={ref} className="map-slot">
      {show && (
        <Suspense fallback={<div className="map" aria-hidden="true" />}>
          <StudioMap />
        </Suspense>
      )}
      {!show && <div className="map" aria-hidden="true" />}
    </div>
  )
}

function Location() {
  return (
    <section className="location wrap" id="ubicacion" aria-labelledby="ubicacion-title">
      <div className="section-head" data-reveal>
        <h2 id="ubicacion-title">Dónde estamos</h2>
        <p>{copy.locationLead}</p>
      </div>
      <div className="location-grid" data-reveal>
        <div className="map-shell">
          <LazyMap />
        </div>
        <div className="location-card glass">
          <p className="address">
            {studio.address}
            <br />
            <span>{studio.city}</span>
          </p>
          <dl className="hours">
            {studio.hours.map(([d, h]) => (
              <div key={d}>
                <dt>{d}</dt>
                <dd>{h}</dd>
              </div>
            ))}
          </dl>
          <a className="btn btn-clay btn-block" href={studio.mapsUrl} target="_blank" rel="noreferrer">
            Cómo llegar en Google Maps
          </a>
          <a className="btn btn-glass btn-block" href={WHATSAPP} target="_blank" rel="noreferrer">
            WhatsApp {studio.phone}
          </a>
        </div>
      </div>
    </section>
  )
}

const YEAR = new Date().getFullYear()
// Quién desarrolló la app (aparece bajo el logo del pie de página)
const DEVELOPER = 'Zenit Labs'

function Footer() {
  return (
    <footer className="footer">
      <div className="wrap">
        <img className="mark" src={studio.logo.light} alt={studio.logo.alt} loading="lazy" />
        <p className="footer-dev">Desarrollado por <b>{DEVELOPER}</b></p>
        <div className="footer-cols">
          <nav aria-label="Secciones">
            <a href="#clases">Clases y planes</a>
            <a href="#horario">Horario</a>
            <a href="#instructoras">Instructoras</a>
            <a href="#esencia">Nuestra esencia</a>
            <a href="#estudio">El estudio</a>
            <a href="#videos">Videos</a>
            <a href="#ubicacion">Ubicación</a>
          </nav>
          <div>
            <p>{studio.address}<br />{studio.city}</p>
            <p>
              <a href={WHATSAPP} target="_blank" rel="noreferrer">WhatsApp {studio.phone}</a>
            </p>
            <p className="footer-social">
              {SOCIAL.map(([name, href]) => <a key={name} href={href} target="_blank" rel="noreferrer">{name}</a>)}
            </p>
          </div>
          <p className="credits">Imágenes: {credits.join(' · ')}.</p>
        </div>
        <div className="footer-last">
          <p>© {YEAR} {studio.name}</p>
          <LegalLinks />
          <a className="btn btn-small btn-light" href="#inicio">Volver arriba</a>
        </div>
      </div>
    </footer>
  )
}

export default function App() {
  const [openId, setOpenId] = useState(null)
  useReveal()
  const coaches = useCoaches()
  const people = coaches ?? instructors
  const byPerson = byId(people)
  const scheduled = useSchedule()
  // Con las coaches del backend, cada clase apunta a su coach real
  const slots = coaches ? scheduled.map((c) => (c.coachId ? { ...c, instructor: c.coachId } : c)) : scheduled
  const next = nextSlot(slots)

  return (
    <>
      <a className="skip" href="#horario">Saltar al horario</a>
      <Blobs />
      <Header />
      <main>
        <Hero next={next} />
        <Marquee />
        <About people={people} onOpen={setOpenId} />
        <Classes />
        <Schedule slots={slots} people={byPerson} onOpenInstructor={setOpenId} />
        <Instructors people={people} slots={slots} onOpen={setOpenId} />
        <Essence />
        <Gallery />
        <Demos />
        <Location />
      </main>
      <Footer />
      <InstructorDialog
        person={openId ? byPerson[openId] ?? null : null}
        classes={classesOf(slots, openId).sort((a, b) => a.day - b.day || sortByTime(a, b))}
        days={DAYS}
        renderPortrait={(p) => <Portrait person={p} className="dialog-photo" />}
        onClose={() => setOpenId(null)}
      />
    </>
  )
}
