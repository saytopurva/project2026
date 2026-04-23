import App from './App.jsx'
import { ThemeProvider } from './context/ThemeProvider.jsx'

/** Theme + app — used from `main.jsx` (keeps Fast Refresh / ESLint happy). */
export function AppRoot() {
  return (
    <ThemeProvider>
      <App />
    </ThemeProvider>
  )
}
