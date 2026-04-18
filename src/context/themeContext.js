import { createContext } from 'react'

/**
 * @typedef {import('../utils/themeStorage').ThemePreference} ThemePreference
 * @typedef {{ preference: ThemePreference, setPreference: (v: ThemePreference) => void, resolved: 'light' | 'dark' }} ThemeContextValue
 */

/** @type {import('react').Context<ThemeContextValue | null>} */
export const ThemeContext = createContext(null)
