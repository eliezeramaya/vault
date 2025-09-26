# Idea Sphere App (V2)

Módulo base para un **mapa de ideas esférico** con:
- Islas **flotando** sobre la superficie
- Rutas curvadas tipo “vuelo”
- **Heatmap** GPU (ROJO–ROSA–AZUL) con blur separable
- Panel HUD para **Opacidad / Sigma / Radio / Reverse**

## Requisitos
- Node 18+
- Navegador con WebGL2

## Instalar y ejecutar
```bash
npm install
npm run dev
```
Abre `http://localhost:3000/`.

## Estructura
- `src/components/Globe.jsx` → escena principal (Three.js), islas, arco demo y heatmap
- `src/components/HeatmapControls.jsx` → HUD de controles
- `src/lib/heatmap/HeatmapPass.js` → splatting + blur a textura UV
- `src/lib/heatmap/HeatmapLayer.js` → mezcla del heatmap con paleta **Azul→Rosa→Rojo**
- `src/lib/spherical.js` → utilidades de coordenadas esféricas
- `src/lib/arcs.js` → creación/animación de arcos elevados
- `src/lib/labels.js` → labels MSDF (no usados en esta demo, listos para integrar)

## Notas
- La demo crea 3 islas de ejemplo y un arco animado A→C.
- Arrastra una isla para reposicionarla; el heatmap se actualiza en vivo.
- Ajusta el heatmap con el panel: Opacidad, Sigma (blur), Radio del splat y Reverse (invierte paleta).

> Próximos pasos sugeridos: integrar Supabase, IA de conexiones, y VR WebXR.
