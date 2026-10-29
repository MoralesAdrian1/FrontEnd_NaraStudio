import { DAYS, studioDate } from '../lib/time.js'
import { Empty, Notice, Section } from './ui.jsx'
import { useLoad } from './hooks.js'

const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
const DAY_LABEL = { attended: 'fuiste', missed: 'faltaste', rest: 'descanso', pending: 'te toca hoy' }
const monthName = (month) => MONTHS[Number(month.slice(5, 7)) - 1]

export function FlameIcon() {
  return (
    <svg viewBox="0 0 64 80" aria-hidden="true">
      <path className="flame-outer" d="M32 2C36 18 54 26 54 50a22 22 0 0 1-44 0c0-12 6-19 11-25 1 8 4 12 8 14C27 26 26 14 32 2Z" />
      <path className="flame-inner" d="M32 40c3 7 11 11 11 20a11 11 0 0 1-22 0c0-5 3-9 6-12 0 4 2 6 4 7-1-6-1-10 1-15Z" />
    </svg>
  )
}

/** Insignia de la barra: la flamita con los días seguidos; lleva a "Mi racha". */
export function StreakBadge({ streak, onOpen }) {
  const lit = streak?.unlocked && streak.current > 0
  const n = streak?.current ?? 0
  const label = !streak ? 'Mi racha' : streak.unlocked ? `Racha de ${n} ${n === 1 ? 'día' : 'días'}. Ver mi racha` : 'Racha bloqueada. Ver mi racha'
  return (
    <button className={`p-badge ${lit ? 'is-lit' : ''}`} onClick={onOpen} aria-label={label} title={label}>
      <FlameIcon />
      <b>{streak ? n : '–'}</b>
    </button>
  )
}

/** La alumna: su racha (la flamita), sus últimos días y los reconocimientos del mes. */
export default function Progress() {
  const progress = useLoad('/progress/me')
  const p = progress.data
  return (
    <div className="p-stack">
      <Section title="Mi racha">
        <Notice>{progress.error}</Notice>
        {progress.loading && <p className="p-meta">Cargando tu racha…</p>}
        {p && <Streak p={p} />}
      </Section>
      <Leaderboard />
    </div>
  )
}

function Streak({ p }) {
  const lit = p.unlocked && p.current > 0
  const today = studioDate()
  return (
    <div className="p-streak">
      <div className={`p-flame ${lit ? 'is-lit' : ''} ${p.unlocked ? '' : 'is-locked'}`} role="img" aria-label={`Racha de ${p.current} ${p.current === 1 ? 'día' : 'días'}`}>
        <FlameIcon />
        <b>{p.current}</b>
      </div>
      <div className="p-streak-text">
        {p.unlocked ? (
          <>
            <h3>{p.current === 0 ? 'Enciende tu racha' : `${p.current} ${p.current === 1 ? 'día seguido' : 'días seguidos'}`}</h3>
            <p>
              {p.attendedToday
                ? 'Hoy ya entrenaste. ¡Así se hace!'
                : p.current > 0
                  ? 'Ve a clase en tu siguiente día de entrenamiento para no perderla.'
                  : 'Asiste a una clase para prenderla. Los fines de semana y los días sin clases no la rompen.'}
            </p>
          </>
        ) : (
          <>
            <h3>Tu racha está bloqueada</h3>
            <p>Se activa con un plan de más de una clase: mensual, semanal o paquete. <a href="#membresias">Ver planes</a></p>
          </>
        )}
        <dl className="p-streak-facts">
          <div><dt>Mejor racha</dt><dd>{p.best}</dd></div>
          <div><dt>Este mes</dt><dd>{p.monthDays} {p.monthDays === 1 ? 'día' : 'días'}</dd></div>
          <div><dt>En total</dt><dd>{p.totalDays}</dd></div>
        </dl>
      </div>
      <ol className="p-strip" aria-label="Tus últimos 14 días">
        {p.days.map((d) => (
          <li key={d.date} className={`is-${d.state} ${d.date === today ? 'is-today' : ''}`} title={`${DAYS[new Date(`${d.date}T12:00:00Z`).getUTCDay()]} ${Number(d.date.slice(8))}: ${DAY_LABEL[d.state]}`}>
            <span>{DAYS[new Date(`${d.date}T12:00:00Z`).getUTCDay()].slice(0, 1)}</span>
            <small>{Number(d.date.slice(8))}</small>
            <span className="sr-only">{DAY_LABEL[d.state]}</span>
          </li>
        ))}
      </ol>
      <ul className="p-legend" aria-hidden="true">
        <li className="is-attended">Fuiste</li>
        <li className="is-missed">Faltaste</li>
        <li className="is-rest">Descanso</li>
      </ul>
    </div>
  )
}

/** Tabla del mes: quién ha ido más días. Se actualiza cada noche. */
export function Leaderboard() {
  const board = useLoad('/progress/leaderboard')
  const b = board.data
  return (
    <Section title={b ? `Reconocimientos de ${monthName(b.month)}` : 'Reconocimientos del mes'}>
      <Notice>{board.error}</Notice>
      {b && b.entries.length === 0 && <Empty>Este mes todavía nadie ha asistido a clase. ¡Sé la primera!</Empty>}
      {b && b.entries.length > 0 && (
        <>
          <p className="auth-help">Días distintos con asistencia este mes. Los empates comparten lugar. Se actualiza cada noche.</p>
          <ol className="p-board">
            {b.entries.map((e, i) => (
              <li key={i} className={`${e.isMe ? 'is-me' : ''} ${e.position <= 3 ? `is-top is-${e.position}` : ''}`}>
                <span className="p-board-pos">{e.position}</span>
                <span className="p-board-name">{e.name}{e.isMe && <small> · tú</small>}</span>
                <span className="p-board-days"><b>{e.days}</b> <small>{e.days === 1 ? 'día' : 'días'}</small></span>
              </li>
            ))}
          </ol>
          {b.me && !b.entries.some((e) => e.isMe) && (
            <p className="p-meta">Tú vas en el lugar {b.me.position} con {b.me.days} {b.me.days === 1 ? 'día' : 'días'}.</p>
          )}
        </>
      )}
    </Section>
  )
}
