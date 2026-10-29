import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { Account, Login, ResetPassword } from './auth/AuthPages.jsx'

// Pocas páginas: basta con elegir por la ruta
const pages = { '/entrar': Login, '/cuenta': Account, '/restablecer': ResetPassword }
const Page = pages[window.location.pathname.replace(/\/$/, '')] ?? App

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Page />
  </StrictMode>,
)
