
import { useState, useEffect } from 'react'
import axios from 'axios'
import {
  LayoutDashboard,
  Activity,
  ChartNoAxesCombined,
  CalendarDays,
  Settings,
  Bell,
  Search,
  Plus,
  Droplet,
  TrendingUp,
  TrendingDown,
  Target,
  Clock,
  Menu,
  X,
  Heart,
  ChevronDown,
} from 'lucide-react'

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

import './App.css'

const API_URL = 'http://localhost:5000/api'

const READING_TYPES = [
  'Fasting',
  'After breakfast',
  'Before lunch',
  'After lunch',
  'Before dinner',
  'After dinner',
  'Bedtime',
]

function App() {
  // -------------------------------------
  // AUTHENTICATION
  // -------------------------------------

  const [authMode, setAuthMode] = useState('login')
  const [authData, setAuthData] = useState({
    name: '',
    email: '',
    password: '',
  })
  const [authError, setAuthError] = useState('')
  const [authLoading, setAuthLoading] = useState(false)

  const [currentUser, setCurrentUser] = useState(() => {
    const savedUser = localStorage.getItem('sweetyUser')

    if (!savedUser) return null

    try {
      return JSON.parse(savedUser)
    } catch {
      localStorage.removeItem('sweetyUser')
      localStorage.removeItem('sweetyToken')
      return null
    }
  })

  const [authToken, setAuthToken] = useState(
    () => localStorage.getItem('sweetyToken') || ''
  )

  async function handleAuthSubmit(event) {
    event.preventDefault()
    setAuthError('')
    setAuthLoading(true)

    try {
      const endpoint =
        authMode === 'register' ? 'register' : 'login'

      const response = await axios.post(
        `${API_URL}/auth/${endpoint}`,
        authData
      )

      const token = response.data.token
      const user = response.data.user

      if (!token || !user) {
        throw new Error('Invalid authentication response.')
      }

      localStorage.setItem('sweetyToken', token)
      localStorage.setItem('sweetyUser', JSON.stringify(user))

      setAuthToken(token)
      setCurrentUser(user)

      setAuthData({
        name: '',
        email: '',
        password: '',
      })
    } catch (error) {
      setAuthError(
        error.response?.data?.message ||
        error.message ||
        'Unable to connect to Sweety. Please try again.'
      )
    } finally {
      setAuthLoading(false)
    }
  }

  function handleLogout() {
    localStorage.removeItem('sweetyToken')
    localStorage.removeItem('sweetyUser')

    setAuthToken('')
    setCurrentUser(null)
    setAuthMode('login')
    setAuthError('')

    setAuthData({
      name: '',
      email: '',
      password: '',
    })

    setReadings([])
    setReminders([])
    setActivePage('Dashboard')
    setShowForm(false)
    setShowNotifications(false)
  }

  // -------------------------------------
  // GENERAL STATE
  // -------------------------------------

  const [currentHour] = useState(new Date().getHours())

  const greeting =
    currentHour < 12
      ? 'Good morning'
      : currentHour < 17
      ? 'Good afternoon'
      : currentHour < 21
      ? 'Good evening'
      : 'Good night'

  const [activePage, setActivePage] = useState('Dashboard')
  const [period, setPeriod] = useState('Week')
  const [readings, setReadings] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [typeFilter, setTypeFilter] = useState('All')
  const [reportPeriod, setReportPeriod] = useState('Week')

  // -------------------------------------
  // REMINDERS STATE
  // -------------------------------------

  const [reminders, setReminders] = useState([])
  const [reminderTitle, setReminderTitle] = useState('')
  const [reminderType, setReminderType] = useState('Fasting')
  const [reminderTime, setReminderTime] = useState('07:00')
  const [reminderRepeat, setReminderRepeat] = useState('Every day')
  const [reminderLoading, setReminderLoading] = useState(false)

  // -------------------------------------
  // MODAL, MENU AND NOTIFICATIONS
  // -------------------------------------

  const [showForm, setShowForm] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)

  const [notificationsEnabled, setNotificationsEnabled] = useState(
    () => localStorage.getItem('sweetyNotifications') !== 'false'
  )

  const [newValue, setNewValue] = useState('')
  const [newType, setNewType] = useState('Fasting')
  const [readingLoading, setReadingLoading] = useState(false)

  // -------------------------------------
  // LOAD GLUCOSE READINGS
  // -------------------------------------

  useEffect(() => {
    if (!authToken) return

    async function fetchReadings() {
      try {
        const response = await axios.get(
          `${API_URL}/glucose`,
          {
            headers: {
              Authorization: `Bearer ${authToken}`,
            },
          }
        )

        const savedReadings = (
          response.data.readings || []
        ).map(item => ({
          id: item.id,
          type: item.reading_type,
          time: new Date(item.measured_at).toLocaleString(),
          measuredAt: item.measured_at,
          value: Number(item.glucose_value),
          status: 'Recorded',
        }))

        savedReadings.sort(
          (a, b) =>
            new Date(b.measuredAt) - new Date(a.measuredAt)
        )

        setReadings(savedReadings)
      } catch (error) {
        console.error('Unable to load glucose readings:', error)
      }
    }

    fetchReadings()
  }, [authToken])

  // -------------------------------------
  // LOAD REMINDERS
  // -------------------------------------

  useEffect(() => {
    if (!authToken) return

    async function fetchReminders() {
      try {
        const response = await axios.get(
          `${API_URL}/reminders`,
          {
            headers: {
              Authorization: `Bearer ${authToken}`,
            },
          }
        )

        const savedReminders = (
          response.data.reminders || []
        ).map(item => ({
          id: item.id,
          title: item.title,
          type: item.reminder_type,
          time: String(item.reminder_time).slice(0, 5),
          repeat: item.repeat_days || 'Every day',
          enabled: item.is_enabled,
        }))

        savedReminders.sort((a, b) =>
          a.time.localeCompare(b.time)
        )

        setReminders(savedReminders)
      } catch (error) {
        console.error('Unable to load reminders:', error)
      }
    }

    fetchReminders()
  }, [authToken])

  // -------------------------------------
  // CHART DATA
  // -------------------------------------

  const chartData = (() => {
    const now = new Date()
    const days = period === 'Week' ? 7 : 30
    const result = []

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now)
      date.setHours(0, 0, 0, 0)
      date.setDate(date.getDate() - i)

      const nextDate = new Date(date)
      nextDate.setDate(nextDate.getDate() + 1)

      const dayReadings = readings.filter(item => {
        const measuredAt = new Date(item.measuredAt)

        return (
          measuredAt >= date &&
          measuredAt < nextDate
        )
      })

      const average = dayReadings.length
        ? Math.round(
            dayReadings.reduce(
              (sum, item) => sum + item.value,
              0
            ) / dayReadings.length
          )
        : null

      result.push({
        day:
          period === 'Week'
            ? date.toLocaleDateString('en-US', {
                weekday: 'short',
              })
            : date.toLocaleDateString('en-US', {
                day: 'numeric',
                month: 'short',
              }),
        value: average,
      })
    }

    return result
  })()

  // -------------------------------------
  // DASHBOARD STATISTICS
  // -------------------------------------

  const average = readings.length
    ? Math.round(
        readings.reduce(
          (sum, item) => sum + item.value,
          0
        ) / readings.length
      )
    : 0

  const latestReading = readings.length
    ? readings[0].value
    : '--'

  const lastRecorded = readings.length
    ? new Date(readings[0].measuredAt).toLocaleTimeString(
        'en-IN',
        {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true,
        }
      )
    : '--'

  // -------------------------------------
  // TODAY'S STATISTICS
  // -------------------------------------

  const todayReadings = readings.filter(item => {
    const readingDate = new Date(item.measuredAt)
    const today = new Date()

    return (
      readingDate.toDateString() === today.toDateString()
    )
  })

  const todayAverage = todayReadings.length
    ? Math.round(
        todayReadings.reduce(
          (sum, item) => sum + item.value,
          0
        ) / todayReadings.length
      )
    : '--'

  const todayHighest = todayReadings.length
    ? Math.max(...todayReadings.map(item => item.value))
    : '--'

  const todayLowest = todayReadings.length
    ? Math.min(...todayReadings.map(item => item.value))
    : '--'

  const todayCount = todayReadings.length

  // -------------------------------------
  // SEARCH AND FILTER
  // -------------------------------------

  const filteredReadings = readings.filter(reading => {
    const matchesSearch =
      reading.type
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      String(reading.value).includes(searchTerm)

    const matchesType =
      typeFilter === 'All' ||
      reading.type === typeFilter

    return matchesSearch && matchesType
  })

  // -------------------------------------
  // ADD GLUCOSE READING
  // -------------------------------------

  async function addReading(event) {
    event.preventDefault()

    if (
      !newValue ||
      Number(newValue) <= 0 ||
      Number(newValue) > 1000
    ) {
      alert('Please enter a valid glucose reading.')
      return
    }

    setReadingLoading(true)

    try {
      const response = await axios.post(
        `${API_URL}/glucose`,
        {
          reading_type: newType,
          glucose_value: Number(newValue),
        },
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        }
      )

      const savedReading = response.data.reading

      const reading = {
        id: savedReading.id,
        type: savedReading.reading_type,
        time: new Date(
          savedReading.measured_at
        ).toLocaleString(),
        measuredAt: savedReading.measured_at,
        value: Number(savedReading.glucose_value),
        status: 'Recorded',
      }

      setReadings(prev =>
        [reading, ...prev].sort(
          (a, b) =>
            new Date(b.measuredAt) -
            new Date(a.measuredAt)
        )
      )

      setNewValue('')
      setNewType('Fasting')
      setShowForm(false)

      alert('Glucose reading saved successfully!')
    } catch (error) {
      alert(
        error.response?.data?.message ||
        'Unable to save reading. Please try again.'
      )
    } finally {
      setReadingLoading(false)
    }
  }

  // -------------------------------------
  // DELETE GLUCOSE READING
  // -------------------------------------

  async function deleteReading(readingId) {
    const confirmDelete = window.confirm(
      'Are you sure you want to delete this reading?'
    )

    if (!confirmDelete) return

    try {
      await axios.delete(
        `${API_URL}/glucose/${readingId}`,
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        }
      )

      setReadings(prev =>
        prev.filter(reading => reading.id !== readingId)
      )

      alert('Reading deleted successfully!')
    } catch (error) {
      alert(
        error.response?.data?.message ||
        'Unable to delete reading. Please try again.'
      )
    }
  }

  // -------------------------------------
  // ADD REMINDER
  // -------------------------------------

  async function addReminder(event) {
    event.preventDefault()

    if (!reminderTitle.trim() || !reminderTime) {
      alert('Please enter a reminder name and time.')
      return
    }

    setReminderLoading(true)

    try {
      const response = await axios.post(
        `${API_URL}/reminders`,
        {
          title: reminderTitle.trim(),
          reminder_type: reminderType,
          reminder_time: reminderTime,
          repeat_days: reminderRepeat,
        },
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        }
      )

      const item = response.data.reminder

      const newReminder = {
        id: item.id,
        title: item.title,
        type: item.reminder_type,
        time: String(item.reminder_time).slice(0, 5),
        repeat: item.repeat_days || 'Every day',
        enabled: item.is_enabled,
      }

      setReminders(prev =>
        [...prev, newReminder].sort((a, b) =>
          a.time.localeCompare(b.time)
        )
      )

      setReminderTitle('')
      setReminderTime('07:00')
      setReminderType('Fasting')
      setReminderRepeat('Every day')

      alert('Reminder saved successfully!')
    } catch (error) {
      alert(
        error.response?.data?.message ||
        'Unable to save reminder.'
      )
    } finally {
      setReminderLoading(false)
    }
  }

  // -------------------------------------
  // DELETE REMINDER
  // -------------------------------------

  async function deleteReminder(reminderId) {
    if (!window.confirm('Delete this reminder?')) return

    try {
      await axios.delete(
        `${API_URL}/reminders/${reminderId}`,
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        }
      )

      setReminders(prev =>
        prev.filter(item => item.id !== reminderId)
      )

      alert('Reminder deleted successfully!')
    } catch (error) {
      alert(
        error.response?.data?.message ||
        'Unable to delete reminder.'
      )
    }
  }

  // -------------------------------------
  // REPORT DATE RANGE
  // -------------------------------------

  const reportStart = new Date()
  reportStart.setHours(0, 0, 0, 0)

  if (reportPeriod === 'Week') {
    reportStart.setDate(reportStart.getDate() - 6)
  } else if (reportPeriod === 'Month') {
    reportStart.setDate(1)
  }

  const reportReadings = readings.filter(reading => {
    const readingDate = new Date(reading.measuredAt)

    return (
      readingDate >= reportStart &&
      readingDate <= new Date()
    )
  })

  const reportCount = reportReadings.length

  const reportAverage = reportCount
    ? Math.round(
        reportReadings.reduce(
          (sum, item) => sum + item.value,
          0
        ) / reportCount
      )
    : '--'

  const reportHighest = reportCount
    ? Math.max(...reportReadings.map(item => item.value))
    : '--'

  const reportLowest = reportCount
    ? Math.min(...reportReadings.map(item => item.value))
    : '--'

  // -------------------------------------
  // NAVIGATION
  // -------------------------------------

  const navigation = [
    { name: 'Dashboard', icon: LayoutDashboard },
    { name: 'My Readings', icon: Droplet },
    { name: 'Reports', icon: ChartNoAxesCombined },
    { name: 'Reminders', icon: CalendarDays },
  ]

  // -------------------------------------
  // LOGIN AND REGISTRATION SCREEN
  // -------------------------------------

  if (!authToken) {
    return (
      <div className="auth-screen">
        <div className="auth-card">
          <div className="auth-brand">
            <h1>✦ Sweety</h1>
            <p>Your personal glucose companion</p>
          </div>

          <h2>
            {authMode === 'login'
              ? 'Welcome back!'
              : 'Create your account'}
          </h2>

          <p className="auth-subtitle">
            {authMode === 'login'
              ? 'Sign in to continue to your dashboard.'
              : 'Join Sweety and keep track of your readings.'}
          </p>

          <form onSubmit={handleAuthSubmit}>
            {authMode === 'register' && (
              <input
                className="auth-input"
                type="text"
                placeholder="Full name"
                value={authData.name}
                onChange={e =>
                  setAuthData({
                    ...authData,
                    name: e.target.value,
                  })
                }
                required
              />
            )}

            <input
              className="auth-input"
              type="email"
              placeholder="Email address"
              value={authData.email}
              onChange={e =>
                setAuthData({
                  ...authData,
                  email: e.target.value,
                })
              }
              required
            />

            <input
              className="auth-input"
              type="password"
              placeholder="Password (minimum 8 characters)"
              value={authData.password}
              onChange={e =>
                setAuthData({
                  ...authData,
                  password: e.target.value,
                })
              }
              minLength={8}
              required
            />

            {authError && (
              <p className="auth-error">{authError}</p>
            )}

            <button
              className="auth-submit"
              type="submit"
              disabled={authLoading}
            >
              {authLoading
                ? 'Please wait...'
                : authMode === 'login'
                ? 'Sign In'
                : 'Create Account'}
            </button>
          </form>

          <p className="auth-switch">
            {authMode === 'login'
              ? "Don't have an account?"
              : 'Already have an account?'}{' '}

            <button
              type="button"
              onClick={() => {
                setAuthMode(
                  authMode === 'login' ? 'register' : 'login'
                )
                setAuthError('')
              }}
            >
              {authMode === 'login' ? 'Sign Up' : 'Sign In'}
            </button>
          </p>
        </div>
      </div>
    )
  }

  // -------------------------------------
  // MAIN APPLICATION
  // -------------------------------------

  return (
    <div className="app-shell">
      {menuOpen && (
        <button
          className="mobile-overlay"
          aria-label="Close menu"
          onClick={() => setMenuOpen(false)}
        />
      )}

      {/* SIDEBAR */}
      <aside
        className={`sidebar ${
          menuOpen ? 'sidebar-open' : ''
        }`}
      >
        <div className="brand">
          <div className="brand-icon">
            <Heart size={23} fill="currentColor" />
          </div>

          <span>
            Sweety<span className="brand-dot">.</span>
          </span>

          <button
            className="close-menu"
            onClick={() => setMenuOpen(false)}
            aria-label="Close menu"
          >
            <X size={20} />
          </button>
        </div>

        <div className="sidebar-label">MENU</div>

        <nav className="navigation">
          {navigation.map(({ name, icon: Icon }) => (
            <button
              key={name}
              className={`nav-item ${
                activePage === name ? 'active' : ''
              }`}
              onClick={() => {
                setActivePage(name)
                setMenuOpen(false)
              }}
            >
              <Icon size={19} />
              <span>{name}</span>
            </button>
          ))}
        </nav>

        <div className="sidebar-label settings-label">
          PREFERENCES
        </div>

        <button
          className={`nav-item ${
            activePage === 'Settings' ? 'active' : ''
          }`}
          onClick={() => {
            setActivePage('Settings')
            setMenuOpen(false)
          }}
        >
          <Settings size={19} />
          <span>Settings</span>
        </button>

        <div className="sidebar-bottom">
          <div className="profile">
            <div className="avatar">
              {(currentUser?.name || 'M')
                .charAt(0)
                .toUpperCase()}
            </div>

            <div className="profile-info">
              <strong>
                {currentUser?.name || 'My Profile'}
              </strong>
              <span>Personal account</span>
            </div>

            <ChevronDown size={17} />
          </div>

          <button
            type="button"
            className="logout-button"
            onClick={handleLogout}
          >
            Logout
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="main-content">
        {/* TOPBAR */}
        <header className="topbar">
          <button
            className="menu-button"
            onClick={() => setMenuOpen(true)}
            aria-label="Open menu"
          >
            <Menu size={22} />
          </button>

          <div className="breadcrumb">
            <span>Pages</span>
            <span className="breadcrumb-divider">/</span>
            <strong>{activePage}</strong>
          </div>

          <div className="topbar-actions">
  

            <div className="notification-wrap">
              <button
                className="icon-button notification-button"
                aria-label="Notifications"
                onClick={() =>
                  setShowNotifications(prev => !prev)
                }
              >
                <Bell size={19} />

                {notificationsEnabled && (
                  <span className="notification-dot" />
                )}
              </button>

              {showNotifications && (
                <div className="notification-panel">
                  <div className="notification-panel-header">
                    <div>
                      <h3>Recent Activity</h3>
                      <p>Your Sweety updates</p>
                    </div>

                    <button
                      className="notification-close"
                      onClick={() =>
                        setShowNotifications(false)
                      }
                      aria-label="Close notifications"
                    >
                      <X size={17} />
                    </button>
                  </div>

                  <div className="notification-list">
                    {readings.slice(0, 3).map(reading => (
                      <div
                        className="notification-item"
                        key={`reading-${reading.id}`}
                      >
                        <div className="notification-item-icon">
                          <Activity size={17} />
                        </div>

                        <div>
                          <strong>
                            Glucose reading recorded
                          </strong>
                          <p>
                            {reading.type} · {reading.value} mg/dL
                          </p>
                          <span>{reading.time}</span>
                        </div>
                      </div>
                    ))}

                    {reminders.slice(0, 3).map(reminder => (
                      <div
                        className="notification-item"
                        key={`reminder-${reminder.id}`}
                      >
                        <div className="notification-item-icon">
                          <CalendarDays size={17} />
                        </div>

                        <div>
                          <strong>{reminder.title}</strong>
                          <p>
                            {reminder.type} reminder · {reminder.time}
                          </p>
                          <span>{reminder.repeat}</span>
                        </div>
                      </div>
                    ))}

                    {readings.length === 0 &&
                      reminders.length === 0 && (
                        <div className="notification-empty">
                          <Bell size={25} />
                          <p>No recent activity yet.</p>
                        </div>
                      )}
                  </div>
                </div>
              )}
            </div>

            <div className="top-avatar">
              {(currentUser?.name || 'User')
                .trim()
                .split(/\s+/)
                .map(part => part[0])
                .slice(0, 2)
                .join('')
                .toUpperCase()}
            </div>
          </div>
        </header>

        {/* ================================= */}
        {/* DASHBOARD PAGE */}
        {/* ================================= */}

        {activePage === 'Dashboard' ? (
          <div className="dashboard">
            <section className="welcome-section">
              <div>
                <p className="eyebrow">
                  {new Date()
                    .toLocaleDateString('en-US', {
                      weekday: 'long',
                      month: 'long',
                      day: 'numeric',
                    })
                    .toUpperCase()}
                </p>

                <h1>
                  {greeting}, {currentUser?.name || 'there'}{' '}
                  <span>✦</span>
                </h1>

                <p className="welcome-subtitle">
                  Here's an overview of your glucose tracking activity.
                </p>
              </div>

              <button
                className="primary-button"
                onClick={() => setShowForm(true)}
              >
                <Plus size={19} />
                Add Reading
              </button>
            </section>

            {/* MAIN STATISTICS */}
            <section className="stats-grid">
              <div className="stat-card">
                <div className="stat-top">
                  <span>Latest Reading</span>
                  <div className="stat-icon mint">
                    <Droplet size={20} />
                  </div>
                </div>

                <div className="stat-number">
                  {latestReading} <small>mg/dL</small>
                </div>

                <p className="stat-note">
                  <span className="positive">
                    <TrendingDown size={15} /> Latest entry
                  </span>
                </p>
              </div>

              <div className="stat-card">
                <div className="stat-top">
                  <span>Average Glucose</span>
                  <div className="stat-icon purple">
                    <Activity size={20} />
                  </div>
                </div>

                <div className="stat-number">
                  {average} <small>mg/dL</small>
                </div>

                <p className="stat-note">
                  Based on saved readings
                </p>
              </div>

              <div className="stat-card">
                <div className="stat-top">
                  <span>Total Readings</span>
                  <div className="stat-icon blue">
                    <Target size={20} />
                  </div>
                </div>

                <div className="stat-number">
                  {readings.length} <small>entries</small>
                </div>

                <p className="stat-note">
                  Your recorded measurements
                </p>
              </div>

              <div className="stat-card">
                <div className="stat-top">
                  <span>Last Recorded</span>
                  <div className="stat-icon orange">
                    <Clock size={20} />
                  </div>
                </div>

                <div className="stat-number time-number">
                  {lastRecorded}
                </div>

                <p className="stat-note">
                  Latest saved measurement
                </p>
              </div>
            </section>

            {/* TODAY'S STATISTICS */}
            <section className="stats-grid today-stats">
              <div className="stat-card">
                <div className="stat-top">
                  <span>Today's Average</span>
                  <div className="stat-icon purple">
                    <Activity size={20} />
                  </div>
                </div>

                <div className="stat-number">
                  {todayAverage} <small>mg/dL</small>
                </div>

                <p className="stat-note">
                  Average of today's readings
                </p>
              </div>

              <div className="stat-card">
                <div className="stat-top">
                  <span>Today's Highest</span>
                  <div className="stat-icon orange">
                    <TrendingUp size={20} />
                  </div>
                </div>

                <div className="stat-number">
                  {todayHighest} <small>mg/dL</small>
                </div>

                <p className="stat-note">
                  Highest recorded today
                </p>
              </div>

              <div className="stat-card">
                <div className="stat-top">
                  <span>Today's Lowest</span>
                  <div className="stat-icon mint">
                    <TrendingDown size={20} />
                  </div>
                </div>

                <div className="stat-number">
                  {todayLowest} <small>mg/dL</small>
                </div>

                <p className="stat-note">
                  Lowest recorded today
                </p>
              </div>

              <div className="stat-card">
                <div className="stat-top">
                  <span>Today's Readings</span>
                  <div className="stat-icon blue">
                    <Target size={20} />
                  </div>
                </div>

                <div className="stat-number">
                  {todayCount} <small>entries</small>
                </div>

                <p className="stat-note">
                  Measurements recorded today
                </p>
              </div>
            </section>

            {/* CHART AND ACTIVITY */}
            <section className="content-grid">
              <div className="panel chart-panel">
                <div className="panel-heading">
                  <div>
                    <h2>Glucose Overview</h2>
                    <p>
                      Track your glucose readings over time
                    </p>
                  </div>

                  <select
                    value={period}
                    onChange={event =>
                      setPeriod(event.target.value)
                    }
                    className="period-select"
                    aria-label="Chart period"
                  >
                    <option>Week</option>
                    <option>Month</option>
                  </select>
                </div>

                <div className="chart-legend">
                  <span className="legend-dot" />
                  Glucose level <strong>mg/dL</strong>
                </div>

                <div className="chart-container">
                  <ResponsiveContainer
                    width="100%"
                    height="100%"
                  >
                    <AreaChart
                      data={chartData}
                      connectNulls={false}
                      margin={{
                        top: 12,
                        right: 10,
                        left: -18,
                        bottom: 0,
                      }}
                    >
                      <defs>
                        <linearGradient
                          id="glucoseGradient"
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop
                            offset="0%"
                            stopColor="#35c99a"
                            stopOpacity={0.24}
                          />
                          <stop
                            offset="100%"
                            stopColor="#35c99a"
                            stopOpacity={0.01}
                          />
                        </linearGradient>
                      </defs>

                      <CartesianGrid
                        stroke="#edf1f3"
                        vertical={false}
                      />

                      <XAxis
                        dataKey="day"
                        axisLine={false}
                        tickLine={false}
                        tick={{
                          fill: '#929ba7',
                          fontSize: 12,
                        }}
                        dy={12}
                      />

                      <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{
                          fill: '#929ba7',
                          fontSize: 12,
                        }}
                      />

                      <Tooltip
                        contentStyle={{
                          borderRadius: 12,
                          border: '1px solid #edf1f3',
                          boxShadow: '0 5px 20px #142b4512',
                        }}
                        formatter={value => [
                          `${value} mg/dL`,
                          'Glucose',
                        ]}
                      />

                      <Area
                        type="monotone"
                        dataKey="value"
                        stroke="#35c99a"
                        strokeWidth={3}
                        fill="url(#glucoseGradient)"
                        dot={{
                          fill: '#35c99a',
                          stroke: '#fff',
                          strokeWidth: 2,
                          r: 4,
                        }}
                        activeDot={{ r: 6 }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                <p className="chart-disclaimer">
                  Chart values are calculated from your saved readings.
                  Not a medical assessment.
                </p>
              </div>

              <div className="panel goal-panel">
                <div className="panel-heading">
                  <div>
                    <h2>Daily Activity</h2>
                    <p>Your tracking progress</p>
                  </div>

                  <div className="stat-icon mint">
                    <Target size={20} />
                  </div>
                </div>

                <div className="goal-circle">
                  <div className="goal-inner">
                    <strong>{readings.length}</strong>
                    <span>Readings</span>
                  </div>
                </div>

                <div className="goal-caption">
                  <h3>Keep tracking!</h3>
                  <p>
                    Every entry helps you maintain a useful record
                    of your readings.
                  </p>
                </div>

                <button
                  className="secondary-button"
                  onClick={() => setShowForm(true)}
                >
                  <Plus size={17} /> Record glucose
                </button>
              </div>
            </section>

            {/* RECENT READINGS */}
            <section className="panel readings-panel">
              <div className="panel-heading">
                <div>
                  <h2>Recent Readings</h2>
                  <p>
                    Your latest recorded glucose measurements
                  </p>
                </div>

                <button
                  className="view-all"
                  onClick={() =>
                    setActivePage('My Readings')
                  }
                >
                  View all <span>→</span>
                </button>
              </div>

              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>READING TYPE</th>
                      <th>DATE & TIME</th>
                      <th>GLUCOSE LEVEL</th>
                      <th>STATUS</th>
                    </tr>
                  </thead>

                  <tbody>
                    {readings.length === 0 ? (
                      <tr>
                        <td colSpan="4">
                          No readings yet. Add your first reading!
                        </td>
                      </tr>
                    ) : (
                      readings.slice(0, 5).map(reading => (
                        <tr key={reading.id}>
                          <td>
                            <span className="reading-type">
                              <span className="reading-dot" />
                              {reading.type}
                            </span>
                          </td>

                          <td>{reading.time}</td>

                          <td>
                            <strong className="reading-value">
                              {reading.value} <small>mg/dL</small>
                            </strong>
                          </td>

                          <td>
                            <span className="status-pill">
                              {reading.status}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            <footer className="footer">
              <span>
                © 2026 Sweety. Made with{' '}
                <Heart size={13} fill="currentColor" /> for better tracking.
              </span>
              <span>Glucose tracking made simple.</span>
            </footer>
          </div>

        ) : activePage === 'My Readings' ? (

          // =================================
          // MY READINGS PAGE
          // =================================

          <div className="dashboard">
            <section className="welcome-section">
              <div>
                <p className="eyebrow">GLUCOSE HISTORY</p>
                <h1>
                  My Readings <span>✦</span>
                </h1>
                <p className="welcome-subtitle">
                  View all your recorded glucose measurements.
                </p>
              </div>

              <button
                className="primary-button"
                onClick={() => setShowForm(true)}
              >
                <Plus size={19} />
                Add Reading
              </button>
            </section>

            <section className="panel readings-panel">
              <div className="panel-heading">
                <div>
                  <h2>All Glucose Readings</h2>
                  <p>
                    {readings.length} total recorded measurements
                  </p>
                </div>
              </div>

              <div className="reading-filters">
                <input
                  type="text"
                  placeholder="Search by type or glucose value..."
                  value={searchTerm}
                  onChange={e =>
                    setSearchTerm(e.target.value)
                  }
                />

                <select
                  value={typeFilter}
                  onChange={e =>
                    setTypeFilter(e.target.value)
                  }
                >
                  <option value="All">All Reading Types</option>

                  {READING_TYPES.map(type => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>

              {filteredReadings.length === 0 ? (
                <p>
                  No matching readings found. Add a reading
                  or change your filters.
                </p>
              ) : (
                <div className="table-wrapper">
                  <table>
                    <thead>
                      <tr>
                        <th>Reading Type</th>
                        <th>Glucose Value</th>
                        <th>Date & Time</th>
                        <th>Status</th>
                        <th>Action</th>
                      </tr>
                    </thead>

                    <tbody>
                      {filteredReadings.map(reading => (
                        <tr key={reading.id}>
                          <td>{reading.type}</td>
                          <td>{reading.value} mg/dL</td>
                          <td>{reading.time}</td>
                          <td>{reading.status}</td>
                          <td>
                            <button
                              className="delete-reading-btn"
                              onClick={() =>
                                deleteReading(reading.id)
                              }
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </div>

        ) : activePage === 'Reports' ? (

          // =================================
          // REPORTS PAGE
          // =================================

          <div className="dashboard">
            <section className="welcome-section">
              <div>
                <p className="eyebrow">
                  YOUR HEALTH TRACKING SUMMARY
                </p>

                <h1>
                  Glucose Reports <span>✦</span>
                </h1>

                <p className="welcome-subtitle">
                  Understand your recorded glucose history.
                </p>
              </div>
            </section>

            <section className="panel">
              <div className="panel-heading">
                <div>
                  <h2>Report Period</h2>
                  <p>
                    Select a period to view your readings.
                  </p>
                </div>

                <select
                  className="period-select"
                  value={reportPeriod}
                  onChange={e =>
                    setReportPeriod(e.target.value)
                  }
                >
                  <option value="Day">Today</option>
                  <option value="Week">Last 7 Days</option>
                  <option value="Month">This Month</option>
                </select>
              </div>
            </section>

            <section className="stats-grid">
              <div className="stat-card">
                <div className="stat-label">
                  Average Glucose
                </div>
                <div className="stat-number">
                  {reportAverage} <small>mg/dL</small>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-label">
                  Highest Reading
                </div>
                <div className="stat-number">
                  {reportHighest} <small>mg/dL</small>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-label">
                  Lowest Reading
                </div>
                <div className="stat-number">
                  {reportLowest} <small>mg/dL</small>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-label">
                  Total Readings
                </div>
                <div className="stat-number">
                  {reportCount} <small>entries</small>
                </div>
              </div>
            </section>

            <section className="panel">
              <div className="panel-heading">
                <div>
                  <h2>Reading History</h2>
                  <p>
                    {reportCount} measurements in this period
                  </p>
                </div>
              </div>

              {reportCount === 0 ? (
                <p>
                  No readings available for this period.
                </p>
              ) : (
                <div className="table-wrapper">
                  <table>
                    <thead>
                      <tr>
                        <th>Reading Type</th>
                        <th>Glucose Value</th>
                        <th>Date & Time</th>
                      </tr>
                    </thead>

                    <tbody>
                      {reportReadings.map(reading => (
                        <tr key={reading.id}>
                          <td>{reading.type}</td>
                          <td>{reading.value} mg/dL</td>
                          <td>{reading.time}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </div>

        ) : activePage === 'Reminders' ? (

          // =================================
          // REMINDERS PAGE
          // =================================

          <div className="dashboard">
            <section className="welcome-section">
              <div>
                <p className="eyebrow">STAY ON TRACK</p>
                <h1>
                  My Reminders <span>✦</span>
                </h1>
                <p className="welcome-subtitle">
                  Manage your glucose tracking reminders.
                </p>
              </div>
            </section>

            <section className="panel">
              <div className="panel-heading">
                <div>
                  <h2>Create a reminder</h2>
                  <p>Choose your reminder schedule.</p>
                </div>
              </div>

              <form
                onSubmit={addReminder}
                className="reminder-form"
              >
                <label htmlFor="reminder-title">
                  Reminder name
                </label>

                <input
                  id="reminder-title"
                  type="text"
                  value={reminderTitle}
                  onChange={e =>
                    setReminderTitle(e.target.value)
                  }
                  placeholder="Morning glucose check"
                  maxLength={100}
                  required
                />

                <label htmlFor="reminder-type">
                  Reminder type
                </label>

                <select
                  id="reminder-type"
                  value={reminderType}
                  onChange={e =>
                    setReminderType(e.target.value)
                  }
                >
                  <option>Fasting</option>
                  <option>After breakfast</option>
                  <option>Before lunch</option>
                  <option>After lunch</option>
                  <option>Before dinner</option>
                  <option>After dinner</option>
                  <option>Bedtime</option>
                  <option>General</option>
                </select>

                <label htmlFor="reminder-time">
                  Reminder time
                </label>

                <input
                  id="reminder-time"
                  type="time"
                  value={reminderTime}
                  onChange={e =>
                    setReminderTime(e.target.value)
                  }
                  required
                />

                <label htmlFor="reminder-repeat">
                  Repeat
                </label>

                <select
                  id="reminder-repeat"
                  value={reminderRepeat}
                  onChange={e =>
                    setReminderRepeat(e.target.value)
                  }
                >
                  <option>Every day</option>
                  <option>Weekdays</option>
                  <option>Weekends</option>
                </select>

                <button
                  className="primary-button"
                  type="submit"
                  disabled={reminderLoading}
                >
                  {reminderLoading
                    ? 'Saving...'
                    : 'Save reminder'}
                </button>
              </form>
            </section>

            <section className="panel readings-panel">
              <div className="panel-heading">
                <div>
                  <h2>Your reminders</h2>
                  <p>
                    {reminders.length} saved reminders
                  </p>
                </div>
              </div>

              {reminders.length === 0 ? (
                <p>
                  No reminders yet. Create your first reminder above.
                </p>
              ) : (
                <div className="table-wrapper">
                  <table>
                    <thead>
                      <tr>
                        <th>REMINDER</th>
                        <th>TYPE</th>
                        <th>TIME</th>
                        <th>REPEAT</th>
                        <th>ACTION</th>
                      </tr>
                    </thead>

                    <tbody>
                      {reminders.map(item => (
                        <tr key={item.id}>
                          <td>{item.title}</td>
                          <td>{item.type}</td>
                          <td>{item.time}</td>
                          <td>{item.repeat}</td>
                          <td>
                            <button
                              className="delete-reading-btn"
                              onClick={() =>
                                deleteReminder(item.id)
                              }
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </div>

        ) : (

          // =================================
          // SETTINGS PAGE
          // =================================

          <div className="settings-page">
            <div className="settings-heading">
              <p className="eyebrow">PREFERENCES</p>
              <h1>Settings</h1>
              <p>
                Manage your account and application preferences.
              </p>
            </div>

            <section className="settings-card">
              <div className="settings-card-heading">
                <h2>Personal Information</h2>
                <p>Your registered account details</p>
              </div>

              <div className="settings-profile">
                <div className="settings-avatar">
                  {(currentUser?.name || 'User')
                    .trim()
                    .split(/\s+/)
                    .map(part => part[0])
                    .slice(0, 2)
                    .join('')
                    .toUpperCase()}
                </div>

                <div>
                  <strong>
                    {currentUser?.name || 'User'}
                  </strong>
                  <p>
                    {currentUser?.email || 'Email not available'}
                  </p>
                </div>
              </div>
            </section>

            <section className="settings-card">
              <div className="settings-card-heading">
                <h2>Notifications</h2>
                <p>Manage your notification indicator</p>
              </div>

              <div className="settings-option">
                <div>
                  <strong>Notification indicator</strong>
                  <p>Show or hide the notification dot.</p>
                </div>

                <button
                  type="button"
                  className={`settings-toggle ${
                    notificationsEnabled ? 'enabled' : ''
                  }`}
                  role="switch"
                  aria-checked={notificationsEnabled}
                  onClick={() => {
                    const nextValue = !notificationsEnabled

                    setNotificationsEnabled(nextValue)

                    localStorage.setItem(
                      'sweetyNotifications',
                      String(nextValue)
                    )
                  }}
                >
                  <span />
                </button>
              </div>
            </section>

            <section className="settings-card">
              <div className="settings-card-heading">
                <h2>Account</h2>
                <p>Manage your Sweety account session</p>
              </div>

              <button
                type="button"
                className="settings-logout"
                onClick={handleLogout}
              >
                Logout
              </button>
            </section>
          </div>
        )}
      </main>

      {/* ================================= */}
      {/* ADD READING MODAL */}
      {/* ================================= */}

      {showForm && (
        <div
          className="modal-backdrop"
          onClick={() => setShowForm(false)}
        >
          <div
            className="reading-modal"
            onClick={event => event.stopPropagation()}
          >
            <div className="modal-heading">
              <div>
                <h2>Add glucose reading</h2>
                <p>
                  Enter a measurement to save it in your list.
                </p>
              </div>

              <button
                className="icon-button"
                onClick={() => setShowForm(false)}
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={addReading}>
              <label htmlFor="reading-type">
                Reading type
              </label>

              <select
                id="reading-type"
                value={newType}
                onChange={event =>
                  setNewType(event.target.value)
                }
              >
                {READING_TYPES.map(type => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>

              <label htmlFor="reading-value">
                Glucose level (mg/dL)
              </label>

              <input
                id="reading-value"
                type="number"
                min="1"
                max="1000"
                step="1"
                placeholder="Enter your reading"
                value={newValue}
                onChange={event =>
                  setNewValue(event.target.value)
                }
                required
              />

              <button
                className="primary-button modal-submit"
                type="submit"
                disabled={readingLoading}
              >
                {readingLoading
                  ? 'Saving...'
                  : 'Save Reading'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
