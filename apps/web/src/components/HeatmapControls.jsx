import React from "react";

export default function HeatmapControls({
  opacity, sigmaPx, radiusPx, reverse,
  onOpacity, onSigma, onRadius, onReverse,
}) {
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

  return (
    <div style={panel} role="region" aria-label="Heatmap controls">
      <div style={{ fontWeight: 700, marginBottom: 8, letterSpacing: .3 }}>
        Heatmap • Azul → Rosa → Rojo
      </div>

      <div style={row}>
        <div style={label}>Opacidad</div>
        <input type="range" min="0" max="1" step="0.01" value={opacity} onChange={(e)=>onOpacity(parseFloat(e.target.value))} style={slider} aria-label="Opacidad del heatmap" />
        <div style={val}>{opacity.toFixed(2)}</div>
      </div>

      <div style={row}>
        <div style={label}>Sigma (blur)</div>
        <input type="range" min="6" max="64" step="1" value={sigmaPx} onChange={(e)=>onSigma(parseInt(e.target.value,10))} style={slider} aria-label="Desenfoque del heatmap" />
        <div style={val}>{sigmaPx}px</div>
      </div>

      <div style={row}>
        <div style={label}>Radio splat</div>
        <input type="range" min="8" max="72" step="1" value={radiusPx} onChange={(e)=>onRadius(parseInt(e.target.value,10))} style={slider} aria-label="Radio de cada splat" />
        <div style={val}>{radiusPx}px</div>
      </div>

      <div style={toggleWrap}>
        <input id="revPal" type="checkbox" checked={reverse} onChange={(e)=>onReverse(e.target.checked)} aria-labelledby="revPalLbl" />
        <label id="revPalLbl" htmlFor="revPal" style={{fontSize:12,opacity:.9,cursor:"pointer"}}>
          Invertir paleta (Rojo → Rosa → Azul)
        </label>
      </div>
    </div>
  );
}
