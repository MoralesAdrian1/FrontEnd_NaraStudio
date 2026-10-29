import { useEffect, useRef } from 'react'

// 06:50 → 6:50 a.m.
function clock(t) {
  const [h, m] = t.split(':').map(Number)
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h < 12 ? 'a.m.' : 'p.m.'}`
}

export default function InstructorDialog({ person, classes, days, renderPortrait, onClose }) {
  const ref = useRef(null)
  // Una fila por hora y tipo de clase, con sus días
  const groups = []
  for (const c of [...classes].sort((x, y) => x.time.localeCompare(y.time) || x.day - y.day)) {
    const g = groups.find((x) => x.time === c.time && x.name === c.name)
    if (g) g.days.push(c.day)
    else groups.push({ time: c.time, name: c.name, days: [c.day] })
  }

  useEffect(() => {
    const dialog = ref.current
    if (person && !dialog.open) dialog.showModal()
    if (!person && dialog.open) dialog.close()
  }, [person])

  return (
    <dialog
      ref={ref}
      className="profile"
      onClose={onClose}
      onClick={(e) => e.target === ref.current && ref.current.close()}
      aria-labelledby="profile-name"
    >
      {person && (
        <div className="profile-inner">
          <button className="profile-close" onClick={() => ref.current.close()} aria-label="Cerrar perfil">
            Cerrar
          </button>
          <div className="profile-head">
            {renderPortrait(person)}
            <div>
              <h2 id="profile-name">{person.name}</h2>
              <p className="profile-role">{person.role}</p>
              <p>{person.short}</p>
            </div>
          </div>

          {person.bio && (
            <div className="profile-story">
              <h3>Su historia</h3>
              {person.bio.map((p) => <p key={p.slice(0, 24)}>{p}</p>)}
              {person.approach && <p>{person.approach}</p>}
              {person.quote && <blockquote className="quote">«{person.quote}»</blockquote>}
            </div>
          )}

          <div className="profile-cols">
            <div>
              <h3>Sus horarios</h3>
              <ul className="profile-slots">
                {groups.map((g) => (
                  <li key={g.time + g.name}>
                    <b>{clock(g.time)}</b>
                    <span>{g.name}</span>
                    <span>{g.days.map((d) => days[d].slice(0, 3)).join(', ')}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              {person.experience.length > 0 && (
                <>
                  <h3>Experiencia</h3>
                  <ul className="dots">
                    {person.experience.map((x) => <li key={x}>{x}</li>)}
                  </ul>
                </>
              )}
              {person.certificates.length > 0 && (
                <>
                  <h3>Certificaciones</h3>
                  <ul className="docs">
                    {person.certificates.map((c) => (
                      <li key={c.title}>
                        {c.file ? (
                          <a href={c.file} target="_blank" rel="noreferrer">
                            {c.title} <span>PDF</span>
                          </a>
                        ) : (
                          <div>{c.title} <span>Certificada</span></div>
                        )}
                      </li>
                    ))}
                  </ul>
                </>
              )}
              {person.social.length > 0 && (
                <>
                  <h3>Redes</h3>
                  <p className="social">
                    {person.social.map((s) => (
                      <a key={s.label} href={s.url} target="_blank" rel="noreferrer">{s.label}</a>
                    ))}
                  </p>
                </>
              )}
              {!person.experience.length && !person.certificates.length && (
                <>
                  <h3>Trayectoria</h3>
                  <p>Muy pronto compartiremos aquí su experiencia y sus certificaciones.</p>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </dialog>
  )
}
