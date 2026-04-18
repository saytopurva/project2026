import { createContext } from 'react'

/** Holds auth state; consumed via `useAuth` in `src/hooks/useAuth.js`. */
export const AuthContext = createContext(null)
