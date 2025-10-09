// Backup & Restore utilities for local (no-backend) persistence
// Keys included:
// - tasks_v1
// - focus_sessions_v1
// - analytics_events_v1
// - eh_notes_v1
// - pomodoroHistory
// - pomodoroGoals
// - vault-theme-preference (theme) & legacy 'theme'
// Extend by adding to PERSISTED_KEYS array.

const PERSISTED_KEYS = [
  'tasks_v1',
  'focus_sessions_v1',
  'analytics_events_v1',
  'eh_notes_v1',
  'pomodoroHistory',
  'pomodoroGoals',
  'vault-theme-preference',
  'theme',
]

/**
 * Export all persisted keys into a structured JSON object
 * @returns {object} snapshot
 */
export function exportData() {
  const snapshot = { version: 1, exportedAt: new Date().toISOString(), data: {} }
  for (const k of PERSISTED_KEYS) {
    try {
      const raw = localStorage.getItem(k)
      if (raw !== null) snapshot.data[k] = JSON.parse(raw)
    } catch {
      /* skip problematic key */
    }
  }
  return snapshot
}

/**
 * Serialize snapshot as a downloadable file
 * @param {object} snapshot result of exportData()
 * @param {string} [filename]
 */
export function downloadSnapshot(snapshot, filename = 'vault-backup.json') {
  try {
    const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    setTimeout(() => {
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    }, 0)
    return true
  } catch (e) {
    console.error('[backup] download failed', e)
    return false
  }
}

/**
 * Import snapshot into localStorage.
 * @param {object} snapshot object returned previously by exportData (or compatible)
 * @param {object} [options]
 * @param {boolean} [options.replace=false] if true, clears existing keys before writing
 * @param {boolean} [options.merge=true] if true and value is object/array, performs a naive merge
 * @returns {{written: string[], skipped: string[]}}
 */
export function importData(snapshot, options = {}) {
  const { replace = false, merge = true } = options
  if (!snapshot || typeof snapshot !== 'object') throw new Error('Invalid snapshot object')
  const data = snapshot.data || snapshot
  const written = []
  const skipped = []
  for (const k of Object.keys(data)) {
    if (!PERSISTED_KEYS.includes(k)) {
      skipped.push(k)
      continue
    }
    try {
      const incoming = data[k]
      if (replace) {
        localStorage.setItem(k, JSON.stringify(incoming))
        written.push(k)
        continue
      }
      const existingRaw = localStorage.getItem(k)
      if (!merge || existingRaw == null) {
        localStorage.setItem(k, JSON.stringify(incoming))
        written.push(k)
      } else {
        try {
          const existing = JSON.parse(existingRaw)
          let merged
          if (Array.isArray(existing) && Array.isArray(incoming)) {
            // Deduplicate by JSON string hash (simple)
            const seen = new Set(existing.map(v => JSON.stringify(v)))
            for (const it of incoming) {
              const sig = JSON.stringify(it)
              if (!seen.has(sig)) (existing.push(it), seen.add(sig))
            }
            merged = existing
          } else if (isPlainObject(existing) && isPlainObject(incoming)) {
            merged = { ...existing, ...incoming }
          } else {
            merged = incoming // fallback overwrite for mismatched types
          }
          localStorage.setItem(k, JSON.stringify(merged))
          written.push(k)
        } catch {
          localStorage.setItem(k, JSON.stringify(incoming))
          written.push(k)
        }
      }
    } catch (e) {
      console.warn('[backup] failed key', k, e)
      skipped.push(k)
    }
  }
  return { written, skipped }
}

function isPlainObject(o) {
  return Object.prototype.toString.call(o) === '[object Object]'
}

/**
 * Convenience: read a File object (from input type=file) and import.
 * @param {File} file
 * @param {object} options importData options
 */
export function importFromFile(file, options = {}) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(reader.error)
    reader.onload = () => {
      try {
        const json = JSON.parse(reader.result)
        const res = importData(json, options)
        resolve(res)
      } catch (e) {
        reject(e)
      }
    }
    reader.readAsText(file)
  })
}

export function clearAllPersisted() {
  for (const k of PERSISTED_KEYS) {
    try {
      localStorage.removeItem(k)
    } catch {}
  }
}

export { PERSISTED_KEYS }
