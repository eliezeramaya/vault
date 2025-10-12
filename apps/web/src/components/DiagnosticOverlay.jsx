// DiagnosticOverlay.jsx - Temporary debugging component
import React, { useState, useEffect } from 'react'
import { getSafeStorage } from '../lib/safeStorage'

export default function DiagnosticOverlay() {
  const [show, setShow] = useState(false)
  const [diagnostics, setDiagnostics] = useState({})

  useEffect(() => {
    if (!show) return

    const store = getSafeStorage()
    const diag = {
      storageType: store.__memory ? 'Memory (Private Mode)' : 'localStorage',
      notesKey: null,
      notesValid: false,
      notesCount: 0,
      notesData: null,
      allKeys: [],
    }

    try {
      const notesRaw = store.getItem('eh_notes_v1')
      diag.notesKey = notesRaw ? 'EXISTS' : 'MISSING'

      if (notesRaw) {
        const notes = JSON.parse(notesRaw)
        diag.notesValid = Array.isArray(notes)
        diag.notesCount = notes.length
        diag.notesData = notes
      }
    } catch (err) {
      diag.notesKey = 'CORRUPTED'
      diag.error = err.message
    }

    // List all keys
    for (let i = 0; i < localStorage.length; i++) {
      diag.allKeys.push(localStorage.key(i))
    }

    setDiagnostics(diag)
  }, [show])

  // Toggle with Ctrl+Shift+D
  useEffect(() => {
    const handler = (e) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'D') {
        e.preventDefault()
        setShow((s) => !s)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  if (!show) return null

  return (
    <div
      style={{
        position: 'fixed',
        top: 10,
        right: 10,
        zIndex: 99999,
        background: 'rgba(0,0,0,0.95)',
        color: '#0f0',
        padding: 20,
        borderRadius: 8,
        border: '2px solid #0f0',
        maxWidth: 500,
        maxHeight: '80vh',
        overflow: 'auto',
        fontFamily: 'monospace',
        fontSize: 11,
      }}
    >
      <div style={{ marginBottom: 10, display: 'flex', justifyContent: 'space-between' }}>
        <strong style={{ color: '#ff0' }}>🔍 DIAGNÓSTICO</strong>
        <button
          onClick={() => setShow(false)}
          style={{
            background: '#f00',
            color: '#fff',
            border: 'none',
            padding: '2px 8px',
            borderRadius: 4,
            cursor: 'pointer',
          }}
        >
          X
        </button>
      </div>

      <div style={{ marginBottom: 15 }}>
        <div>
          <strong>Tipo de Storage:</strong> {diagnostics.storageType}
        </div>
        <div>
          <strong>eh_notes_v1:</strong>{' '}
          <span style={{ color: diagnostics.notesValid ? '#0f0' : '#f00' }}>
            {diagnostics.notesKey}
          </span>
        </div>
        {diagnostics.notesValid && (
          <div>
            <strong>Notas encontradas:</strong> {diagnostics.notesCount}
          </div>
        )}
        {diagnostics.error && (
          <div style={{ color: '#f00' }}>
            <strong>Error:</strong> {diagnostics.error}
          </div>
        )}
      </div>

      <div style={{ marginBottom: 15 }}>
        <strong>Todas las claves ({diagnostics.allKeys?.length || 0}):</strong>
        <ul style={{ margin: '5px 0', paddingLeft: 20, maxHeight: 100, overflow: 'auto' }}>
          {diagnostics.allKeys?.map((key) => (
            <li key={key}>{key}</li>
          ))}
        </ul>
      </div>

      {diagnostics.notesData && (
        <div>
          <strong>Datos de notas:</strong>
          <pre
            style={{
              background: '#111',
              padding: 10,
              borderRadius: 4,
              maxHeight: 200,
              overflow: 'auto',
              fontSize: 10,
            }}
          >
            {JSON.stringify(diagnostics.notesData, null, 2)}
          </pre>
        </div>
      )}

      <div style={{ marginTop: 15, padding: 10, background: '#222', borderRadius: 4 }}>
        <strong style={{ color: '#ff0' }}>Acciones:</strong>
        <div style={{ marginTop: 8 }}>
          <button
            onClick={() => {
              localStorage.clear()
              alert('✅ localStorage limpiado. Recarga la página.')
            }}
            style={{
              background: '#f00',
              color: '#fff',
              border: 'none',
              padding: '6px 12px',
              borderRadius: 4,
              cursor: 'pointer',
              marginRight: 8,
            }}
          >
            🗑️ Limpiar TODO
          </button>
          <button
            onClick={() => {
              localStorage.removeItem('eh_notes_v1')
              alert('✅ eh_notes_v1 eliminado. Recarga la página.')
            }}
            style={{
              background: '#f90',
              color: '#fff',
              border: 'none',
              padding: '6px 12px',
              borderRadius: 4,
              cursor: 'pointer',
            }}
          >
            🗑️ Limpiar Solo Notas
          </button>
        </div>
      </div>

      <div style={{ marginTop: 10, opacity: 0.6, fontSize: 9 }}>
        Presiona <kbd>Ctrl+Shift+D</kbd> para cerrar
      </div>
    </div>
  )
}
