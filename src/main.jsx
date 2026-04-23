import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { GoogleOAuthProvider } from '@react-oauth/google'
import './index.css'
import { AppRoot } from './AppRoot.jsx'

// Trim — stray spaces in .env break GIS and token verification.
const googleClientId = (import.meta.env.VITE_GOOGLE_CLIENT_ID || '').trim()

/**
 * Note: We avoid <StrictMode> here because Google Identity Services
 * `google.accounts.id.initialize()` does not tolerate React 18 dev double-mounting
 * (button render / One Tap can break or log errors).
 */
createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    {googleClientId ? (
      <GoogleOAuthProvider clientId={googleClientId}>
        <AppRoot />
      </GoogleOAuthProvider>
    ) : (
      <AppRoot />
    )}
  </BrowserRouter>,
)
