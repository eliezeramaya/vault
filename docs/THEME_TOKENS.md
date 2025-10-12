# Theme Tokens (Liquid Glass)

Tokens definidos en `apps/web/src/styles/tokens.css` (RGB para soportar alpha):

Colores básicos:
- `--bg`, `--fg`, `--accent`, `--glass`, `--glass-alpha`

Escala neutral (0–900) para superficies y bordes.

Forma/Profundidad:
- `--radius-xl`, `--radius-2xl`, `--shadow-glass`, `--blur-glass`

Dark/Light:
- Controlado por `html[data-theme="dark|light"]`. Asegura contraste ≥ 4.5:1 sobre superficies `glass` con texto.

Accesibilidad:
- `@media (prefers-reduced-motion: reduce)` desactiva animaciones/transiciones.
- Enfocado visible: `.glass-card:focus-visible` define outline + offset.

Tailwind mapping:
- `bg`, `fg`, `accent`, `glass` → `rgb(var(--token) / <alpha-value>)` en `tailwind.config.js`.

Uso:
- Utiliza `.glass-card` (apps/web/src/styles/glass.css) para tarjetas translúcidas con blur/sombra/borde sutil.
- Evita HEX hardcodeado; usa variables CSS o clases de Tailwind basadas en tokens.
