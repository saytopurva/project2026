import { useNavigate } from 'react-router-dom'
import { Award, BookOpenCheck, ChevronRight, Server } from 'lucide-react'
import { Card } from '../components/Card'
import { ThemeSegmented } from '../components/ThemeSegmented'
import { notify } from '../utils/notify'
import { useAuth } from '../hooks/useAuth'
import { DashboardLayout } from '../layouts/DashboardLayout'

function settingsIconSlot(Icon, color) {
  return (
    <span
      className={`mb-3 inline-flex h-11 w-11 items-center justify-center rounded-xl ring-1 ${color}`}
    >
      <Icon className="h-5 w-5" strokeWidth={1.75} aria-hidden />
    </span>
  )
}

const links = [
  {
    to: '/attendance',
    title: 'Attendance',
    desc: 'Record daily presence for each student.',
    icon: BookOpenCheck,
    color:
      'text-emerald-600 bg-emerald-50 ring-emerald-100 dark:bg-emerald-950/50 dark:text-emerald-400 dark:ring-emerald-900/60',
  },
  {
    to: '/marks',
    title: 'Marks',
    desc: 'Subject scores and grade entry.',
    icon: Award,
    color:
      'text-amber-600 bg-amber-50 ring-amber-100 dark:bg-amber-950/50 dark:text-amber-400 dark:ring-amber-900/60',
  },
]

/**
 * Settings hub — shortcuts to academic modules + API note.
 */
export function SettingsPage() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    notify.info('You have been logged out.')
    navigate('/login', { replace: true })
  }

  const apiBase =
    import.meta.env.VITE_API_URL ||
    (import.meta.env.DEV ? 'Same-origin /api (Vite → Django)' : 'Set VITE_API_URL')

  return (
    <DashboardLayout user={user} title="Settings" onLogout={handleLogout}>
      <div className="mx-auto max-w-3xl space-y-8">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl dark:text-slate-100">
            Settings
          </h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Workspace preferences and quick links to related tools.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {links.map(({ to, title, desc, icon, color }) => (
            <button
              key={to}
              type="button"
              onClick={() => navigate(to)}
              className="group flex w-full flex-col rounded-2xl border border-slate-200/90 bg-white p-5 text-left shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-sky-200 hover:shadow-md dark:border-slate-700 dark:bg-slate-900 dark:hover:border-sky-600"
            >
              {settingsIconSlot(icon, color)}
              <span className="flex items-center justify-between gap-2">
                <span className="font-semibold text-slate-900 dark:text-slate-100">{title}</span>
                <ChevronRight className="h-4 w-4 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-sky-500 dark:text-slate-600 dark:group-hover:text-sky-400" />
              </span>
              <span className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                {desc}
              </span>
            </button>
          ))}
        </div>

        <Card>
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold text-slate-900 dark:text-slate-100">Appearance</h3>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                Choose light, dark, or follow your system setting. Your choice is saved in this
                browser.
              </p>
              <div className="mt-4 max-w-xs">
                <ThemeSegmented />
              </div>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600 ring-1 ring-slate-200/80 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-600">
              <Server className="h-5 w-5" strokeWidth={1.75} aria-hidden />
            </span>
            <div>
              <h3 className="font-semibold text-slate-900 dark:text-slate-100">API connection</h3>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                The React app talks to Django over{' '}
                <span className="font-mono text-xs text-sky-800 dark:text-sky-300">{apiBase}</span>
                . JWT is required for student, attendance, and marks endpoints.
              </p>
            </div>
          </div>
        </Card>
      </div>
    </DashboardLayout>
  )
}
