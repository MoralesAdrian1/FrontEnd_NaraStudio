import { lazy, Suspense, useEffect } from 'react'
import { interceptLinks, usePath } from './lib/nav.js'

// Cada página es un archivo aparte: la landing no descarga el panel, ni el panel la landing
const Landing = lazy(() => import('./Landing.jsx'))
const auth = () => import('./auth/AuthPages.jsx')
const Login = lazy(() => auth().then((m) => ({ default: m.Login })))
const Account = lazy(() => auth().then((m) => ({ default: m.Account })))
const ResetPassword = lazy(() => auth().then((m) => ({ default: m.ResetPassword })))
const LegalPage = lazy(() => import('./legal/Legal.jsx').then((m) => ({ default: m.LegalPage })))

const legal = (doc) => () => <LegalPage doc={doc} />
const pages = {
  '/': Landing,
  '/entrar': Login,
  '/cuenta': Account,
  '/restablecer': ResetPassword,
  '/terminos': legal('terminos'),
  '/privacidad': legal('privacidad'),
  '/cookies': legal('cookies'),
  '/reembolsos': legal('reembolsos'),
}

export default function Router() {
  const path = usePath()
  useEffect(() => interceptLinks((p) => p.replace(/(.)\/$/, '$1') in pages), [])
  const Page = pages[path] ?? Landing
  return (
    // Mientras llega el código de la página: el fondo de la marca, sin parpadeos
    <Suspense fallback={<div className="page-loading" aria-busy="true" />}>
      <Page key={path} />
    </Suspense>
  )
}
