import { studio } from '@brand/studio.js'
import { Section } from './ui.jsx'

/** Grupo de WhatsApp del estudio: avisos, cambios de horario y comunidad. */
export default function Community() {
  return (
    <div className="p-stack">
      <Section title="Grupo de WhatsApp">
        <div className="p-community">
          <svg viewBox="0 0 24 24" aria-hidden="true" className="p-community-icon">
            <path fill="currentColor" d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2a8.2 8.2 0 0 1-4.2-1.1l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.2-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c1.7.7 2.3.8 3.2.6.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.2-1.2-.1-.1-.3-.2-.5-.3Z" />
          </svg>
          <div className="p-stack">
            <p>
              Únete al grupo de {studio.name} para enterarte de avisos, cambios de horario, clases especiales y todo lo que pasa en el estudio.
            </p>
            <div className="p-actions">
              <a className="btn btn-clay" href={studio.whatsappGroup} target="_blank" rel="noopener noreferrer">Unirme al grupo</a>
            </div>
          </div>
        </div>
      </Section>
    </div>
  )
}
