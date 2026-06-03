import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './i18n/i18n'
import App from './App.tsx'
import { reportClientError } from './services/LogService'

// Capture uncaught runtime errors + unhandled promise rejections and report them
// to the central log (best-effort, throttled/deduped inside reportClientError).
window.addEventListener('error', (e) => {
  reportClientError(e.message || 'Uncaught error', e.error?.stack ?? `${e.filename}:${e.lineno}:${e.colno}`)
})
window.addEventListener('unhandledrejection', (e) => {
  const reason = e.reason
  reportClientError(
    (reason?.message ?? String(reason ?? 'Unhandled rejection')).slice(0, 500),
    reason?.stack,
  )
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
