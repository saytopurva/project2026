/**
 * Single source of truth for dashboard demo data (also served by mock Axios).
 */

export const DASHBOARD_OVERVIEW_MOCK = {
  totalStudents: 248,
  attendancePercent: 94,
  averageMarks: 82,
  totalClasses: 18,

  /** Weekly attendance % for line chart */
  attendanceTrend: [
    { label: 'Week 1', value: 89 },
    { label: 'Week 2', value: 91 },
    { label: 'Week 3', value: 88 },
    { label: 'Week 4', value: 92 },
    { label: 'Week 5', value: 94 },
    { label: 'Week 6', value: 96 },
  ],

  /** Marks buckets for bar chart */
  marksDistribution: [
    { range: '0–40', count: 8 },
    { range: '41–60', count: 22 },
    { range: '61–75', count: 56 },
    { range: '76–90', count: 98 },
    { range: '91–100', count: 64 },
  ],

  /** Subject averages for pie chart (sum not required to be 100 — relative slices) */
  subjectPerformance: [
    { name: 'Mathematics', value: 28 },
    { name: 'Science', value: 24 },
    { name: 'English', value: 18 },
    { name: 'Social Studies', value: 16 },
    { name: 'Languages', value: 14 },
  ],

  recentActivity: [
    {
      id: '1',
      type: 'student',
      message: 'New student enrolled',
      detail: 'Riya Sharma added to Class 9-B',
      time: '12 min ago',
    },
    {
      id: '2',
      type: 'attendance',
      message: 'Attendance marked',
      detail: 'Section 10-A — Morning session',
      time: '1 hr ago',
    },
    {
      id: '3',
      type: 'marks',
      message: 'Marks updated',
      detail: 'Mid-term Mathematics — 32 records',
      time: '2 hr ago',
    },
    {
      id: '4',
      type: 'student',
      message: 'Profile updated',
      detail: 'Arjun Mehta — contact information',
      time: '3 hr ago',
    },
    {
      id: '5',
      type: 'attendance',
      message: 'Attendance marked',
      detail: 'Class 8-C — Full day',
      time: '5 hr ago',
    },
  ],

  todayAttendance: {
    present: 231,
    absent: 12,
    leave: 5,
  },

  /** For search / filter demo */
  students: [
    { id: 's1', name: 'Riya Sharma', className: '9', section: 'B' },
    { id: 's2', name: 'Arjun Mehta', className: '10', section: 'A' },
    { id: 's3', name: 'Priya Nair', className: '9', section: 'A' },
    { id: 's4', name: 'Kabir Singh', className: '10', section: 'B' },
    { id: 's5', name: 'Ananya Iyer', className: '8', section: 'C' },
    { id: 's6', name: 'Vikram Rao', className: '10', section: 'A' },
    { id: 's7', name: 'Sneha Patel', className: '9', section: 'B' },
  ],
}
