import React from 'react'

export default function SettingsPanel({ theme, onThemeToggle }){
  return (
    <section aria-label="Ajustes" style={{
      position:'relative', minHeight:'70vh',
      margin:'max(16px, env(safe-area-inset-top)) auto 80px',
      padding:'24px 16px', maxWidth:720,
      background:'var(--surface)', border:'1px solid var(--surface-border)', color:'var(--surface-text)',
      borderRadius:16
    }}>
      <h2 style={{marginTop:0}}>Configuraciones</h2>
      <div style={{display:'flex', alignItems:'center', gap:12}}>
        <label htmlFor="theme-switch"><strong>Tema</strong></label>
        <button id="theme-switch" type="button"
          onClick={onThemeToggle}
          aria-label={theme==='dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
          style={{
            padding:'8px 12px', borderRadius:10, border:'1px solid var(--surface-border)',
            background:'transparent', color:'var(--surface-text)', cursor:'pointer'
          }}
        >{theme==='dark' ? 'Oscuro' : 'Claro'}</button>
      </div>
    </section>
  )
}
