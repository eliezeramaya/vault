import React from 'react'

export default function HomePanel(){
  return (
    <section aria-label="Inicio" style={{
      position:'relative', minHeight:'70vh',
      margin:'max(16px, env(safe-area-inset-top)) auto 80px',
      padding:'24px 16px', maxWidth:920,
      background:'var(--surface)', border:'1px solid var(--surface-border)', color:'var(--surface-text)',
      borderRadius:16
    }}>
      <h1 style={{marginTop:0}}>Bienvenido a Idea Sphere</h1>
      <p>Elige una vista para comenzar: Matriz Eisenhower o Globo interactivo.</p>
      <ul>
        <li>Usa la barra de navegación fija para moverte entre vistas.</li>
        <li>Presiona H o ? para ver ayuda y atajos.</li>
        <li>El tema y la vista se guardan automáticamente.</li>
      </ul>
    </section>
  )
}
