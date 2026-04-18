export const THEME_STORAGE_KEY = 'sms-theme'

/** @typedef {'light' | 'dark' | 'system'} ThemePreference */

/** @returns {ThemePreference} */
export function readThemePreference() {
  try {
    const raw = localStorage.getItem(THEME_STORAGE_KEY)
    if (raw === 'light' || raw === 'dark' || raw === 'system') return raw
  } catch {
    /* ignore */
  }
  return 'system'
}

/** @param {ThemePreference} value */
export function writeThemePreference(value) {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, value)
  } catch {
    /* ignore */
  }
}
