# Nube 3D — Estrellas + Esferas wire + Líneas

Proyecto listo para abrir en VS Code y correr en un servidor estático.

## Requisitos
- Navegador moderno (ESM).
- No requiere `npm install`. Usa `three` desde CDN vía import maps.
- Recomendado en VS Code: extensión **Live Server** o **Simple Browser**.

## Cómo correr
1. Abrir la carpeta en VS Code.
2. Servir `index.html` con Live Server (o cualquier servidor estático).
3. Abrir en el navegador y usar el panel de la izquierda.

## Controles
- **Mouse**: rotar / zoom / pan (OrbitControls).
- **Teclas**: `1/2/3` alternan capas, `G` alterna aristas, `R` regenera, `H` oculta panel.
- **UI**: tamaños por capa, brillo global, modo aditivo, color por capa, grosor/color de aristas.

## Export
- `nodes.json` y `edges.json` con `seed` para reproducibilidad.

## Estructura
- `index.html` — toda la app (HTML/CSS/JS) en un solo archivo para simplicidad.
