import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './utils/chartSetup'
import App from './App'     // ← remove .tsx extension (optional but cleaner)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
  <App />
  </StrictMode>,
)
