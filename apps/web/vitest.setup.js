// Basic setup for jsdom tests
// Ensure localStorage exists for metrics functions
if (typeof window !== 'undefined' && !window.localStorage) {
  const store = new Map()
  window.localStorage = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => { store.set(k, String(v)) },
    removeItem: (k) => { store.delete(k) },
    clear: () => { store.clear() }
  }
}

// Quieter console for tests; keep errors
const origWarn = console.warn
console.warn = (...args) => {
  if (/theme|cleanup|ignore/i.test(String(args[0] || ''))) return
  origWarn(...args)
}
