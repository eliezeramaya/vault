# Contribución

Commits (Convencional Commits):
- `feat(web): ...`, `fix(web): ...`, `chore(ci): ...`, `docs: ...`, `test(web): ...`, `build(web): ...`, `style(web): ...`

Ramas:
- feature: `feat/<breve-descripcion>` (p.ej., `feat/web-tokens-perf`)
- fix: `fix/<breve-descripcion>`

Verificación local:
```bash
# raíz
npm run format
npm run lint
npm run typecheck:all
npm run build:all

# apps/web
cd apps/web
npm run test
npm run build
npm run analyze:bundle  # genera dist/stats.html
```

Checklist PR:
- [ ] Compila con base `/vault/` y funciona en preview.
- [ ] Lint/Typecheck/Tests OK.
- [ ] Se generan chunks separados y `dist/stats.html`.
- [ ] Contraste y focus visibles en componentes tocados.
- [ ] Descripción incluye cambios, antes/después y riesgos/rollback.
