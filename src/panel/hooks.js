import { useCallback, useEffect, useState } from 'react'
import { api } from '../lib/api.js'
import { notify } from '../lib/feedback.js'

/** Carga datos de la API; reload() vuelve a pedirlos. Sin path no carga nada. */
export function useLoad(path) {
  const [state, setState] = useState({ data: null, error: '', loading: !!path })
  const [tick, setTick] = useState(0)
  useEffect(() => {
    if (!path) return undefined
    let alive = true
    api(path)
      .then((data) => alive && setState({ data, error: '', loading: false }))
      .catch((e) => alive && setState({ data: null, error: e.message, loading: false }))
    return () => {
      alive = false
    }
  }, [path, tick])
  const reload = useCallback(() => setTick((t) => t + 1), [])
  return { ...state, reload }
}

/**
 * Ejecuta una acción con estado de "cargando" y avisa al terminar: un aviso de éxito
 * (success: texto o función del resultado; false = sin aviso) o de error.
 */
export function useAction() {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const run = async (fn, success = '') => {
    setBusy(true)
    setError('')
    setInfo('')
    try {
      const result = await fn()
      if (success !== false) notify('ok', (typeof success === 'function' ? success(result) : success) || 'Listo.')
      return result
    } catch (e) {
      setError(e.message)
      notify('error', e.message)
      return undefined
    } finally {
      setBusy(false)
    }
  }
  return { busy, error, info, run, setError }
}

/** La hora al montar el componente (para comparar sin llamar a Date en cada render). */
export const useNow = () => useState(() => Date.now())[0]
