import { api } from '../lib/api.js'
import { dateTime, planPrice } from './plan-labels.js'
import { Empty, Notice, Section } from './ui.jsx'
import { useAction, useLoad } from './hooks.js'
import { confirmDialog } from '../lib/feedback.js'

/** Solicitudes de pago en efectivo que la coach confirma al recibir el dinero. */
export default function Requests() {
  const list = useLoad('/memberships/requests')
  const action = useAction()

  const approve = async (m) => {
    const price = planPrice({ priceCents: m.pricePaidCents })
    if (!await confirmDialog(`¿Recibiste ${price} en efectivo de ${m.student.fullName}? Se activa su ${m.plan.name}.`)) return
    action.run(async () => {
      await api(`/memberships/${m.id}/approve`, { method: 'POST' })
      list.reload()
    }, `${m.student.fullName}: ${m.plan.name} activada y pago registrado.`)
  }

  const reject = async (m) => {
    if (!await confirmDialog(`¿Rechazar la solicitud de ${m.student.fullName}?`)) return
    action.run(async () => {
      await api(`/memberships/${m.id}/reject`, { method: 'POST' })
      list.reload()
    }, 'Solicitud rechazada.')
  }

  return (
    <div className="p-stack">
      <Section title="Pagos en efectivo por confirmar">
        <p className="auth-help">
          Las alumnas pagan el día que asisten. Lo más fácil es cobrar al pasar lista con “Asistencia y pago”; aquí también puedes
          confirmar si te pagan antes. Confirma solo cuando tengas el dinero en la mano.
        </p>
        <Notice>{list.error || action.error}</Notice>
        {list.data?.length === 0 && <Empty>No hay solicitudes pendientes.</Empty>}
        <ul className="p-requests">
          {list.data?.map((m) => (
            <li key={m.id}>
              <div>
                <b>{m.student.fullName}</b>
                <small>
                  {m.student.phone ? <a href={`tel:${m.student.phone}`}>{m.student.phone}</a> : m.student.email}
                </small>
              </div>
              <div>
                <b>{m.plan.name} · {planPrice({ priceCents: m.pricePaidCents })}</b>
                <small>
                  {m.classSession && `${m.classSession.name}, ${dateTime(m.classSession.startsAt)} · `}
                  {m.bookedClass && `Reservó ${m.bookedClass.name}, ${dateTime(m.bookedClass.startsAt)} · `}
                  {m.classSession || m.bookedClass ? 'paga ese día' : `sin clase reservada · vence ${dateTime(m.requestExpiresAt)}`}
                </small>
              </div>
              <div className="p-actions">
                <button className="btn btn-clay btn-small" onClick={() => approve(m)} disabled={action.busy}>Recibí el efectivo</button>
                <button className="btn btn-glass btn-small" onClick={() => reject(m)} disabled={action.busy}>Rechazar</button>
              </div>
            </li>
          ))}
        </ul>
      </Section>
    </div>
  )
}
