import { useCallback, useEffect, useMemo, useState } from 'react'
import { ThemeContext } from './themeContext'
import { readThemePreference, writeThemePreference } from '../utils/themeStorage'

function getSystemDark() {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

function applyHtmlClass(resolvedDark) {
  const root = document.documentElement
  if (resolvedDark) root.classList.add('dark')
  else root.classList.remove('dark')
  root.style.colorScheme = resolvedDark ? 'dark' : 'light'
}

/**
 * Persists light / dark / system preference and toggles `html.dark` for Tailwind.
 */
export function ThemeProvider({ children }) {
  const [preference, setPreferenceState] = useState(() => readThemePreference())
  const [systemDark, setSystemDark] = useState(getSystemDark)

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => setSystemDark(mq.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  const resolved = useMemo(() => {
    if (preference === 'dark') return 'dark'
    if (preference === 'light') return 'light'
    return systemDark ? 'dark' : 'light'
  }, [preference, systemDark])

  useEffect(() => {
    applyHtmlClass(resolved === 'dark')
  }, [resolved])

  const setPreference = useCallback((next) => {
    writeThemePreference(next)
    setPreferenceState(next)
  }, [])

  const value = useMemo(
    () => ({
      preference,
      setPreference,
      resolved,
    }),
    [preference, setPreference, resolved]
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}
