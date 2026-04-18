import { useEffect, useRef, useState } from 'react'
import { ChevronDown, LogOut, UserRound } from 'lucide-react'
import { ThemeSegmented } from './ThemeSegmented'

/**
 * Top bar: page title + profile menu (logout).
 */
export function Navbar({ title, user, onLogout }) {
  const [open, setOpen] = useState(false)
  const menuRef = useRef(null)

  useEffect(() => {
    if (!open) return
    const close = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setOpen(false)
    }
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', close)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', close)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <header className="sticky top-0 z-30 flex h-16 min-w-0 shrink-0 items-center gap-3 border-b border-slate-200/90 bg-white/90 px-4 shadow-sm backdrop-blur-md dark:border-slate-700/90 dark:bg-slate-900/90 dark:shadow-slate-950/20 sm:gap-4 sm:px-6">
      <div className="min-w-0 flex-1">
        <h1 className="truncate text-base font-semibold tracking-tight text-slate-900 sm:text-lg dark:text-slate-100">
          {title}
        </h1>
        <p className="hidden truncate text-xs text-slate-500 sm:block dark:text-slate-400">
          {new Date().toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          })}
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-2 sm:gap-3">
        <ThemeSegmented variant="compact" />

        <div className="hidden min-w-0 max-w-[min(200px,28vw)] text-right lg:block">
          <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">{user?.name}</p>
          <p className="truncate text-xs text-slate-500 dark:text-slate-400">{user?.email}</p>
        </div>

        <div className="relative shrink-0" ref={menuRef}>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="flex items-center gap-2 rounded-2xl border border-slate-200/90 bg-slate-50/80 py-1.5 pl-1.5 pr-2.5 text-left transition hover:border-sky-200 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/40 dark:border-slate-600 dark:bg-slate-800/80 dark:hover:border-sky-600 dark:hover:bg-slate-800"
            aria-expanded={open}
            aria-haspopup="menu"
          >
            {user?.photoURL ? (
              <img
                src={user.photoURL}
                alt=""
                className="h-9 w-9 rounded-xl border border-white object-cover shadow-sm dark:border-slate-600"
              />
            ) : (
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-indigo-500 text-sm font-semibold text-white shadow-sm">
                {(user?.name || '?').charAt(0).toUpperCase()}
              </span>
            )}
            <UserRound
              className="hidden h-4 w-4 text-slate-400 sm:block dark:text-slate-500"
              strokeWidth={1.75}
              aria-hidden
            />
            <ChevronDown
              className={`h-4 w-4 text-slate-400 transition-transform dark:text-slate-500 ${open ? 'rotate-180' : ''}`}
              strokeWidth={1.75}
              aria-hidden
            />
          </button>

          {open ? (
            <div
              role="menu"
              className="absolute right-0 mt-2 w-52 origin-top-right rounded-2xl border border-slate-200/90 bg-white py-1 shadow-lg ring-1 ring-black/5 dark:border-slate-600 dark:bg-slate-900 dark:ring-white/10"
            >
              <div className="border-b border-slate-100 px-4 py-3 lg:hidden dark:border-slate-700">
                <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">
                  {user?.name}
                </p>
                <p className="truncate text-xs text-slate-500 dark:text-slate-400">{user?.email}</p>
              </div>
              <button
                type="button"
                role="menuitem"
                onClick={async () => {
                  setOpen(false)
                  await onLogout()
                }}
                className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm font-medium text-slate-700 transition hover:bg-red-50 hover:text-red-700 dark:text-slate-200 dark:hover:bg-red-950/40 dark:hover:text-red-300"
              >
                <LogOut className="h-4 w-4" strokeWidth={1.75} aria-hidden />
                Log out
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  )
}
