import { useEffect, useState } from 'react'
import { clock, shortDate, studioTime, whenLabel } from '../lib/time.js'
import { Empty, Notice } from './ui.jsx'
import { useLoad } from './hooks.js'
import Roster from './Roster.jsx'

const MINUTE = 60_000

/** La hora actual, al minuto: la clase pasa de "empieza en" a "en curso" sin recargar. */
function useClock() {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), MINUTE / 2)
    return () => clearInterval(id)
  }, [])
  return now
}

/** "En curso", "Empieza en 25 min" o "Hoy · 6:00 p.m." */
function statusOf(s, now) {
  const start = Date.parse(s.startsAt)
  if (start <= now) return { live: true, text: `En curso · termina ${clock(studioTime(s.endsAt))}` }
  const mins = Math.round((start - now) / MINUTE)
  if (mins <= 90) return { live: false, text: `Empieza en ${mins} min` }
  return { live: false, text: `${whenLabel(s.date)} · ${shortDate(s.date)}` }
}

/**
 * Pantalla propia para la clase que está por empezar (o en curso): su desglose, la lista para
 * confirmar asistencia y cobrar, y el botón para agregar a quien llegó sin reservar.
 */
export default function NextClass({ me }) {
  const sessions = useLoad('/sessions')
  const now = useClock()
  // Al terminar la clase pasa a la siguiente
  const next = (sessions.data ?? []).find(
    (s) => s.coach.id === me.coach?.id && s.status === 'scheduled' && Date.parse(s.endsAt) > now,
  )

  if (sessions.loading) return <p className="p-meta">Buscando tu próxima clase…</p>
  if (!next) {
    return (
      <div className="p-stack">
        <Notice>{sessions.error}</Notice>
        {!sessions.error && <Empty>No tienes clases en las próximas dos semanas.</Empty>}
      </div>
    )
  }

  const status = statusOf(next, now)
  return (
    <div className="p-stack">
      <section className={`p-section glass p-next ${status.live ? 'is-live' : ''}`} aria-labelledby="next-title">
        <p className="p-next-status">
          {status.live && <span className="pulse" aria-hidden="true" />} {status.text}
        </p>
        <h2 id="next-title">{next.class.name}</h2>
        <dl className="p-next-facts">
          <div><dt>Horario</dt><dd>{clock(next.time)} – {clock(studioTime(next.endsAt))}</dd></div>
          <div><dt>Disciplina</dt><dd>{next.discipline.name}</dd></div>
          <div><dt>Lugares</dt><dd>{next.booked} de {next.capacity}</dd></div>
          {!next.recurring && <div><dt>Tipo</dt><dd>Clase suelta</dd></div>}
        </dl>
      </section>

      <section className="p-section glass" aria-labelledby="next-list">
        <h2 id="next-list">Lista de alumnas</h2>
        <Roster key={next.id} sessionId={next.id} onChange={sessions.reload} addInDialog />
      </section>
    </div>
  )
}
