import { ToastContainer } from 'react-toastify'
import { useTheme } from '../hooks/useTheme'

/**
 * Global toast host — use `notify` from `src/utils/notify.js` in pages/components.
 */
export function ToastHost() {
  const { resolved } = useTheme()
  return (
    <ToastContainer
      position="top-right"
      autoClose={3400}
      hideProgressBar={false}
      newestOnTop
      closeOnClick
      pauseOnHover
      draggable
      theme={resolved === 'dark' ? 'dark' : 'light'}
      toastClassName="rounded-2xl border border-slate-200/80 shadow-lg dark:border-slate-600"
    />
  )
}
