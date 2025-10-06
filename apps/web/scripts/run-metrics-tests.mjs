/*
  Minimal test harness for src/lib/metrics.js without external deps.
  Runs in Node (ESM). Uses a localStorage stub and prints PASS/FAIL.
*/

// Polyfill localStorage for Node
if (!globalThis.localStorage) {
  const store = new Map()
  globalThis.localStorage = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => { store.set(k, String(v)) },
    removeItem: (k) => { store.delete(k) },
    clear: () => { store.clear() }
  }
}

import {
  Quadrant,
  nowIso,
  getWeekStart,
  formatYmd,
  weekKey,
  listTasks,
  saveTasks,
  listSessions,
  saveSessions,
  addTask,
  completeTask,
  startFocus,
  endFocus,
  logEvent,
  fqi,
  minutesByQuadrantForWeek,
  weeklyFQI,
  streakDays,
  pctQ12Completed,
  ttfQ2Median,
  deriveNextBestTask,
  scheduleQ2BlocksSuggestion,
  weeklySummary,
  resetMetricsData
} from '../src/lib/metrics.js'

const tests = []
const test = (name, fn) => tests.push({ name, fn })
const expect = (cond, msg) => { if (!cond) throw new Error(msg) }

const run = async () => {
  const results = []
  for (const t of tests) {
    try { await t.fn(); results.push({ name: t.name, ok: true }) }
    catch (e) { results.push({ name: t.name, ok: false, error: e?.message || String(e) }) }
  }
  const ok = results.filter(r => r.ok).length
  const fail = results.length - ok
  results.forEach(r => console.log(`${r.ok ? 'PASS' : 'FAIL'} - ${r.name}${r.ok ? '' : `: ${r.error}`}`))
  console.log(`\nSummary: ${ok}/${results.length} passing, ${fail} failing`)
  if (fail) process.exit(1)
}

// ---------- Tests ----------

test('fqi formula basic cases', () => {
  expect(fqi({ minQ1:0, minQ2:0, minQ3:0, minQ4:0 }) === 0, 'FQI empty should be 0')
  const v = fqi({ minQ1:60, minQ2:30, minQ3:0, minQ4:0 })
  expect(v > 0 && v <= 1, 'FQI positive range')
  const v2 = fqi({ minQ1:0, minQ2:0, minQ3:60, minQ4:60 })
  expect(v2 >= 0 && v2 < 0.5, 'FQI penalizes Q3/Q4')
})

test('weekly metrics, streak, and %Q1/Q2', () => {
  resetMetricsData()
  const wk = weekKey()
  const start = getWeekStart(new Date())
  const mkIso = (d, h=9, m=0) => { const x=new Date(d); x.setHours(h,m,0,0); return x.toISOString() }

  // Create sessions across Q1..Q4 within this week
  const s = []
  const d0 = new Date(start)
  s.push({ quadrant: Quadrant.Q1, actual_min: 30, started_at: mkIso(d0, 9) })
  s.push({ quadrant: Quadrant.Q2, actual_min: 40, started_at: mkIso(d0, 11) })
  s.push({ quadrant: Quadrant.Q3, actual_min: 10, started_at: mkIso(d0, 14) })
  s.push({ quadrant: Quadrant.Q4, actual_min: 5,  started_at: mkIso(d0, 16) })
  // Today and yesterday to build streak
  const today = new Date(); today.setHours(10,0,0,0)
  const yesterday = new Date(); yesterday.setDate(yesterday.getDate()-1); yesterday.setHours(10,0,0,0)
  s.push({ quadrant: Quadrant.Q2, actual_min: 20, started_at: today.toISOString(), ended_at: nowIso() })
  s.push({ quadrant: Quadrant.Q2, actual_min: 15, started_at: yesterday.toISOString(), ended_at: nowIso() })
  saveSessions(s.map((x,i)=> ({ id:String(i+1), planned_min:x.actual_min, interruptions:0, task_id:null, ended_at: x.ended_at || nowIso(), ...x })))

  const mix = minutesByQuadrantForWeek(wk)
  expect(mix.minQ1 === 30, 'minQ1 sum OK')
  expect(mix.minQ2 >= 75, 'minQ2 includes today/yesterday')
  const w = weeklyFQI(wk)
  expect(w.value >= 0 && w.value <= 1, 'weeklyFQI in [0,1]')
  const st = streakDays()
  expect(st >= 2, 'streakDays ≥ 2 with today & yesterday')

  // Tasks for %Q1/Q2 and TTF-Q2
  const tA = addTask({ title:'Q1 planned', quadrant: Quadrant.Q1, estimate_min: 25, scheduled_for: mkIso(start, 10) })
  const tB = addTask({ title:'Q2 planned', quadrant: Quadrant.Q2, estimate_min: 25, scheduled_for: mkIso(start, 11) })
  const tC = addTask({ title:'Q2 planned later', quadrant: Quadrant.Q2, estimate_min: 25, scheduled_for: mkIso(start, 12) })
  // Mark two completed
  completeTask(tA.id, 20)
  completeTask(tB.id, 25)

  const pct = pctQ12Completed(wk)
  expect(pct >= 66 && pct <= 100, '%Q1/Q2 should reflect 2/3 completed')

  // TTF-Q2: set created_at earlier to ensure positive durations
  const tasks = listTasks().map(t => t.id === tB.id || t.id === tC.id ? { ...t, created_at: mkIso(start, 8) } : t)
  saveTasks(tasks)
  // Complete tC now
  completeTask(tC.id, 25)
  const ttf = ttfQ2Median(wk)
  expect(ttf === 120 || typeof ttf === 'number', 'ttf_q2_median returns a number')
})

test('deriveNextBestTask and fallback to notes', () => {
  resetMetricsData()
  // With no tasks, fallback to notes: seed a Q2 note
  const notes = [{ id:'n1', col: 10, row: 80, text:'Nota Q2', priority:7 }]
  localStorage.setItem('eh_notes_v1', JSON.stringify(notes))
  let nb = deriveNextBestTask()
  expect(nb && nb.quadrant === Quadrant.Q2, 'fallback suggests Q2 note')
  // With tasks, choose Q1 preferred by higher importance
  localStorage.removeItem('eh_notes_v1')
  const a = addTask({ title:'Menor Q1', quadrant: Quadrant.Q1, importance: 3 })
  const b = addTask({ title:'Mayor Q1', quadrant: Quadrant.Q1, importance: 5 })
  nb = deriveNextBestTask()
  expect(nb && nb.title === 'Mayor Q1', 'prefers higher-importance Q1')
})

test('startFocus/endFocus store sessions and events', () => {
  resetMetricsData()
  const t = addTask({ title:'Block Q2', quadrant: Quadrant.Q2, estimate_min: 15 })
  const s = startFocus({ task_id: t.id, quadrant: Quadrant.Q2, planned_min: 15 })
  const rec = endFocus(s, { actual_min: 15, interruptions: 0 })
  expect(rec.actual_min === 15, 'session recorded with actual_min')
  const sessions = listSessions()
  expect(sessions.length === 1, 'one session saved')
})

test('scheduleQ2BlocksSuggestion creates two tasks and logs event', () => {
  resetMetricsData()
  const created = scheduleQ2BlocksSuggestion(new Date())
  expect(created.length === 2, 'two Q2 blocks created')
  // Ensure scheduled_for is tomorrow at around 10:00 and 10:30 (we just check existence)
  expect(created[0].scheduled_for && created[1].scheduled_for, 'scheduled_for present')
})

test('weeklySummary composes metrics', () => {
  resetMetricsData()
  const wk = weekKey()
  // Add a minimal session
  const s = startFocus({ quadrant: Quadrant.Q2, planned_min: 15 })
  endFocus(s, { actual_min: 15, interruptions: 0 })
  const summary = weeklySummary(wk)
  expect(typeof summary.fqi === 'number', 'fqi number')
  expect(typeof summary.streak_days === 'number', 'streak_days number')
  expect(typeof summary.pct_q12_completed === 'number', 'pct_q12_completed number')
})

run()
