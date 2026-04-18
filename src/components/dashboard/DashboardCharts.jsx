import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Card } from '../Card'
import { useTheme } from '../../hooks/useTheme'

const PIE_COLORS = ['#0ea5e9', '#22c55e', '#f59e0b', '#a855f7', '#14b8a6']

/**
 * Recharts line, bar, and pie widgets with shared mock series from the parent.
 */
export function DashboardCharts({
  attendanceTrend,
  marksDistribution,
  subjectPerformance,
}) {
  const { resolved } = useTheme()
  const isDark = resolved === 'dark'
  const tickFill = isDark ? '#94a3b8' : '#64748b'
  const gridStroke = isDark ? '#334155' : '#e2e8f0'
  const tooltipText = isDark ? '#e2e8f0' : '#0f172a'
  const tooltipMuted = isDark ? '#94a3b8' : '#64748b'
  const tooltipStyle = isDark
    ? {
        borderRadius: '10px',
        border: '1px solid #334155',
        backgroundColor: '#0f172a',
        color: tooltipText,
        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.4)',
      }
    : {
        borderRadius: '10px',
        border: '1px solid #e2e8f0',
        backgroundColor: '#ffffff',
        color: tooltipText,
        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.08)',
      }
  const tooltipItemStyle = { color: tooltipText, fontWeight: 600 }
  const tooltipLabelStyle = { color: tooltipMuted, fontWeight: 600 }

  return (
    <div className="space-y-6">
      <Card
        accentClass="from-sky-500 to-indigo-500"
        className="border-slate-100 shadow-md shadow-slate-200/40 transition-shadow duration-300 hover:shadow-lg dark:border-slate-800 dark:shadow-slate-950/30"
      >
        <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">Attendance trend</h3>
        <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">Weekly average % — last 6 weeks</p>
        <div className="mt-4 h-[280px] w-full min-w-0">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={attendanceTrend}
              margin={{ top: 8, right: 8, left: -16, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: tickFill }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                domain={[80, 100]}
                tick={{ fontSize: 11, fill: tickFill }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `${v}%`}
              />
              <Tooltip
                contentStyle={tooltipStyle}
                itemStyle={tooltipItemStyle}
                labelStyle={tooltipLabelStyle}
                formatter={(value) => [`${value}%`, 'Attendance']}
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke="#0284c7"
                strokeWidth={2.5}
                dot={{ fill: '#0284c7', strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card
          accentClass="from-emerald-500 to-teal-500"
          className="border-slate-100 shadow-md shadow-slate-200/40 transition-shadow duration-300 hover:shadow-lg dark:border-slate-800 dark:shadow-slate-950/30"
        >
          <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">Marks distribution</h3>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">Students per score band</p>
          <div className="mt-4 h-[280px] w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={marksDistribution}
                margin={{ top: 8, right: 8, left: -16, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridStroke} />
                <XAxis
                  dataKey="range"
                  tick={{ fontSize: 11, fill: tickFill }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: tickFill }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={tooltipStyle}
                  itemStyle={tooltipItemStyle}
                  labelStyle={tooltipLabelStyle}
                  formatter={(value) => [value, 'Students']}
                />
                <Bar dataKey="count" radius={[6, 6, 0, 0]} fill="#10b981" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card
          accentClass="from-amber-400 to-orange-500"
          className="border-slate-100 shadow-md shadow-slate-200/40 transition-shadow duration-300 hover:shadow-lg dark:border-slate-800 dark:shadow-slate-950/30"
        >
          <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">Subject performance</h3>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">Relative weight by subject (demo)</p>
          <div className="mt-4 h-[280px] w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={subjectPerformance}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={56}
                  outerRadius={88}
                  paddingAngle={2}
                >
                  {subjectPerformance.map((entry, i) => (
                    <Cell key={entry.name} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={tooltipStyle}
                  itemStyle={tooltipItemStyle}
                  labelStyle={tooltipLabelStyle}
                />
                <Legend
                  wrapperStyle={{ fontSize: '12px', color: tickFill }}
                  formatter={(value) => (
                    <span className="text-slate-700 dark:text-slate-200">{value}</span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
    </div>
  )
}
