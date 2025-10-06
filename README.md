# Vault monorepo

[![Deploy Web to GitHub Pages](https://github.com/eliezeramaya/vault/actions/workflows/deploy-pages.yml/badge.svg)](https://github.com/eliezeramaya/vault/actions/workflows/deploy-pages.yml)

Demo pública: https://eliezeramaya.github.io/vault/

Este monorepo contiene:

- `apps/web` — SPA/PWA en React + Vite con una Matriz de Eisenhower "liquid-glass" y un Timer Pomodoro completo, ambos accesibles con atajos de teclado, filtros y persistencia local.
- `apps/flutter` — Shell Flutter (Android/iOS/Web/Windows) que incrusta la app web publicada.

## Requisitos
- Node 18+
- VS Code (recomendado)
- Flutter 3.22+ (solo si vas a compilar la shell nativa)

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
apps/web/src/
├── components/
│   ├── PomodoroPanel.jsx        # Timer principal con UI completa
│   ├── HomePanel.jsx            # Matriz de Eisenhower
│   └── App.jsx                  # Aplicación principal con tabs
├── lib/
│   └── metrics.js               # Sistema de métricas y analytics
├── styles/
│   └── globals.css              # Estilos globales + variables CSS
└── tests/
    ├── pomodoro.spec.ts                    # Pruebas de funcionalidad básica
    ├── pomodoro-notifications.spec.ts      # Pruebas de notificaciones
    ├── pomodoro-control-usability.spec.ts  # Pruebas de UX/controles
    └── pomodoro-visual-feedback.spec.ts    # Pruebas de feedback visual
```

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

