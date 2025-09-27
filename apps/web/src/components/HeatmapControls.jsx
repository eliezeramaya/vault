import React, { useEffect, useRef, useState } from "react";

export default function HeatmapControls({
  // Calor
  opacity, sigmaPx, radiusPx, reverse,
  onOpacity, onSigma, onRadius, onReverse,
  // Vista
  autoRotate, showGrid, showLabels,
  onAutoRotate, onShowGrid, onShowLabels,
  onHelp
}) {
  const firstControlRef = useRef(null);
  const [isCompact, setIsCompact] = useState(false);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    // Activate compact mode on small screens
    const mq = window.matchMedia('(max-width: 640px)');
    const update = () => setIsCompact(mq.matches);
    update();
    mq.addEventListener ? mq.addEventListener('change', update) : mq.addListener(update);
    return () => { mq.removeEventListener ? mq.removeEventListener('change', update) : mq.removeListener(update); };
  }, []);

  useEffect(() => {
    // Collapse by default in compact mode; expand by default on desktop
    setExpanded(!isCompact);
  }, [isCompact]);

  const panel = isCompact ? {
    position: 'absolute',
    left: 'max(12px, env(safe-area-inset-left))',
    right: 'max(12px, env(safe-area-inset-right))',
    bottom: 'max(12px, env(safe-area-inset-bottom))',
    padding: '10px',
    borderRadius: 14,
    background: 'rgba(10,12,24,.72)',
    boxShadow: '0 8px 24px rgba(0,0,0,.45)',
    border: '1px solid rgba(255,255,255,.08)',
    color: '#EAEAEA',
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
    fontFamily: 'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto',
  zIndex: 20,
    touchAction: 'manipulation'
  } : {
    position: "absolute",
    top: 'max(16px, env(safe-area-inset-top))',
    right: 'max(16px, env(safe-area-inset-right))',
    width: 'min(92vw, 320px)',
    padding: '12px',
    borderRadius: 12,
    background: "rgba(10,12,24,.6)",
    boxShadow: "0 8px 24px rgba(0,0,0,.35)",
    border: "1px solid rgba(255,255,255,.08)",
    color: "#EAEAEA",
    backdropFilter: "blur(10px)",
    WebkitBackdropFilter: "blur(10px)",
    fontFamily: "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto",
  zIndex: 20,
  };
  const row = { display: "grid", gridTemplateColumns: "96px 1fr 56px", alignItems: "center", gap: 12, marginBottom: 12 };
  const label = { fontSize: 12, letterSpacing: .2, opacity: .9 };
  const val = { fontSize: 12, textAlign: "right", opacity: .9 };
  const slider = { width: "100%", height: 44, accentColor: "#ff6aa8", cursor: "pointer", touchAction: 'none', WebkitAppearance:'none', background:'transparent' };
  const toggleWrap = { display: "flex", alignItems: "center", gap: 10, marginTop: 6 };

  return (
    <div
      style={panel}
      role="region"
      aria-labelledby="hudTitle"
      data-hud
    >
      <style>{`
        [data-hud] input:focus-visible, [data-hud] label:focus-visible, [data-hud] button:focus-visible {
          outline: 2px solid #F0375D;
          outline-offset: 2px;
          border-radius: 6px;
        }
        .sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0, 0, 1px, 1px); white-space: nowrap; border: 0; }
      `}</style>

      <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', gap:8, marginBottom: isCompact ? 4 : 8}}>
        <h2 id="hudTitle" style={{ fontWeight: 700, margin: 0, letterSpacing: .3, fontSize: 14 }}>Controles</h2>
        <div style={{display:'flex', gap:12}}>
          <button
            type="button"
            onClick={onHelp}
            title="Ver onboarding"
            aria-label="Abrir guía rápida"
            style={{ background:'transparent', color:'#9fb4ff', border:'1px solid rgba(159,180,255,.35)', padding:'10px 12px', minWidth:44, minHeight:44, borderRadius:10, fontSize:14, cursor:'pointer' }}
          >¿?</button>
          {isCompact && (
            <button
              type="button"
              onClick={()=> setExpanded(v=>!v)}
              aria-expanded={expanded}
              aria-controls="hudControlsBody"
              title={expanded? 'Colapsar controles' : 'Expandir controles'}
              style={{ background:'transparent', color:'#EAEAEA', border:'1px solid rgba(255,255,255,.25)', padding:'10px 12px', minWidth:44, minHeight:44, borderRadius:10, fontSize:14, cursor:'pointer' }}
            >{expanded? '▼' : '▲'}</button>
          )}
        </div>
      </div>
      {!isCompact && (
      <button
        type="button"
        onClick={() => firstControlRef.current?.focus()}
        style={{
          background:'transparent', color:'#9fb4ff', border:'1px dashed rgba(159,180,255,.35)',
          padding:'4px 8px', borderRadius:8, fontSize:12, cursor:'pointer', marginBottom:8
        }}
        aria-label="Enfocar el primer control del panel"
      >Enfocar controles</button>
      )}

      {/* Body */}
      <div id="hudControlsBody" style={{ display: expanded ? 'block' : 'none' }}>
      {/* Sección: Calor */}
      <div style={{marginTop:8, marginBottom:10}}>
  <div style={{fontSize:12, fontWeight:800, letterSpacing:.3, opacity:.9, marginBottom:8, textTransform:'uppercase'}}>Calor</div>

      <div style={row}>
        <label htmlFor="opacityRange" style={label}>Opacidad</label>
        <input
          id="opacityRange"
          ref={firstControlRef}
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={opacity}
          onChange={(e)=>onOpacity(parseFloat(e.target.value))}
          style={slider}
          aria-label="Opacidad del heatmap"
          aria-valuemin={0}
          aria-valuemax={1}
          aria-valuenow={Number.isFinite(opacity) ? Number(opacity.toFixed(2)) : 0}
          title="Opacidad del heatmap"
        />
        <div style={val} aria-live="polite" aria-atomic="true">{opacity.toFixed(2)}</div>
      </div>

      <div style={row}>
        <label htmlFor="sigmaRange" style={label}>Sigma (blur)</label>
        <input
          id="sigmaRange"
          type="range"
          min="6"
          max="64"
          step="1"
          value={sigmaPx}
          onChange={(e)=>onSigma(parseInt(e.target.value,10))}
          style={slider}
          aria-label="Desenfoque del heatmap"
          aria-valuemin={6}
          aria-valuemax={64}
          aria-valuenow={sigmaPx}
          title="Desenfoque del heatmap"
        />
        <div style={val} aria-live="polite" aria-atomic="true">{sigmaPx}px</div>
      </div>

      <div style={row}>
        <label htmlFor="radiusRange" style={label}>Radio splat</label>
        <input
          id="radiusRange"
          type="range"
          min="8"
          max="72"
          step="1"
          value={radiusPx}
          onChange={(e)=>onRadius(parseInt(e.target.value,10))}
          style={slider}
          aria-label="Radio de cada splat"
          aria-valuemin={8}
          aria-valuemax={72}
          aria-valuenow={radiusPx}
          title="Radio de cada splat"
        />
        <div style={val} aria-live="polite" aria-atomic="true">{radiusPx}px</div>
      </div>

      <div style={{...toggleWrap, gap:12}}>
        <input
          id="revPal"
          type="checkbox"
          checked={reverse}
          onChange={(e)=>onReverse(e.target.checked)}
          aria-labelledby="revPalLbl"
          title="Invertir la paleta de colores"
          style={{ width:24, height:24 }}
        />
        <label id="revPalLbl" htmlFor="revPal" style={{fontSize:12,opacity:.9,cursor:"pointer", padding:'10px 8px', borderRadius:8}}>
          Invertir paleta (Rojo → Rosa → Azul)
        </label>
      </div>
      </div>

      {/* Sección: Vista */}
      <div style={{marginTop:12}}>
  <div style={{fontSize:12, fontWeight:800, letterSpacing:.3, opacity:.9, marginBottom:8, textTransform:'uppercase'}}>Vista</div>
        <div style={{display:'grid', gap:12}}>
          <label htmlFor="autoRot" style={{display:'flex', alignItems:'center', gap:12, fontSize:12, opacity:.9, cursor:'pointer'}}>
            <input id="autoRot" type="checkbox" checked={autoRotate} onChange={(e)=>onAutoRotate(e.target.checked)} style={{width:24,height:24}} />
            Rotación automática
          </label>
          <label htmlFor="showGrid" style={{display:'flex', alignItems:'center', gap:12, fontSize:12, opacity:.9, cursor:'pointer'}}>
            <input id="showGrid" type="checkbox" checked={showGrid} onChange={(e)=>onShowGrid(e.target.checked)} style={{width:24,height:24}} />
            Grid de referencia
          </label>
          <label htmlFor="showLabels" style={{display:'flex', alignItems:'center', gap:12, fontSize:12, opacity:.9, cursor:'pointer'}}>
            <input id="showLabels" type="checkbox" checked={showLabels} onChange={(e)=>onShowLabels(e.target.checked)} style={{width:24,height:24}} />
            Etiquetas de islas
          </label>
        </div>
      </div>
      </div>
    </div>
  );
}
