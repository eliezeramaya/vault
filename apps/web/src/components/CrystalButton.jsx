import React from 'react'

export default function CrystalButton({ children, style, ...props }){
  const base = {
    width:120,
    height:120,
    borderRadius:10,
    border:'1px solid rgba(255,255,255,0.4)',
    display:'flex',
    alignItems:'center',
    justifyContent:'center',
    background:'transparent',
    backdropFilter:'blur(10px) saturate(1.2) brightness(1.1)',
    WebkitBackdropFilter:'blur(10px) saturate(1.2) brightness(1.1)',
    transition:'all 0.6s ease',
    position:'relative',
    overflow:'hidden',
    color:'#EAEAEA',
    cursor:'pointer'
  }
  return (
    <button className="crystal-btn" {...props} style={{...base, ...style}}>
      {children}
    </button>
  )
}
