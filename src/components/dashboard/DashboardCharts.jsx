import { AttendanceAnalytics } from '../attendance/AttendanceAnalytics'
import { DashboardNoticesEvents } from './DashboardNoticesEvents'
import { MarksDistributionTable } from './MarksDistributionTable'
import { SubjectPerformance } from './SubjectPerformance'

/**
 * Premium dashboard grid: analytics row, then marks + notices/events.
 */
export function DashboardCharts() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:items-stretch lg:gap-5">
        <div className="min-w-0">
          <AttendanceAnalytics showDefaulters />
        </div>
        <div className="min-w-0">
          <SubjectPerformance />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:items-stretch lg:gap-5">
        <div className="min-w-0">
          <MarksDistributionTable />
        </div>
        <div className="min-w-0">
          <DashboardNoticesEvents />
        </div>
      </div>
    </div>
  )
}
