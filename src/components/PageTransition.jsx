import { useLocation } from 'react-router-dom'

/**
 * Subtle route transition — key on pathname retriggers fade-in.
 */
export function PageTransition({ children, className = '' }) {
  const { pathname } = useLocation()
  return (
    <div key={pathname} className={`animate-page-enter ${className}`}>
      {children}
    </div>
  )
}
