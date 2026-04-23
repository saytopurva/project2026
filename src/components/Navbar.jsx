import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Bell, ChevronDown, LogOut, Search, UserRound } from 'lucide-react'
import { ThemeSegmented } from './ThemeSegmented'

/**
 * Top bar: title, optional global search, notifications, theme, profile.
 */
function userAvatarSrc(user) {
  if (!user) return ''
  return (
    user.picture ||
    user.photoURL ||
    user.rbac?.picture ||
    ''
  )
}

export function Navbar({ title, user, onLogout, headerSearch }) {
  const [open, setOpen] = useState(false)
  const menuRef = useRef(null)
  const avatarSrc = userAvatarSrc(user)

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
    <header className="sticky top-0 z-30 flex min-h-12 shrink-0 flex-col gap-2 border-b border-slate-200/80 bg-white/95 px-3 py-2 shadow-sm backdrop-blur-md dark:border-slate-800/90 dark:bg-slate-900/95 dark:shadow-slate-950/20 sm:flex-row sm:items-center sm:gap-3 sm:px-4 sm:py-2">
      <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
        <div className="min-w-0 shrink-0 sm:max-w-[200px] lg:max-w-[240px]">
          <h1 className="truncate text-sm font-semibold tracking-tight text-slate-900 dark:text-slate-100">
            {title}
          </h1>
          <p className="hidden truncate text-[10px] leading-tight text-slate-500 sm:block dark:text-slate-400">
            {new Date().toLocaleDateString('en-US', {
              weekday: 'long',
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })}
          </p>
        </div>

        {headerSearch ? (
          <div className="relative min-w-0 flex-1">
            <Search
              className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400 dark:text-slate-500"
              strokeWidth={1.75}
              aria-hidden
            />
            <input
              type="search"
              value={headerSearch.value}
              onChange={(e) => headerSearch.onChange(e.target.value)}
              placeholder={headerSearch.placeholder || 'Search students…'}
              className="w-full rounded-xl border border-slate-200/90 bg-slate-50/90 py-2 pl-8 pr-3 text-xs text-slate-900 shadow-inner transition placeholder:text-slate-400 focus:border-sky-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-100 dark:border-slate-600 dark:bg-slate-800/60 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-sky-500 dark:focus:bg-slate-900 dark:focus:ring-sky-900/40"
              aria-label={headerSearch.placeholder || 'Search'}
            />
          </div>
        ) : null}
      </div>

      <div className="flex shrink-0 items-center justify-end gap-1.5 sm:gap-2">
        <Link
          to="/notices"
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-transparent text-slate-500 transition hover:border-slate-200 hover:bg-slate-50 hover:text-slate-800 dark:text-slate-400 dark:hover:border-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-100"
          title="Notices & announcements"
        >
          <Bell className="h-[18px] w-[18px]" strokeWidth={1.75} aria-hidden />
        </Link>

        <ThemeSegmented variant="compact" />

        <div className="hidden min-w-0 max-w-[min(160px,24vw)] text-right lg:block">
          <p className="truncate text-xs font-medium text-slate-900 dark:text-slate-100">{user?.name}</p>
          <p className="truncate text-[10px] text-slate-500 dark:text-slate-400">{user?.email}</p>
        </div>

        <div className="relative shrink-0" ref={menuRef}>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200/90 bg-slate-50/80 py-1 pl-1 pr-2 text-left transition hover:border-sky-200 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/40 dark:border-slate-600 dark:bg-slate-800/80 dark:hover:border-sky-600 dark:hover:bg-slate-800"
            aria-expanded={open}
            aria-haspopup="menu"
          >
            {avatarSrc ? (
              <img
                src={avatarSrc}
                alt=""
                referrerPolicy="no-referrer"
                className="h-8 w-8 rounded-full border border-slate-200 object-cover shadow-sm ring-1 ring-slate-200/80 dark:border-slate-600 dark:ring-slate-600/80"
              />
            ) : (
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-sky-500 to-indigo-500 text-xs font-semibold text-white shadow-sm ring-1 ring-white/30">
                {(user?.name || user?.email || '?').charAt(0).toUpperCase()}
              </span>
            )}
            {!avatarSrc ? (
              <UserRound
                className="hidden h-4 w-4 text-slate-400 sm:block dark:text-slate-500"
                strokeWidth={1.75}
                aria-hidden
              />
            ) : null}
            <ChevronDown
              className={`h-4 w-4 text-slate-400 transition-transform dark:text-slate-500 ${open ? 'rotate-180' : ''}`}
              strokeWidth={1.75}
              aria-hidden
            />
          </button>

          {open ? (
            <div
              role="menu"
              className="absolute right-0 mt-2 w-52 origin-top-right rounded-xl border border-slate-200/90 bg-white py-1 shadow-lg ring-1 ring-black/5 dark:border-slate-600 dark:bg-slate-900 dark:ring-white/10"
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
