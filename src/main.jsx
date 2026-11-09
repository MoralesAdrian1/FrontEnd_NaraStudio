import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import '@brand/theme.css'
import App from './Landing.jsx'
import { Account, Login, ResetPassword } from './auth/AuthPages.jsx'
import { ConsentBanner, LegalPage } from './legal/Legal.jsx'

const legal = (doc) => () => <LegalPage doc={doc} />

// Pocas páginas: basta con elegir por la ruta
const pages = {
  '/entrar': Login,
  '/cuenta': Account,
  '/restablecer': ResetPassword,
  '/terminos': legal('terminos'),
  '/privacidad': legal('privacidad'),
  '/cookies': legal('cookies'),
}
const Page = pages[window.location.pathname.replace(/\/$/, '')] ?? App

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Page />
    <ConsentBanner />
  </StrictMode>,
)
