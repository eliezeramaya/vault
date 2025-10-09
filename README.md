# Vault monorepo

[![Deploy Web to GitHub Pages](https://github.com/eliezeramaya/vault/actions/workflows/deploy-pages.yml/badge.svg)](https://github.com/eliezeramaya/vault/actions/workflows/deploy-pages.yml)

Demo pública: https://eliezeramaya.github.io/vault/

Este monorepo contiene:

- `apps/web` — SPA/PWA en React + Vite con una Matriz de Eisenhower "liquid-glass" y un Timer Pomodoro completo, ambos accesibles con atajos de teclado, filtros y persistencia local.
- `apps/flutter` — Shell Flutter (Android/iOS/Web/Windows) que incrusta la app web publicada.

---
## 🧭 Diagrama de Arquitectura (alto nivel)

```mermaid
graph TD;
  A[UI React (SPA)] --> B[State / Hooks]
  B --> C[LocalStorage Persistencia]
  A --> D[Service Worker / PWA Shell]
  D -->|Cache estático + offline| E[Assets / HTML / Manifest]
  A --> F[Web APIs]
  F --> G[Notifications API]
  F --> H[Web Audio API]
  F --> I[Pointer & Touch Events]
  C --> J[Backup / Export-Import JSON]
  subgraph Dispositivo Cliente
    A;B;C;D;E;F;G;H;I;J
  end
```

**Flujo:** La UI (React) gestiona interacción y estado; la persistencia es local (no hay backend). El Service Worker proporciona PWA (offline + caching) y la exportación permite respaldo manual de datos.

---
## Requisitos
- Node 18+
- VS Code (recomendado)
- Flutter 3.22+ (solo si vas a compilar la shell nativa)

## Instalación local (monorepo)

1) Clonar y preparar hooks

```bash
git clone https://github.com/eliezeramaya/vault.git
cd vault
npm i
```

2) Variables de entorno por app (opcional)

- Copia `.env.example` → `.env` en cada app que lo requiera:
    - `apps/web/.env.example`
    - `apps/flutter/.env.example`

> Nota: `.env` está en `.gitignore`. No lo subas al repo.

3) Ejecutar apps

- Web
    ```bash
    cd apps/web
    npm ci
    npm run dev   # http://localhost:3000/vault/
    ```
- Flutter (shell)
    ```bash
    cd apps/flutter
    flutter pub get
    flutter run
    ```

## Scripts (raíz)

- `npm run lint:all` — Lint para apps (actualmente web) usando ESLint.
- `npm run typecheck:all` — Type-check (TS / JS con `checkJs`) si la app define `tsconfig.json`.
- `npm run build:all` — Build de producción de las apps soportadas (web ahora).
- `npm run e2e:smoke` — Subconjunto rápido de pruebas E2E etiquetadas `@smoke` (no falla el pipeline si aún no hay marcadas).
- `npm run analyze:bundle` — Build de web con reporte de tamaños.
- `npm run format` — Prettier sobre todo el repo.
- `npm run ci:verify` — Cadena DX para PR: lint → typecheck → build → smoke E2E.

Pre-commit: Husky + lint-staged aplica Prettier/ESLint solo a archivos staged.

### Etiquetar tests de smoke
Puedes añadir `test.describe('@smoke', () => { ... })` o `test('@smoke nombre', ...)` en Playwright para incluirlos en el pipeline rápido.

### Flujo recomendado en PR
```bash
npm run ci:verify
```
Esto asegura coherencia con lo que correrá en CI antes de subir cambios.

## Nuevos scripts de tipado estricto (progresivo)

Se añadió `tsconfig.strict.json` en `apps/web` para una migración incremental a TypeScript estricto solo sobre `src/lib` inicialmente.

Scripts:
- `npm run typecheck:strict:web` (raíz) — Ejecuta `tsc -p apps/web/tsconfig.strict.json`.
- `npm run typecheck:strict` (dentro de `apps/web`) — Verificación estricta (JS con `checkJs` + flags adicionales).

Cómo ampliar cobertura estricta:
1. Añade el nuevo directorio a `include` en `tsconfig.strict.json`.
2. (Opcional) Convierte archivos `.jsx` a `.tsx` en ese directorio.
3. Ejecuta `npm run typecheck:strict:web` hasta que no haya errores.
4. Repite por feature.

Beneficios:
- Detectar `undefined` implícitos (`noUncheckedIndexedAccess`).
- Prevenir overrides silenciosos (`noImplicitOverride`).
- Mayor calidad antes de mover todo el repo a `strict` global.

## Workflow E2E completo

Se agregó `.github/workflows/e2e-full.yml` que corre la suite Playwright completa en:
- `workflow_dispatch` (manual desde Actions)
- `schedule` diario 03:00 UTC
- PR etiquetado con label `run-full-e2e`

Uso:
1. Para ejecutar manualmente: Actions → "E2E Full Suite" → Run workflow.
2. Para forzar en un PR: añade label `run-full-e2e`.

Artifacts: sube `apps/web/test-results` (si existen) como artifact `playwright-report`.

## Estrategia de smoke vs full

- `ci:verify` (PRs normales) usa solo pruebas `@smoke` para feedback rápido (< ~10s ahora).
- Full suite se ejecuta en background (cron / bajo demanda) para detectar regresiones profundas.

Criterios para marcar `@smoke`:
- Corre < 5s.
- Cubre camino crítico (tema, creación básica de nota, preloader, etc.).
- No depende de animaciones largas ni random.

## Apps

### apps/web (Matriz de Eisenhower + Pomodoro Timer)

#### 🎯 Matriz de Eisenhower
Características principales:
- Matriz con cuadrantes y rejilla 96×96, notas tipo "chip" (120px) sin separación visual (GAP=0) y sin superposiciones.
- Pan/zoom y "zoom-to-fit"; reubicación automática si hay colisión; "ping" visual al reencaminar.
- Edición inline con doble clic, entrada rápida inferior, y "peso" (1–10) con teclado/click-outside.
- Filtros persistentes: texto con resaltado, prioridad mínima/máxima, y toggles por cuadrante.
- Atajos de teclado: N/E/Del/Flechas/=/−/0 y ayuda (H/?).
- Accesibilidad: diálogo de bienvenida con focus trap y retorno de foco, live region, skip link, landmarks, focus-visible.
- Theming con variables CSS (light/dark) y PWA (manifest + service worker) con fallback SPA 404.html.

#### 🍅 Timer Pomodoro
Sistema completo de productividad integrado con métricas avanzadas:

**Características principales:**
- **Timer circular prominente (280px)** con barra de progreso visual en tiempo real
- **Ciclos automáticos** trabajo/descanso con transiciones suaves
- **Notificaciones del navegador** + audio opcional para eventos importantes
- **Métricas de productividad** con tracking semanal y análisis FQI (Focus Quality Index)
- **Configuración personalizable** con persistencia en localStorage

**UX/UI Avanzada:**
- **Jerarquía visual clara**: Timer prominente, información organizada, configuración colapsable
- **Feedback visual mejorado**: Progreso circular animado, indicadores de fase, transiciones suaves
- **Controles descriptivos**: Botones específicos ("Pausar sesión", "Finalizar sesión") en lugar de genéricos
- **Iconografía consistente**: Cada acción tiene icono + texto descriptivo
- **Estilos por fase**: Colores diferenciados para trabajo (rojo), descanso corto (verde), descanso largo (azul)

**Sistema de Notificaciones:**
- **Navegador**: Alertas automáticas al completar pomodoros/descansos
- **Audio**: Tonos procedurales (acordes musicales) para diferentes eventos
- **Configuración granular**: Control independiente de notificaciones y sonidos
- **Permisos inteligentes**: Manejo automático de permisos del navegador

**Métricas y Analytics:**
- **Tracking automático**: Pomodoros completados, tiempo enfocado, pausas, descansos
- **Integración FQI**: Sesiones contribuyen al Focus Quality Index del sistema
- **Estadísticas semanales**: Vista consolidada de productividad
- **Persistencia completa**: Todas las métricas guardadas localmente

**Modos y Configuración:**
- **Modo test**: Duraciones reducidas (0.1 min) para desarrollo/testing
- **Configuración completa**: Tiempos de trabajo, descansos cortos/largos, intervalos
- **Opciones de flujo**: Auto-inicio de descansos y siguiente trabajo
- **Personalización de notificaciones**: Control independiente de alertas y audio

**Accesibilidad:**
- **ARIA labels**: Etiquetas descriptivas para lectores de pantalla
- **Progreso anunciado**: Timer con `aria-live` para actualizaciones en tiempo real
- **Navegación por teclado**: Todos los controles accesibles por teclado
- **Indicadores visuales**: Estados claros con colores y animaciones

Cómo ejecutar localmente:
```bash
cd apps/web
npm ci
npm run dev   # http://localhost:3000/vault/ (usar base)

# Producción
npm run build
npm run preview -- --port 4173 --strictPort   # http://localhost:4173/vault/
```

Despliegue (GitHub Pages):
- La app está configurada con `base: '/vault/'` y `start_url/scope` en el manifest para servir bajo GitHub Pages.
- El workflow `deploy-pages.yml` publica `apps/web/dist` a Pages y genera `404.html` para fallback SPA.
	- Habilita Pages en Settings → Pages → Source: GitHub Actions.

Pruebas E2E (Playwright):
```bash
cd apps/web
npx playwright install    # primera vez

# Ejecutar todas las pruebas
npx playwright test

# Pruebas específicas
npx playwright test tests/pomodoro.spec.ts                    # Funcionalidad básica
npx playwright test tests/pomodoro-notifications.spec.ts      # Sistema de notificaciones  
npx playwright test tests/pomodoro-control-usability.spec.ts  # UX de controles
npx playwright test tests/pomodoro-visual-feedback.spec.ts    # Feedback visual
```

### apps/flutter (Shell)
Contenedor que muestra la web publicada vía WebView/IFrame. Edita la URL en los widgets de `lib/presentation/widgets/`.

---
## ⌨️ Tabla de Atajos de Teclado

| Atajo | Acción | Contexto | Notas |
|-------|--------|----------|-------|
| N | Crear nueva nota | Matriz | Foco no requerido si panel activo |
| E | Editar nota seleccionada | Matriz | Abre edición inline |
| Delete / Backspace | Eliminar nota seleccionada | Matriz | Confirma silenciosamente |
| Flechas | Navegar notas | Matriz | Cambia foco lógico |
| = / + | Zoom in | Mapa/Matriz | Requiere que vista soporte zoom |
| - | Zoom out | Mapa/Matriz |  |
| 0 | Reset zoom | Mapa/Matriz | Centra y ajusta |
| H / ? | Mostrar ayuda | Global | Toggle del panel de ayuda |
| Esc | Cerrar diálogos / salir de edición | Global | Incluye welcome/help |
| Enter | Confirmar edición / crear | Inputs | Dependiendo del foco |
| Espacio | Pausa/Reanuda timer | Pomodoro | Cuando el foco está en el área del timer |
| P | Pausa/Reanuda timer | Pomodoro | Acceso rápido global (si implementado en listener global) |
| S | Saltar a siguiente fase | Pomodoro | Si timer activo |

> Si añades o modificas un atajo, documenta aquí y en el panel de ayuda dentro de la app.

---
## ♿ Matriz de Accesibilidad (ARIA / Semántica)

| Rol / Atributo | Ubicación | Propósito | Notas |
|----------------|----------|-----------|-------|
| `role="navigation"` / `aria-label="Navegación"` | Barra lateral / inferior | Agrupar links de vistas | Permite landmarks para screen readers |
| `aria-selected` | Botones de vista | Indicar vista activa | Sincronizado con estado `view` |
| `aria-controls` | Botones de vista | Referenciar panel asociado | Facilita relación control-panel |
| `aria-label` (acciones) | Icon buttons (cerrar menú, tema, ayuda) | Texto accesible | Íconos marcan `aria-hidden="true"` |
| `aria-hidden="true"` | Iconos decorativos | Ocultar ruido semántico | Solo visual |
| `aria-live` (polite) | Live region de timer / métricas | Anunciar cambios de progreso | Evita spam con throttling interno |
| `tabindex="0"` estratégico | Notas / chips | Permitir foco y navegación | Coordinado con manejo personalizado de teclado |
| Focus trapping | Diálogo de bienvenida | Mantener foco dentro | Retorno al invocador al cerrar |
| Skip link | Layout root | Saltar a contenido principal | Mejora navegación keyboard |
| `aria-pressed` / `aria-checked` | Toggles / filtros | Estado binario | Visual + semántico |

> Revisa atributos periódicamente para evitar divergencias tras refactors.

---
## 📱 Checklist de Optimizaciones Móviles

Archivo detallado: [`MOBILE_OPTIMIZATIONS.md`](./MOBILE_OPTIMIZATIONS.md)

| Item | Estado | Notas |
|------|--------|-------|
| Targets táctiles ≥44px | ✅ | Botones navegación 56–64px, acciones 44px |
| Pinch-to-zoom | ✅ | Gestos en panel/matriz |
| Long press creación | ✅ | Crear notas |
| Double tap reset | ✅ | Reset de zoom |
| Swipe navegación | ✅ | Cambia vistas (NavRail) |
| Swipe-to-dismiss notifs | ✅ | NotificationCenter |
| Passive listeners | ✅ | `addEventListener(..., { passive: true })` donde aplica |
| Throttling de gestos | ✅ | Interno en hooks de zoom/pan |
| Safe areas | ✅ | CSS env(safe-area-inset-*) |
| Reduce motion | ✅ | Respeta `prefers-reduced-motion` |
| Haptic feedback | 🔄 | Parcial, falta cobertura completa |
| Tutorial gestos | 🔄 | Onboarding planificado |

---
## Arquitectura Técnica

### Frontend (React + Vite)
- **Framework**: React 18 con hooks modernos
- **Build**: Vite con optimizaciones para producción
- **Styling**: CSS variables para theming, animaciones CSS3
- **PWA**: Service Worker + Manifest para instalación

### Sistema de Métricas
- **Almacenamiento**: localStorage con claves estructuradas
- **Analytics**: Sistema de eventos para tracking de uso
- **Integración**: Métricas de Pomodoro alimentan el FQI general
- **Persistencia**: Todas las configuraciones y datos guardados localmente

### Audio System
- **Web Audio API**: Generación procedural de tonos de notificación
- **Acordes musicales**: Diferentes progresiones para eventos específicos
- **Gestión de contexto**: Creación/destrucción apropiada de AudioContext
- **Fallback**: Manejo graceful cuando la API no está disponible

### Notificaciones
- **Notification API**: Notificaciones nativas del navegador
- **Gestión de permisos**: Solicitud automática con respaldo a preferencias
- **Auto-close**: Cierre automático después de 5 segundos
- **Configuración persistente**: Preferencias guardadas en localStorage

## Estructura del Proyecto

```
vault/
├── apps/
│   ├── web/                     # SPA/PWA React + Vite
│   │   ├── src/
│   │   │   ├── features/        # Arquitectura feature-first (map, matrix, focus, navigation, onboarding)
│   │   │   ├── components/      # Componentes pequeños compartidos (en migración)
│   │   │   ├── lib/             # Utilidades compartidas (p.ej., heatmap)
│   │   │   └── styles/          # Estilos globales
│   │   ├── vite.config.js       # Extiende de config/vite.base.mjs
│   │   └── tsconfig.json        # Extiende de config/tsconfig.base.json
│   └── flutter/                 # Shell nativo con WebView/IFrame
│       └── lib/
│           ├── widgets/         # WebContainer y vistas por pestaña
│           └── services/        # DeepLinkService para rutas del SPA
├── config/                      # Config compartida (Vite/ESLint/Prettier/TS)
├── scripts/                     # Utilidades (lint-all, typecheck-all, analyze-bundle)
├── .husky/                      # Hooks de git (pre-commit con lint-staged)
└── .editorconfig                # Consistencia de estilo en editores
```

## Modelo de branching

- `main`: rama estable, siempre desplegable.
- branch de trabajo: `feat/…`, `fix/…`, `chore/…` según el cambio.
- PRs hacia `main` con descripción clara y checks verdes (lint, typecheck, build).

Convención de commits (sugerida): `tipo(scope): descripción` — p.ej. `feat(web): code-split SphereMap`.

## CI/CD

- GitHub Actions: `deploy-pages.yml` despliega `apps/web` a GitHub Pages (ruta `/vault/`).
- Validaciones sugeridas (pendiente de agregar):
    - Lint + typecheck en PR
    - Build de producción
    - (Opcional) Tests unitarios/E2E

## Notas
- El repositorio usa persistencia en `localStorage` (notas, filtros, tema, vista y métricas Pomodoro). No hay backend.
- El grid central usa líneas sutiles; se eliminaron bandas rojas visibles en ejes X/Y para un look más limpio.
- El timer Pomodoro está completamente integrado con el sistema de métricas existente.
- Todas las notificaciones respetan las preferencias del usuario y permisos del navegador.

## Troubleshooting
- Vite dev sin base: si accedes a http://localhost:3000/ en dev y ves rutas rotas, usa http://localhost:3000/vault/ o lanza `vite` con `--base=/vault/`.
- Preview: si el puerto 4173 está ocupado, puedes usar `npm run preview -- --port 4321 --strictPort` y abrir http://localhost:4321/vault/.
- GitHub Pages 404: asegúrate de que existe `apps/web/dist/404.html` (se genera en postbuild) y que el repositorio tiene Pages activado con Actions.
- Notificaciones bloqueadas: si las notificaciones no aparecen, verifica los permisos del navegador en Configuración.
- Audio no funciona: el audio requiere interacción del usuario; haz clic en "Probar sonido" primero.

## Roadmap Futuro

### Mejoras Planificadas
- **Estadísticas avanzadas**: Gráficos de productividad, tendencias semanales/mensuales
- **Temas personalizados**: Más opciones de colores y estilos
- **Integración con calendario**: Sincronización con Google Calendar/Outlook
- **Modos de enfoque**: Diferentes tipos de sesiones (código, lectura, brainstorming)
- **Sonidos personalizados**: Carga de archivos de audio personalizados
- **Backup/sync**: Exportación e importación de datos de métricas

### Contribuciones
Las contribuciones son bienvenidas. Por favor:
1. Ejecuta las pruebas E2E antes de crear un PR
2. Mantén la cobertura de pruebas para nuevas funcionalidades
3. Sigue las convenciones de UX/UI establecidas
4. Documenta cambios importantes en este README

## Licencia
MIT License - ver archivo LICENSE para detalles.

## Modo Radial (Experimental β)

Se añadió un modo **Radial β** opcional en el panel Eisenhower que representa notas en torno a un "pozo gravitacional" central:

- Radio inverso al peso (prioridad + tiempo estimado derivado de longitud de texto por ahora).
- Tamaño (escala) progresiva en función de w.
- Distribución angular por cuadrantes conservando la semántica original.
- Resolución básica de colisiones mediante espiral incremental.

Activación: botón "Radial β" en la esquina superior derecha del panel.

Limitaciones actuales (Fase 2):
- Tiempo (t) se aproxima por longitud de texto (placeholder).
- Sin animaciones de transición todavía.
- Heurística para importante/urgente: prioridad alta sugiere ambos (se refinará).

Roadmap:
1. Atributo de duración real por nota.
2. Blending multiplicativo para peso y animaciones suaves.
3. Optimización spatial index para >500 notas.
4. KPI overlay ampliado (overlap %, estabilidad).

### Gravity Mode (Experimental β)
Nuevo modo experimental de matriz gravitacional:
- Peso = combinación prioridad (70%) + tiempo estimado (30%).
- Radio inverso al peso (más peso ⇒ más cerca del centro).
- Escala del recuadro crece con w^γ.
- Editor inline: slider prioridad 1–10 + chips rápidas de tiempo (15/25/50/90/120m).
- Índice de Acción diario: suma de pesos frente a objetivo.
- Atajos (en modo gravity):
  - N: nueva tarea (hereda defaults)
  - P: incrementar prioridad seleccionada (+1)
  - T: abrir editor de tiempo de tarea enfocada
  - G: centrar / reset origin
  - Z: zoom fit (pendiente si se añade zoom)
- aria-live announcements para cambios de prioridad/tiempo.

