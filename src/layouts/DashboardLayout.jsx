import { Navbar } from '../components/Navbar'
import { PageTransition } from '../components/PageTransition'
import { Sidebar } from '../components/Sidebar'

/**
 * Authenticated app shell: soft light sidebar + top bar + animated main.
 */
export function DashboardLayout({ user, title, onLogout, children }) {
  return (
    <div className="flex min-h-screen flex-col bg-slate-50 lg:flex-row dark:bg-slate-950">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Navbar title={title} user={user} onLogout={onLogout} />
        <main className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8">
          <PageTransition>{children}</PageTransition>
        </main>
      </div>
    </div>
  )
}
