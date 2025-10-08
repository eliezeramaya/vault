# Web App — Matriz de Eisenhower (SPA/PWA)

Aplicación React + Vite con una matriz de Eisenhower “liquid‑glass”, accesible y con persistencia local.

## Requisitos
- Node 18+
- Navegador moderno

## Instalar y ejecutar
```bash
npm ci
npm run dev      # http://localhost:3000/vault/ (usar base)

# Producción
npm run build
npm run preview -- --port 4173 --strictPort   # http://localhost:4173/vault/
```

## Características
- 96×96 celdas virtuales; chips de 120px sin separación visual (GAP=0) y sin solapamientos.
- Pan/zoom/zoom‑to‑fit; reencaminado con “ping” cuando hay colisión; keep‑out en ejes centrales (invisible).
- Doble clic para crear y editar inline; entrada rápida inferior; “peso” (1–10) con teclado/click‑outside.
- Filtros persistentes: texto (con resaltado), rango de prioridad y toggles por cuadrante.
- Atajos: N/E/Del/Flechas/=/−/0 y ayuda (H/?).
- Accesibilidad: Welcome con focus trap, live region, landmarks, skip link, focus visible.
- Theming light/dark con variables CSS; PWA (service worker + manifest) y 404.html para SPA.

## Tokens de color (estables)
Disponibles en ambos temas (claro/oscuro) como variables CSS:
- Superficies: `--surface`, `--surface-border`, `--surface-text`
- Elevación: `--elevation-0`, `--elevation-1`, `--elevation-2`
- Acento: `--accent`, `--accent-hover`, `--accent-pressed`, `--on-accent`, `--focus-ring`
- Estado: `--ok` (éxito), `--warning`, `--danger`

Ejemplos de uso:
```css
.btn-primary { background: var(--accent); color: var(--on-accent); border: none; }
.btn-primary:hover { background: var(--accent-hover); box-shadow: var(--elevation-1); }
.btn-primary:active { background: var(--accent-pressed); box-shadow: var(--elevation-2); }
.card { background: var(--surface); color: var(--surface-text); border: 1px solid var(--surface-border); }
.focus-ring:focus-visible { outline: 2px solid var(--focus-ring); outline-offset: 2px; }
```

## Estructura principal
- `src/App.jsx` — App shell, temas y navegación.
- `src/features/matrix/EisenhowerPanel.jsx` — Lógica/visual de la matriz y notas.
- `src/features/focus/{FocusLoopContext.jsx, FocusLoopContext.test.jsx, FocusLoopBar.jsx}` — Contexto, tests y barra de foco.
- `src/features/map/{Globe.jsx, SphereMap.jsx, HeatmapControls.jsx, EditIslandSheet.jsx}` — Visualización 2D/3D y HUD del mapa.
- `src/features/navigation/Sidebar.jsx` — Menú lateral responsivo.
- `src/lib/**` — Utilidades compartidas (p.ej. `lib/heatmap/**`).
- `src/styles/**` — Estilos globales y tokens.
- `src/components/**` — Pequeños componentes compartidos (evitar un “components/” gigante); en migración.
- `src/tests` — Playwright E2E (atajos, no‑overlap, live region).

Importar por feature (ejemplos):

```js
import EisenhowerPanel from './features/matrix/EisenhowerPanel'
import { FocusLoopProvider } from './features/focus/FocusLoopContext'
import FocusLoopBar from './features/focus/FocusLoopBar'
import Globe from './features/map/Globe'
import SphereMap from './features/map/SphereMap'
import Sidebar from './features/navigation/Sidebar'
```

## Despliegue (GitHub Pages)
- Configurado con `base: '/vault/'` y `start_url/scope` en el manifest.
- Workflow `deploy-pages.yml` publica `dist` y añade `404.html` como fallback SPA.

## Notas
- Estructura “feature‑first”: el código nuevo vive en `src/features/<feature>/...` y lo compartido en `src/{lib,styles,components}`.
- El directorio `src/components/` se mantendrá pequeño (solo piezas reutilizables). Las vistas/flows residen en `src/features/...`.
- Las vistas 3D (globo/heatmap) están bajo `src/features/map/`. La vista por defecto sigue siendo la matriz.

## Métricas personales (FQI, Streak, %Q1/Q2)

Incluye un panel de hábitos ligero para auto-seguimiento:

- Temporizador de foco con 1 clic y chips 15/25/45m.
- Termómetro FQI semanal (0–1) con flecha vs semana anterior.
- Scorecard semanal con FQI, Streak de días y % Q1/Q2 completadas.
- CTA para programar 2 bloques Q2 para mañana 10:00.

Datos locales en `localStorage`:

- `tasks_v1`: tareas (id, quadrant, estimate_min, scheduled_for, completed_at).
- `focus_sessions_v1`: sesiones (planned_min, actual_min, quadrant, started_at, ended_at).
- `analytics_events_v1`: eventos (focus_start/end, task_complete, intention_add_block, suggestion_accepted).

FQI (Focus Quality Index):

FQI = (Min_Q1 + 0.8·Min_Q2 − 0.4·(Min_Q3 + Min_Q4)) / Min_totales, clamp 0..1.

Resetear datos: limpiar `localStorage` del navegador o llamar a `resetMetricsData()` en la consola.
