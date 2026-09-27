import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import './ui/tokens.css'
import App from './App'
import { StoreProvider } from './state/store'

registerSW({ immediate: true })

// Progress lives only in this browser; ask it not to clear the data under storage pressure.
void navigator.storage?.persist?.()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <StoreProvider>
      <App />
    </StoreProvider>
  </StrictMode>,
)
