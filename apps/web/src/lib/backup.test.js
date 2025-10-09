import { describe, it, expect } from 'vitest'
import { exportData, importData } from './backup'

// Polyfill minimal localStorage for JSDOM if needed (Vitest/jsdom already provides, but safeguard):
if (typeof localStorage === 'undefined') {
  global.localStorage = {
    _d: {},
    getItem(k) {
      return Object.prototype.hasOwnProperty.call(this._d, k) ? this._d[k] : null
    },
    setItem(k, v) {
      this._d[k] = String(v)
    },
    removeItem(k) {
      delete this._d[k]
    },
    clear() {
      this._d = {}
    },
  }
}

const SAMPLE = {
  tasks_v1: [{ id: 't1', title: 'Test', quadrant: 'Q2' }],
  focus_sessions_v1: [{ id: 's1', actual_min: 25 }],
  analytics_events_v1: [{ name: 'focus_start', ts: '2025-10-08T00:00:00Z' }],
  eh_notes_v1: [{ id: 1, text: 'Nota' }],
  pomodoroHistory: [{ date: '2025-10-08T00:00:00Z' }],
  pomodoroGoals: { daily: 4 },
  'vault-theme-preference': 'dark',
  theme: 'dark',
}

describe('backup export/import', () => {
  it('exports empty when nothing stored', () => {
    localStorage.clear()
    const snap = exportData()
    expect(Object.keys(snap.data).length).toBe(0)
    expect(snap.version).toBe(1)
  })

  it('imports (replace) and exports snapshot', () => {
    localStorage.clear()
    importData({ data: SAMPLE }, { replace: true })
    const snap = exportData()
    for (const k of Object.keys(SAMPLE)) {
      expect(snap.data[k]).toBeDefined()
    }
  })

  it('merges arrays without duplicating entries', () => {
    localStorage.clear()
    importData({ data: SAMPLE }, { replace: true })
    importData(
      {
        data: {
          tasks_v1: [
            { id: 't1', title: 'Test', quadrant: 'Q2' },
            { id: 't2', title: 'Nuevo', quadrant: 'Q1' },
          ],
        },
      },
      { replace: false, merge: true },
    )
    const snap = exportData()
    expect(snap.data.tasks_v1.length).toBe(2)
  })
})
