import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, SlidersHorizontal } from 'lucide-react'
import { CreateNoticeForm } from '../components/notices/CreateNoticeForm'
import { NoticeList } from '../components/notices/NoticeList'
import { notify } from '../utils/notify'
import { useAuth } from '../hooks/useAuth'
import { DashboardLayout } from '../layouts/DashboardLayout'
import { deleteNotice, fetchNotices } from '../services/noticeService'

/**
 * School notice board — list, search, important filter, create (JWT), delete own.
 */
export function NoticeBoardPage() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [notices, setNotices] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [importantOnly, setImportantOnly] = useState(false)
  const [deletingId, setDeletingId] = useState(null)

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 320)
    return () => clearTimeout(t)
  }, [search])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const list = await fetchNotices({
        search: debouncedSearch,
        importantOnly,
      })
      setNotices(list)
    } catch (e) {
      const msg =
        e?.response?.data?.detail ||
        e?.message ||
        'Could not load notices. Is Django running?'
      notify.error(String(msg))
      setNotices([])
    } finally {
      setLoading(false)
    }
  }, [debouncedSearch, importantOnly])

  useEffect(() => {
    load()
  }, [load])

  const sorted = useMemo(() => {
    return [...notices].sort((a, b) => {
      const ta = new Date(a.created_at).getTime()
      const tb = new Date(b.created_at).getTime()
      return tb - ta
    })
  }, [notices])

  const handleLogout = async () => {
    await logout()
    notify.info('You have been logged out.')
    navigate('/login', { replace: true })
  }

  const handleCreated = useCallback(() => {
    notify.success('Notice published.')
    load()
  }, [load])

  const handleDelete = useCallback(
    async (id) => {
      if (!window.confirm('Delete this notice? This cannot be undone.')) return
      setDeletingId(id)
      try {
        await deleteNotice(id)
        notify.info('Notice removed.')
        setNotices((prev) => prev.filter((n) => n.id !== id))
      } catch (e) {
        const msg =
          e?.response?.data?.detail ||
          e?.message ||
          'Could not delete notice.'
        notify.error(String(msg))
      } finally {
        setDeletingId(null)
      }
    },
    []
  )

  return (
    <DashboardLayout user={user} title="Notice board" onLogout={handleLogout}>
      <div className="mx-auto max-w-6xl space-y-8">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl dark:text-slate-100">
            Notice board
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-slate-600 dark:text-slate-400">
            Share announcements with other teachers. Newest posts appear first. You can delete only
            notices you created.
          </p>
        </div>

        <div className="grid gap-8 lg:grid-cols-5">
          <div className="lg:col-span-2">
            <CreateNoticeForm onCreated={handleCreated} />
          </div>

          <div className="space-y-4 lg:col-span-3">
            <div className="flex flex-col gap-3 rounded-2xl border border-slate-200/90 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900 sm:flex-row sm:items-center">
              <div className="relative min-w-0 flex-1">
                <Search
                  className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500"
                  strokeWidth={1.75}
                  aria-hidden
                />
                <input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search title or message…"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/80 py-2.5 pl-10 pr-3 text-sm text-slate-900 transition focus:border-sky-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-100 dark:border-slate-600 dark:bg-slate-800/60 dark:text-slate-100 dark:focus:border-sky-500 dark:focus:bg-slate-900 dark:focus:ring-sky-900/40"
                  aria-label="Search notices"
                />
              </div>
              <label className="inline-flex shrink-0 cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-2 text-xs font-medium text-slate-700 transition hover:border-sky-200 dark:border-slate-600 dark:bg-slate-800/60 dark:text-slate-200 dark:hover:border-sky-700">
                <SlidersHorizontal className="h-4 w-4 text-slate-400" strokeWidth={1.75} aria-hidden />
                <input
                  type="checkbox"
                  checked={importantOnly}
                  onChange={(e) => setImportantOnly(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500 dark:border-slate-500"
                />
                Important only
              </label>
            </div>

            <NoticeList
              notices={sorted}
              loading={loading}
              onDeleteNotice={handleDelete}
              deletingId={deletingId}
            />
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
