// Lightweight metrics/analytics and data model stored in localStorage
// Keys
const LS_TASKS = 'tasks_v1'
const LS_SESSIONS = 'focus_sessions_v1'
const LS_EVENTS = 'analytics_events_v1'

// Quadrant helpers (Eisenhower)
// We map: Q1=TL (Urgent+Important), Q2=BL (Not urgent+Important), Q3=TR (Urgent+Not important), Q4=BR (Not urgent+Not important)
export const Quadrant = Object.freeze({ Q1: 'Q1', Q2: 'Q2', Q3: 'Q3', Q4: 'Q4' })

const safeRead = (key, fallback) => {
  try {
    const v = localStorage.getItem(key)
    return v ? JSON.parse(v) : fallback
  } catch {
    return fallback
  }
}

const safeWrite = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value))
    return true
  } catch {
    return false
  }
}

export const nowIso = () => new Date().toISOString()

export const getWeekStart = (d = new Date()) => {
  // ISO week, start Monday
  const date = new Date(d)
  const day = (date.getDay() + 6) % 7 // 0=Mon .. 6=Sun
  date.setHours(0, 0, 0, 0)
  date.setDate(date.getDate() - day)
  return date
}

export const formatYmd = (d) => {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export const weekKey = (d = new Date()) => formatYmd(getWeekStart(d))

// Data accessors
export const listTasks = () => safeRead(LS_TASKS, [])
export const saveTasks = (tasks) => safeWrite(LS_TASKS, tasks)
export const listSessions = () => safeRead(LS_SESSIONS, [])
export const saveSessions = (sessions) => safeWrite(LS_SESSIONS, sessions)
const listEvents = () => safeRead(LS_EVENTS, [])
const saveEvents = (events) => safeWrite(LS_EVENTS, events)

// Exported helper: events in a given ISO week (by weekKey)
export const eventsByWeek = (wk = weekKey()) => {
  const events = listEvents()
  const [y, m, d] = wk.split('-').map(n => parseInt(n, 10))
  const start = new Date(y, (m - 1), d, 0, 0, 0, 0)
  const end = new Date(start); end.setDate(end.getDate() + 7)
  const inWeek = (iso) => { const t = new Date(iso); return t >= start && t < end }
  return events.filter(e => inWeek(e.ts))
}

export const addTask = ({
  id,
  title,
  quadrant = Quadrant.Q2,
  importance = 3,
  urgency = 2,
  estimate_min = 25,
  scheduled_for = null,
}) => {
  const tasks = listTasks()
  const task = {
    id: id || Math.random().toString(36).slice(2, 10),
    user_id: null,
    title: title?.trim() || 'Tarea',
    quadrant,
    importance,
    urgency,
    estimate_min,
    scheduled_for,
    created_at: nowIso(),
    completed_at: null,
  }
  tasks.push(task)
  saveTasks(tasks)
  logEvent('intention_add_block', { task_id: task.id, quadrant, planned_min: estimate_min })
  return task
}

export const completeTask = (taskId, actual_min = null) => {
  const tasks = listTasks()
  const idx = tasks.findIndex(t => t.id === taskId)
  if (idx !== -1) {
    tasks[idx] = { ...tasks[idx], completed_at: nowIso() }
    saveTasks(tasks)
    logEvent('task_complete', {
      task_id: taskId,
      quadrant_final: tasks[idx].quadrant,
      estimate_min: tasks[idx].estimate_min || null,
      actual_min,
    })
    return tasks[idx]
  }
  return null
}

export const startFocus = ({ task_id = null, quadrant = Quadrant.Q2, planned_min = 25, source = 'manual' }) => {
  logEvent('focus_start', { task_id, quadrant, planned_min, source })
  const started_at = new Date()
  return { started_at, task_id, quadrant, planned_min, source }
}

export const endFocus = (session, { actual_min, interruptions = 0 }) => {
  const ended_at = new Date()
  const started_at = session?.started_at ? new Date(session.started_at) : new Date()
  const diffMin = typeof actual_min === 'number' ? actual_min : Math.max(1, Math.round((ended_at - started_at) / 60000))
  const sessions = listSessions()
  const record = {
    id: Math.random().toString(36).slice(2, 10),
    user_id: null,
    task_id: session?.task_id || null,
    quadrant: session?.quadrant || Quadrant.Q2,
    planned_min: session?.planned_min || diffMin,
    actual_min: diffMin,
    interruptions,
    source: session?.source || 'manual',
    started_at: started_at.toISOString(),
    ended_at: ended_at.toISOString(),
  }
  sessions.push(record)
  saveSessions(sessions)
  logEvent('focus_end', {
    task_id: record.task_id,
    quadrant: record.quadrant,
    actual_min: record.actual_min,
    interruptions: record.interruptions,
    source: record.source,
  })
  return record
}

export const logEvent = (name, parameters = {}) => {
  const events = listEvents()
  events.push({ name, parameters, ts: nowIso() })
  saveEvents(events)
}

// FQI calculation (0..1)
export function fqi({ minQ1, minQ2, minQ3, minQ4 }) {
  const pos = (minQ1 || 0) + 0.8 * (minQ2 || 0)
  const neg = 0.4 * ((minQ3 || 0) + (minQ4 || 0))
  const tot = (minQ1 || 0) + (minQ2 || 0) + (minQ3 || 0) + (minQ4 || 0)
  if (!tot) return 0
  const raw = (pos - neg) / tot
  return Math.max(0, Math.min(1, raw))
}

export const minutesByQuadrantForWeek = (wk = weekKey()) => {
  const sessions = listSessions()
  const [y, m, d] = wk.split('-').map(n => parseInt(n, 10))
  const start = new Date(y, (m - 1), d, 0, 0, 0, 0)
  const end = new Date(start)
  end.setDate(end.getDate() + 7)
  const inWeek = (iso) => {
    const t = new Date(iso)
    return t >= start && t < end
  }
  let minQ1 = 0, minQ2 = 0, minQ3 = 0, minQ4 = 0
  for (const s of sessions) {
    if (!inWeek(s.started_at)) continue
    const m = Number(s.actual_min) || 0
    if (s.quadrant === Quadrant.Q1) minQ1 += m
    else if (s.quadrant === Quadrant.Q2) minQ2 += m
    else if (s.quadrant === Quadrant.Q3) minQ3 += m
    else minQ4 += m
  }
  const minTotal = minQ1 + minQ2 + minQ3 + minQ4
  return { minQ1, minQ2, minQ3, minQ4, minTotal }
}

export const weeklyFQI = (wk = weekKey()) => {
  const mix = minutesByQuadrantForWeek(wk)
  return { week: wk, value: fqi(mix), ...mix }
}

export const streakDays = () => {
  const sessions = listSessions()
  // Build a set of YYYY-MM-DD with at least 1 minute
  const daysSet = new Set(
    sessions.map(s => new Date(s.started_at)).map(d => formatYmd(new Date(d.getFullYear(), d.getMonth(), d.getDate())))
  )
  // Count consecutive days up to today (going backwards)
  let count = 0
  const cursor = new Date()
  cursor.setHours(0, 0, 0, 0)
  let keep = true
  while (keep) {
    const key = formatYmd(cursor)
    if (daysSet.has(key)) {
      count++
      cursor.setDate(cursor.getDate() - 1)
    } else {
      keep = false
    }
  }
  return count
}

export const pctQ12Completed = (wk = weekKey()) => {
  const tasks = listTasks()
  const [y, m, d] = wk.split('-').map(n => parseInt(n, 10))
  const start = new Date(y, (m - 1), d, 0, 0, 0, 0)
  const end = new Date(start); end.setDate(end.getDate() + 7)
  const inWeek = (iso) => { const t = new Date(iso); return t >= start && t < end }
  const scheduledThisWeek = tasks.filter(t => t.scheduled_for && inWeek(t.scheduled_for) && (t.quadrant === Quadrant.Q1 || t.quadrant === Quadrant.Q2))
  if (!scheduledThisWeek.length) return 0
  const completed = scheduledThisWeek.filter(t => t.completed_at)
  return Math.round((completed.length / scheduledThisWeek.length) * 100)
}

export const ttfQ2Median = (wk = weekKey()) => {
  const tasks = listTasks().filter(t => t.quadrant === Quadrant.Q2 && t.completed_at)
  const [y, m, d] = wk.split('-').map(n => parseInt(n, 10))
  const start = new Date(y, (m - 1), d, 0, 0, 0, 0)
  const end = new Date(start); end.setDate(end.getDate() + 7)
  const inWeek = (iso) => { const t = new Date(iso); return t >= start && t < end }
  const diffs = []
  for (const t of tasks) {
    const created = new Date(t.created_at)
    const done = new Date(t.completed_at)
    if (!inWeek(t.completed_at)) continue
    const mins = Math.max(0, Math.round((done - (t.scheduled_for ? new Date(t.scheduled_for) : created)) / 60000))
    diffs.push(mins)
  }
  if (!diffs.length) return null
  diffs.sort((a, b) => a - b)
  const mid = Math.floor(diffs.length / 2)
  return diffs.length % 2 ? diffs[mid] : Math.round((diffs[mid - 1] + diffs[mid]) / 2)
}

export const deriveNextBestTask = () => {
  // Prefer Q1 then Q2, by higher importance, fallback to earliest created
  const tasks = listTasks().filter(t => !t.completed_at)
  const byPref = (a, b) => (b.importance || 0) - (a.importance || 0) || new Date(a.created_at) - new Date(b.created_at)
  const q1 = tasks.filter(t => t.quadrant === Quadrant.Q1).sort(byPref)
  if (q1.length) return q1[0]
  const q2 = tasks.filter(t => t.quadrant === Quadrant.Q2).sort(byPref)
  if (q2.length) return q2[0]
  // Fallback: peek into matrix notes as suggestions (readonly)
  try {
    const notes = JSON.parse(localStorage.getItem('eh_notes_v1') || '[]')
    const MIDC = 48, MIDR = 48
    const getQ = (n) => (n.row < MIDR ? (n.col < MIDC ? Quadrant.Q1 : Quadrant.Q3) : (n.col < MIDC ? Quadrant.Q2 : Quadrant.Q4))
    const q1n = notes.filter(n => getQ(n) === Quadrant.Q1)
    if (q1n.length) return { id: null, title: q1n[0].text || 'Nota Q1', quadrant: Quadrant.Q1, importance: q1n[0].priority || 3 }
    const q2n = notes.filter(n => getQ(n) === Quadrant.Q2)
    if (q2n.length) return { id: null, title: q2n[0].text || 'Nota Q2', quadrant: Quadrant.Q2, importance: q2n[0].priority || 3 }
  } catch (e) { /* ignore suggestions parse */ }
  return null
}

export const scheduleQ2BlocksSuggestion = (date = new Date()) => {
  // Create two Q2 blocks for tomorrow at 10:00 and 10:30
  const base = new Date(date)
  base.setDate(base.getDate() + 1)
  base.setHours(10, 0, 0, 0)
  const t1 = addTask({ title: 'Bloque Q2', quadrant: Quadrant.Q2, estimate_min: 25, scheduled_for: base.toISOString() })
  const t2d = new Date(base); t2d.setMinutes(t2d.getMinutes() + 30)
  const t2 = addTask({ title: 'Bloque Q2', quadrant: Quadrant.Q2, estimate_min: 25, scheduled_for: t2d.toISOString() })
  logEvent('suggestion_accepted', { type: 'schedule_q2', slots: [t1.scheduled_for, t2.scheduled_for] })
  return [t1, t2]
}

export const weeklySummary = (wk = weekKey()) => {
  const f = weeklyFQI(wk)
  const p = pomodoroStats(wk)
  return {
    week_start: wk,
    fqi: f.value,
    minQ1: f.minQ1,
    minQ2: f.minQ2,
    minQ3: f.minQ3,
    minQ4: f.minQ4,
    min_total: f.minTotal,
    streak_days: streakDays(),
    pct_q12_completed: pctQ12Completed(wk),
    ttf_q2_median: ttfQ2Median(wk),
    pomodoros_completed: p.pomodoros_completed,
    pomo_work_min: p.work_min,
    breaks_completed: p.breaks_completed,
    pauses: p.pauses,
  }
}

export const resetMetricsData = () => {
  safeWrite(LS_TASKS, [])
  safeWrite(LS_SESSIONS, [])
  safeWrite(LS_EVENTS, [])
}

// Pomodoro-specific weekly stats derived from events and sessions
export const pomodoroStats = (wk = weekKey()) => {
  const evs = eventsByWeek(wk)
  const ses = listSessions()
  const start = new Date(wk + 'T00:00:00Z')
  const end = new Date(start); end.setDate(end.getDate() + 7)
  const inWeek = (iso) => { const t = new Date(iso); return t >= start && t < end }

  // Count completed pomodoros by events
  const pomodoros_completed = evs.filter(e => e.name === 'pomodoro_complete').length
  const pauses = evs.filter(e => e.name === 'pomodoro_pause').length
  const breaks_completed = evs.filter(e => e.name === 'break_complete').length

  // Work minutes where source === 'pomodoro'
  let work_min = 0
  for (const s of ses) {
    if (!inWeek(s.ended_at)) continue
    if ((s.source || 'manual') === 'pomodoro') work_min += Number(s.actual_min) || 0
  }

  return { pomodoros_completed, work_min, breaks_completed, pauses }
}

// Enhanced motivational metrics system
export const getMotivationalInsights = () => {
  const now = new Date()
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
  
  const history = JSON.parse(localStorage.getItem('pomodoroHistory') || '[]')
  const currentMetrics = getMetrics()
  
  // Calculate trends and comparisons
  const weeklyPomodoros = history.filter(p => new Date(p.date) > weekAgo).length
  const monthlyPomodoros = history.filter(p => new Date(p.date) > monthAgo).length
  
  // Personal bests
  const personalBests = calculatePersonalBests(history)
  
  // Motivational messages based on performance
  const motivationalMessage = generateMotivationalMessage(currentMetrics, history)
  
  // Goals and targets
  const goals = calculateGoalProgress()
  
  // Productivity insights
  const insights = generateProductivityInsights(history, currentMetrics)
  
  return {
    personalBests,
    motivationalMessage,
    goals,
    insights,
    weeklyComparison: calculateWeeklyComparison(history),
    monthlyTrend: calculateMonthlyTrend(history)
  }
}

const calculatePersonalBests = (history) => {
  if (history.length === 0) return {}
  
  // Daily bests
  const dailyCounts = {}
  history.forEach(p => {
    const day = new Date(p.date).toDateString()
    dailyCounts[day] = (dailyCounts[day] || 0) + 1
  })
  
  const bestDay = {
    count: Math.max(...Object.values(dailyCounts), 0),
    date: Object.keys(dailyCounts).reduce((a, b) => 
      dailyCounts[a] > dailyCounts[b] ? a : b, Object.keys(dailyCounts)[0])
  }
  
  // Weekly bests
  const weeklyCount = {}
  history.forEach(p => {
    const week = getWeekStart(new Date(p.date)).toISOString().split('T')[0]
    weeklyCount[week] = (weeklyCount[week] || 0) + 1
  })
  
  const bestWeek = {
    count: Math.max(...Object.values(weeklyCount), 0),
    week: Object.keys(weeklyCount).reduce((a, b) => 
      weeklyCount[a] > weeklyCount[b] ? a : b, Object.keys(weeklyCount)[0])
  }
  
  // Longest streak
  const longestStreak = calculateLongestStreakFromHistory(history)
  
  return { bestDay, bestWeek, longestStreak }
}

const calculateLongestStreakFromHistory = (history) => {
  if (history.length === 0) return 0
  
  const dates = [...new Set(history.map(p => new Date(p.date).toDateString()))].sort()
  let maxStreak = 0
  let currentStreak = 1
  
  for (let i = 1; i < dates.length; i++) {
    const prev = new Date(dates[i - 1])
    const curr = new Date(dates[i])
    const diffDays = (curr - prev) / (1000 * 60 * 60 * 24)
    
    if (diffDays === 1) {
      currentStreak++
    } else {
      maxStreak = Math.max(maxStreak, currentStreak)
      currentStreak = 1
    }
  }
  
  return Math.max(maxStreak, currentStreak)
}

const generateMotivationalMessage = (metrics, history) => {
  const today = new Date().toDateString()
  const todayCount = history.filter(p => new Date(p.date).toDateString() === today).length
  const streak = streakDays()
  const total = metrics.totalPomodoros || 0
  
  // Achievement-based messages
  if (total >= 500) {
    return {
      type: 'legendary',
      title: '¡Eres una leyenda de la productividad! 👑',
      message: `${total} pomodoros completados. Tu dedicación es extraordinaria.`,
      icon: '👑'
    }
  }
  
  if (total >= 100) {
    return {
      type: 'master',
      title: '¡Maestro de la concentración! 🥷',
      message: `${total} pomodoros muestran tu dominio del enfoque.`,
      icon: '🥷'
    }
  }
  
  if (streak >= 30) {
    return {
      type: 'unstoppable',
      title: '¡Fuerza imparable! 🌟',
      message: `${streak} días consecutivos. ¡Nada puede detenerte!`,
      icon: '🌟'
    }
  }
  
  if (streak >= 7) {
    return {
      type: 'consistent',
      title: '¡Excelente consistencia! ⚡',
      message: `${streak} días seguidos construyendo el hábito.`,
      icon: '⚡'
    }
  }
  
  if (todayCount >= 8) {
    return {
      type: 'productive',
      title: '¡Día súper productivo! 💪',
      message: `${todayCount} pomodoros hoy. ¡Increíble energía!`,
      icon: '💪'
    }
  }
  
  if (todayCount >= 4) {
    return {
      type: 'focused',
      title: '¡Excelente enfoque hoy! 🎯',
      message: `${todayCount} pomodoros completados con determinación.`,
      icon: '🎯'
    }
  }
  
  // Encouraging messages for beginners
  if (total < 5) {
    return {
      type: 'beginner',
      title: '¡Cada paso cuenta! 🌱',
      message: 'Estás construyendo un hábito poderoso. ¡Sigue adelante!',
      icon: '🌱'
    }
  }
  
  // Default motivational
  return {
    type: 'motivated',
    title: '¡Sigue construyendo el hábito! 🚀',
    message: 'Cada pomodoro te acerca a tu mejor versión.',
    icon: '🚀'
  }
}

const calculateGoalProgress = () => {
  const savedGoals = JSON.parse(localStorage.getItem('pomodoroGoals') || '{}')
  const defaultGoals = {
    daily: 4,
    weekly: 20,
    monthly: 80,
    streak: 7
  }
  
  const goals = { ...defaultGoals, ...savedGoals }
  const metrics = getMetrics()
  const history = JSON.parse(localStorage.getItem('pomodoroHistory') || '[]')
  
  const today = new Date().toDateString()
  const todayCount = history.filter(p => new Date(p.date).toDateString() === today).length
  
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  const weekCount = history.filter(p => new Date(p.date) > weekAgo).length
  
  const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  const monthCount = history.filter(p => new Date(p.date) > monthAgo).length
  
  const currentStreak = streakDays()
  
  return {
    daily: {
      target: goals.daily,
      current: todayCount,
      progress: Math.min(100, (todayCount / goals.daily) * 100),
      achieved: todayCount >= goals.daily
    },
    weekly: {
      target: goals.weekly,
      current: weekCount,
      progress: Math.min(100, (weekCount / goals.weekly) * 100),
      achieved: weekCount >= goals.weekly
    },
    monthly: {
      target: goals.monthly,
      current: monthCount,
      progress: Math.min(100, (monthCount / goals.monthly) * 100),
      achieved: monthCount >= goals.monthly
    },
    streak: {
      target: goals.streak,
      current: currentStreak,
      progress: Math.min(100, (currentStreak / goals.streak) * 100),
      achieved: currentStreak >= goals.streak
    }
  }
}

const generateProductivityInsights = (history, metrics) => {
  if (history.length === 0) return []
  
  const insights = []
  
  // Time pattern analysis
  const hourCounts = {}
  history.forEach(p => {
    const hour = new Date(p.date).getHours()
    hourCounts[hour] = (hourCounts[hour] || 0) + 1
  })
  
  const bestHour = Object.keys(hourCounts).reduce((a, b) => 
    hourCounts[a] > hourCounts[b] ? a : b)
  
  if (bestHour) {
    const period = bestHour < 12 ? 'mañana' : bestHour < 18 ? 'tarde' : 'noche'
    insights.push({
      type: 'time_pattern',
      title: `Tu mejor momento: ${period}`,
      description: `Eres más productivo alrededor de las ${bestHour}:00`,
      icon: bestHour < 12 ? '🌅' : bestHour < 18 ? '☀️' : '🌙',
      actionable: true,
      suggestion: `Programa tareas importantes para las ${bestHour}:00`
    })
  }
  
  // Weekly pattern analysis
  const dayNames = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']
  const dayCounts = {}
  history.forEach(p => {
    const day = new Date(p.date).getDay()
    dayCounts[day] = (dayCounts[day] || 0) + 1
  })
  
  const bestDay = Object.keys(dayCounts).reduce((a, b) => 
    dayCounts[a] > dayCounts[b] ? a : b)
  
  if (bestDay !== undefined) {
    insights.push({
      type: 'day_pattern',
      title: `Día estrella: ${dayNames[bestDay]}`,
      description: `Los ${dayNames[bestDay]}s son tu día más productivo`,
      icon: '📅',
      actionable: true,
      suggestion: `Planifica sesiones intensas los ${dayNames[bestDay]}s`
    })
  }
  
  // Focus quality insight
  const focusScore = (metrics.focusQualityIndex || 0) * 10
  if (focusScore >= 80) {
    insights.push({
      type: 'focus_quality',
      title: 'Enfoque excepcional',
      description: `Tu calidad de enfoque es del ${Math.round(focusScore)}%`,
      icon: '🎯',
      actionable: false,
      suggestion: 'Mantén estas excelentes prácticas'
    })
  } else if (focusScore < 60) {
    insights.push({
      type: 'focus_improvement',
      title: 'Oportunidad de mejora',
      description: 'Tu enfoque puede fortalecerse con práctica',
      icon: '💪',
      actionable: true,
      suggestion: 'Prueba técnicas de respiración antes de cada sesión'
    })
  }
  
  // Streak insights
  const currentStreak = streakDays()
  if (currentStreak === 0) {
    insights.push({
      type: 'streak_start',
      title: 'Inicia tu racha',
      description: 'Una sesión hoy puede comenzar una gran racha',
      icon: '🔥',
      actionable: true,
      suggestion: 'Completa al menos un pomodoro para empezar'
    })
  } else if (currentStreak >= 3 && currentStreak < 7) {
    insights.push({
      type: 'streak_momentum',
      title: 'Momentum creciente',
      description: `${currentStreak} días consecutivos. ¡El hábito se fortalece!`,
      icon: '⚡',
      actionable: true,
      suggestion: 'No rompas la cadena. Una sesión hoy mantiene el momentum'
    })
  }
  
  return insights
}

const calculateWeeklyComparison = (history) => {
  const now = new Date()
  const thisWeekStart = new Date(now.getTime() - (now.getDay() * 24 * 60 * 60 * 1000))
  const lastWeekStart = new Date(thisWeekStart.getTime() - (7 * 24 * 60 * 60 * 1000))
  const lastWeekEnd = new Date(thisWeekStart)
  
  const thisWeekCount = history.filter(p => {
    const date = new Date(p.date)
    return date >= thisWeekStart
  }).length
  
  const lastWeekCount = history.filter(p => {
    const date = new Date(p.date)
    return date >= lastWeekStart && date < lastWeekEnd
  }).length
  
  const change = thisWeekCount - lastWeekCount
  const percentage = lastWeekCount > 0 ? Math.round((change / lastWeekCount) * 100) : 0
  
  return {
    thisWeek: thisWeekCount,
    lastWeek: lastWeekCount,
    change,
    percentage,
    trend: change > 0 ? 'up' : change < 0 ? 'down' : 'stable'
  }
}

const calculateMonthlyTrend = (history) => {
  const now = new Date()
  const months = []
  
  for (let i = 0; i < 3; i++) {
    const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0)
    
    const count = history.filter(p => {
      const date = new Date(p.date)
      return date >= monthStart && date <= monthEnd
    }).length
    
    months.push({
      month: monthStart.toLocaleDateString('es', { month: 'long', year: 'numeric' }),
      count,
      monthIndex: now.getMonth() - i
    })
  }
  
  return months.reverse()
}

// Enhanced metrics aggregation
export const getMetrics = () => {
  const baseMetrics = getBaseMetrics()
  const motivationalData = getMotivationalInsights()
  
  return {
    ...baseMetrics,
    ...motivationalData
  }
}

const getBaseMetrics = () => {
  const pomodoroHistory = JSON.parse(localStorage.getItem('pomodoroHistory') || '[]')
  const totalPomodoros = pomodoroHistory.length
  const totalFocusTime = totalPomodoros * 25 // minutes
  
  // Calculate FQI based on pomodoro sessions
  const sessions = listSessions().filter(s => s.source === 'pomodoro')
  const { minQ1, minQ2, minQ3, minQ4 } = minutesByQuadrantForWeek()
  const focusQualityIndex = fqi({ minQ1, minQ2, minQ3, minQ4 })
  
  return {
    totalPomodoros,
    totalFocusTime,
    focusQualityIndex,
    streakDays: streakDays(),
    weeklyFQI: weeklyFQI().value
  }
}

// Goal management functions
export const updateGoals = (newGoals) => {
  const currentGoals = JSON.parse(localStorage.getItem('pomodoroGoals') || '{}')
  const updatedGoals = { ...currentGoals, ...newGoals }
  localStorage.setItem('pomodoroGoals', JSON.stringify(updatedGoals))
  logEvent('goals_updated', newGoals)
  return updatedGoals
}

export const getGoals = () => {
  return JSON.parse(localStorage.getItem('pomodoroGoals') || '{}')
}
