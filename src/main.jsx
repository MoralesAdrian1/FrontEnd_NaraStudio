import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Mantenimiento: cualquier ruta muestra la landing; la cuenta y el panel no están disponibles
if (window.location.pathname !== '/') window.history.replaceState(null, '', '/')
const Page = App

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Page />
  </StrictMode>,
)
