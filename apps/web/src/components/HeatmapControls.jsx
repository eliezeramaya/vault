import React, { useRef } from "react";

export default function HeatmapControls({
  opacity, sigmaPx, radiusPx, reverse,
  onOpacity, onSigma, onRadius, onReverse,
}) {
  const firstControlRef = useRef(null);
  const panel = {
    position: "absolute",
    top: 16, right: 16,
    width: 300, maxWidth: "90vw",
    padding: 14,
    borderRadius: 12,
    background: "rgba(10,12,24,.6)",
    boxShadow: "0 8px 24px rgba(0,0,0,.35)",
    border: "1px solid rgba(255,255,255,.08)",
    color: "#EAEAEA",
    backdropFilter: "blur(10px)",
    WebkitBackdropFilter: "blur(10px)",
    fontFamily: "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto",
    zIndex: 10,
  };
  const row = { display: "grid", gridTemplateColumns: "110px 1fr 64px", alignItems: "center", gap: 10, marginBottom: 10 };
  const label = { fontSize: 12, letterSpacing: .2, opacity: .9 };
  const val = { fontSize: 12, textAlign: "right", opacity: .9 };
  const slider = { width: "100%", accentColor: "#ff6aa8", cursor: "pointer" };
  const toggleWrap = { display: "flex", alignItems: "center", gap: 10, marginTop: 6 };

  const onPanelKeyDown = (e) => {
    if ((e.key === 'Enter' || e.key === ' ') && e.currentTarget === e.target) {
      e.preventDefault();
      firstControlRef.current?.focus();
    }
  };

  return (
    <div
      style={panel}
      role="region"
      aria-labelledby="hudTitle"
      tabIndex={0}
      onKeyDown={onPanelKeyDown}
      title="Controles de heatmap (pulse Enter para enfocar)"
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

      <h2 id="hudTitle" style={{ fontWeight: 700, margin: 0, marginBottom: 8, letterSpacing: .3, fontSize: 14 }}>
        Heatmap • Azul → Rosa → Rojo
      </h2>

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

      <div style={toggleWrap}>
        <input
          id="revPal"
          type="checkbox"
          checked={reverse}
          onChange={(e)=>onReverse(e.target.checked)}
          aria-labelledby="revPalLbl"
          title="Invertir la paleta de colores"
        />
        <label id="revPalLbl" htmlFor="revPal" style={{fontSize:12,opacity:.9,cursor:"pointer"}}>
          Invertir paleta (Rojo → Rosa → Azul)
        </label>
      </div>
    </div>
  );
}
