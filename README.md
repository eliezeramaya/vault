# Vault monorepo

[![Deploy Web to GitHub Pages](https://github.com/eliezeramaya/vault/actions/workflows/pages.yml/badge.svg)](https://github.com/eliezeramaya/vault/actions/workflows/pages.yml)

Demo pública: https://eliezeramaya.github.io/vault/

Este monorepo contiene:

- `apps/web` — SPA/PWA en React + Vite con una Matriz de Eisenhower “liquid-glass”, accesible, con atajos de teclado, filtros y persistencia local.
- `apps/flutter` — Shell Flutter (Android/iOS/Web/Windows) que incrusta la app web publicada.

## Requisitos
- Node 18+
- VS Code (recomendado)
- Flutter 3.22+ (solo si vas a compilar la shell nativa)

## Apps

### apps/web (Matriz de Eisenhower)
Características principales:
- Matriz con cuadrantes y rejilla 96×96, notas tipo “chip” (120px) sin separación visual (GAP=0) y sin superposiciones.
- Pan/zoom y “zoom-to-fit”; reubicación automática si hay colisión; “ping” visual al reencaminar.
- Edición inline con doble clic, entrada rápida inferior, y “peso” (1–10) con teclado/click-outside.
- Filtros persistentes: texto con resaltado, prioridad mínima/máxima, y toggles por cuadrante.
- Atajos de teclado: N/E/Del/Flechas/=/−/0 y ayuda (H/?).
- Accesibilidad: diálogo de bienvenida con focus trap y retorno de foco, live region, skip link, landmarks, focus-visible.
- Theming con variables CSS (light/dark) y PWA (manifest + service worker) con fallback SPA 404.html.

Cómo ejecutar localmente:
```bash
cd apps/web
npm ci
npm run dev   # http://localhost:3000/

# Producción
npm run build
npm run preview -- --port 4173 --strictPort   # http://localhost:4173/vault/
```

Despliegue (GitHub Pages):
- La app está configurada con `base: '/vault/'` y `start_url/scope` en el manifest para servir bajo GitHub Pages.
- El workflow `pages.yml` publica `apps/web/dist` a Pages y genera `404.html` para fallback SPA.

Pruebas E2E (Playwright):
```bash
cd apps/web
npx playwright install    # primera vez
npx playwright test
```

### apps/flutter (Shell)
Contenedor que muestra la web publicada vía WebView/IFrame. Edita la URL en los widgets de `lib/presentation/widgets/`.

## Notas
- El repositorio usa persistencia en `localStorage` (notas, filtros, tema y vista). No hay backend.
- El grid central usa líneas sutiles; se eliminaron bandas rojas visibles en ejes X/Y para un look más limpio.

