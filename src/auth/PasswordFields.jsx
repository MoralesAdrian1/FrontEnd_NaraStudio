import { PASSWORD_RULES as RULES } from '../lib/password.js'

/** Contraseña nueva y su confirmación, con los requisitos a la vista. */
export default function PasswordFields({ password, confirm, onPassword, onConfirm, label = 'Contraseña' }) {
  const mismatch = confirm.length > 0 && confirm !== password
  return (
    <>
      <label>
        {label}
        <input
          type="password"
          required
          minLength={8}
          value={password}
          onChange={(e) => onPassword(e.target.value)}
          autoComplete="new-password"
          aria-describedby="password-rules"
        />
      </label>
      <ul className="auth-rules" id="password-rules" aria-label="Requisitos de la contraseña">
        {RULES.map(([ok, text]) => (
          <li key={text} className={ok(password) ? 'is-ok' : ''}>
            <span aria-hidden="true">{ok(password) ? '✓' : '·'}</span> {text}
          </li>
        ))}
      </ul>
      <label>
        Confirma tu contraseña
        <input
          type="password"
          required
          value={confirm}
          onChange={(e) => onConfirm(e.target.value)}
          autoComplete="new-password"
          aria-invalid={mismatch}
        />
        {mismatch && <small className="auth-field-error">No coincide con la contraseña.</small>}
      </label>
    </>
  )
}
