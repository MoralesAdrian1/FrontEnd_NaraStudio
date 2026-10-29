import { useEffect, useRef, useState } from 'react'
import './App.css'
import { combo, credits, demos, disciplines, gallery, instructors, mission, philosophy, schedule, studio, vision } from './data/studio.js'
import InstructorDialog from './components/InstructorDialog.jsx'
import StudioMap from './components/StudioMap.jsx'
import { supabase } from './lib/supabase.js'
import { api } from './lib/api.js'
import { addDays, clock, DAYS, studioDate, studioDateTime, weekdayOf, whenLabel } from './lib/time.js'
import Avatar from './components/Avatar.jsx'

const byId = (list) => Object.fromEntries(list.map((x) => [x.id, x]))
const INSTRUCTOR = byId(instructors)
// Perfil público (studio.js) de quien imparte cada disciplina
const PROFILE_BY_DISCIPLINE = { barre: 'nadia', trampolin: 'juana' }
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
    const items = document.querySelectorAll('[data-reveal]')
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
    items.forEach((el) => io.observe(el))
    return () => io.disconnect()
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
const WA = wa('Hola Nara, quiero reservar mi primera clase.')
const money = (n) => `$${n.toLocaleString('es-MX')}`

function Header() {
  const [signedIn, setSignedIn] = useState(false)
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSignedIn(!!data.session))
    const { data } = supabase.auth.onAuthStateChange((_, session) => setSignedIn(!!session))
    return () => data.subscription.unsubscribe()
  }, [])
  return (
    <header className="bar">
      <div className="bar-inner glass">
        <a className="logo" href="#inicio">
          <img src="/img/nara-logo-dark.png" alt="Nara Studio, habita tu cuerpo" width="160" height="72" />
        </a>
        <nav aria-label="Principal">
          <a href="#clases">Clases</a>
          <a href="#horario">Horario</a>
          <a href="#instructoras">Instructoras</a>
          <a href="#ubicacion">Ubicación</a>
        </nav>
        <a className="btn btn-glass btn-small" href={signedIn ? '/cuenta' : '/entrar'}>{signedIn ? 'Mi cuenta' : 'Entrar'}</a>
        <a className="btn btn-clay btn-small" href={WA} target="_blank" rel="noreferrer">Reservar</a>
      </div>
    </header>
  )
}

function Hero({ next }) {
  return (
    <section className="hero wrap" id="inicio">
      <div className="hero-copy" data-reveal>
        <p className="hero-name">{studio.name} · {studio.tagline}</p>
        <h1>Habita tu cuerpo</h1>
        <p className="lead">
          Un espacio de movimiento, bienestar y conexión personal en Dolores Hidalgo, para que cada
          mujer fortalezca su cuerpo y disfrute su proceso.
        </p>
        <div className="actions">
          <a className="btn btn-clay" href={WA} target="_blank" rel="noreferrer">Reserva tu primera clase</a>
          <a className="btn btn-glass" href="#horario">Ver horario</a>
        </div>
      </div>

      <div className="hero-visual">
        <div className="hero-ring" aria-hidden="true" />
        <div className="hero-photo arch shutter">
          <img
            src="/img/dancers-practicing-at-the-barre.jpg"
            alt="Pintura de Degas: dos bailarinas estiran la pierna sobre la barra de ensayo"
            loading="eager"
          />
        </div>
        {next && (
          <div className="next-card glass float-a">
            <strong>{next.name}</strong>
            <span className="next-when"><span className="pulse" />
              {whenLabel(next.date)} · {clock(next.time)} · con {next.coachName.split(' ')[0]}
            </span>
          </div>
        )}
        <span className="chip-clay chip-1 float-b">Barre · 60 min</span>
        <span className="chip-clay chip-2 float-a">Trampolín · 60 min</span>
      </div>
    </section>
  )
}

function Marquee() {
  const words = ['Barre', 'Sculpt', 'Jump', 'Habita tu cuerpo', 'Fortalece tu esencia', 'Honra tu proceso', 'Crece a tu manera']
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

function About({ onOpen }) {
  const founder = instructors.find((p) => p.quote)
  return (
    <section className="about wrap" id="nosotras" aria-labelledby="about-title">
      <div className="about-panel glass" data-reveal>
        <div className="about-photo arch">
          <img src="/img/ballet-at-the-paris-opera.jpg" alt="Pastel de Degas: bailarinas en escena en la Ópera de París" loading="lazy" />
        </div>
        <div className="about-text">
          <h2 id="about-title">Más que un estudio, somos una familia</h2>
          <ul className="motto">
            <li className="clay-card">Habita tu cuerpo.</li>
            <li className="clay-card rose">Honra tu proceso.</li>
            <li className="clay-card sand">Crece a tu manera.</li>
          </ul>
          {founder && (
            <figure className="founder clay-card rose">
              <Portrait person={founder} className="founder-photo" />
              <div>
                <blockquote>«{founder.quote}»</blockquote>
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
    : { href: wa(`Hola Nara, quiero ${what} (${money(p.price)}).`), target: '_blank', rel: 'noreferrer' }

function Classes() {
  const live = usePlans()
  const shownCombo = live?.combo ?? combo
  return (
    <section className="classes wrap" id="clases" aria-labelledby="clases-title">
      <div className="section-head" data-reveal>
        <h2 id="clases-title">Clases y planes</h2>
        <p>Clases de 60 minutos, de lunes a viernes. Elige el plan que va con tu ritmo.</p>
      </div>

      <div className="disc-grid">
        {disciplines.map((d, i) => (
          <article className={`disc clay-card ${i ? 'rose' : ''}`} key={d.id} data-reveal>
            <div className="disc-photo">
              <img src={d.image} alt={d.imageAlt} loading="lazy" />
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
                    <p className="in-nara"><b>En Nara:</b> {st.inNara}</p>
                  </div>
                ))}
              </div>
              <ul className="chips">
                {d.details.slice(1).map((x) => <li key={x}>{x}</li>)}
              </ul>
              <ul className="plans" aria-label={`Planes de ${d.name}`}>
                {(live?.byDiscipline[d.id] ?? d.plans).map((p) => (
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

      <div className="combo" data-reveal>
        <div>
          <h3>{shownCombo.label}</h3>
          <p>Las dos disciplinas, todas las clases que quieras.</p>
        </div>
        <b>{money(shownCombo.price)}</b>
        <a className="btn btn-light" {...wantLink(shownCombo, `el plan ${shownCombo.label}`)}>
          Lo quiero
        </a>
      </div>
    </section>
  )
}

const kind = (c) => (c.name === 'Barre Restore' ? 'restore' : c.discipline)

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

function Schedule({ slots, onOpenInstructor }) {
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
          <li className="k-barre">Barre & Sculpt</li>
          <li className="k-restore">Barre Restore</li>
          <li className="k-trampolin">Jump (trampolín)</li>
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
              const who = INSTRUCTOR[c.instructor]
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

        <p className="motto-line">Mueve tu cuerpo, transforma tu día</p>
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

function Instructors({ slots, onOpen }) {
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
        <h2 id="team-title">Nuestras instructoras</h2>
        <p>Pasa el cursor o desliza entre las tarjetas. Abre su perfil para ver sus horarios y más sobre ella.</p>
      </div>
      <div className="team-grid" ref={track} onScroll={onScroll}>
        {instructors.map((p) => <InstructorCard key={p.id} person={p} slots={slots} onOpen={onOpen} />)}
      </div>
      <div className="team-dots" role="group" aria-label="Elegir instructora">
        {instructors.map((p, i) => (
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
        <h2 id="esencia-title">Volver a ti a través del movimiento</h2>
        <p>
          Un lugar donde la fuerza física se encuentra con el bienestar personal. Entrenar no tiene que
          ser un castigo ni una obligación: puede ser un acto de amor propio, disciplina, constancia y
          conexión contigo.
        </p>
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
      <p className="essence-line" data-reveal>Habita tu cuerpo, fortalece tu esencia.</p>
    </section>
  )
}

function Gallery() {
  return (
    <section className="gallery wrap" id="estudio" aria-labelledby="estudio-title">
      <div className="section-head" data-reveal>
        <h2 id="estudio-title">Conoce el estudio</h2>
        <p>
          Una sala amplia con barra de pared a pared, espejos y trampolines individuales. Ven a una
          clase muestra o pasa a conocernos en horario de recepción.
        </p>
      </div>
      <div className="bento">
        {gallery.map((g, i) => (
          <figure key={g.src} className={`tile tile-${i}`} data-reveal>
            <img src={g.src} alt={g.alt} loading="lazy" />
            <figcaption className="glass">{g.caption}</figcaption>
          </figure>
        ))}
        <div className="tile tile-facts clay-card rose" data-reveal>
          <b>60</b>
          <span>minutos por clase, de lunes a viernes.</span>
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
          <p>Un vistazo a la música, el ritmo y el tipo de ejercicio de cada disciplina.</p>
        </div>
        <div className="demo-grid">
          {demos.map((d) => (
            <figure className="demo" key={d.id} data-reveal>
              {d.src ? (
                <video controls preload="none" poster={d.poster} playsInline>
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

function Location() {
  return (
    <section className="location wrap" id="ubicacion" aria-labelledby="ubicacion-title">
      <div className="section-head" data-reveal>
        <h2 id="ubicacion-title">Dónde estamos</h2>
        <p>A tres cuadras al sur de la parroquia de Nuestra Señora de los Dolores.</p>
      </div>
      <div className="location-grid" data-reveal>
        <div className="map-shell">
          <StudioMap />
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
        </div>
      </div>
    </section>
  )
}

const YEAR = new Date().getFullYear()

function Footer() {
  return (
    <footer className="footer">
      <div className="wrap">
        <img className="mark" src="/img/nara-logo-light.png" alt="Nara Studio, habita tu cuerpo" loading="lazy" />
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
            <p><a href={studio.instagram} target="_blank" rel="noreferrer">Instagram</a></p>
          </div>
          <p className="credits">Imágenes: {credits.join(' · ')}.</p>
        </div>
        <div className="footer-last">
          <p>© {YEAR} Nara Studio</p>
          <a className="btn btn-small btn-light" href="#inicio">Volver arriba</a>
        </div>
      </div>
    </footer>
  )
}

export default function App() {
  const [openId, setOpenId] = useState(null)
  useReveal()
  const slots = useSchedule()
  const next = nextSlot(slots)

  return (
    <>
      <a className="skip" href="#horario">Saltar al horario</a>
      <Blobs />
      <Header />
      <main>
        <Hero next={next} />
        <Marquee />
        <About onOpen={setOpenId} />
        <Classes />
        <Schedule slots={slots} onOpenInstructor={setOpenId} />
        <Instructors slots={slots} onOpen={setOpenId} />
        <Essence />
        <Gallery />
        <Demos />
        <Location />
      </main>
      <Footer />
      <InstructorDialog
        person={openId ? INSTRUCTOR[openId] : null}
        classes={classesOf(slots, openId).sort((a, b) => a.day - b.day || sortByTime(a, b))}
        days={DAYS}
        renderPortrait={(p) => <Portrait person={p} className="dialog-photo" />}
        onClose={() => setOpenId(null)}
      />
    </>
  )
}
