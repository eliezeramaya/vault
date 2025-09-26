# timmr_sphere (monorepo)

[![Web - Build & Deploy](https://github.com/eliezeramaya/vault/actions/workflows/web-deploy.yml/badge.svg)](https://github.com/eliezeramaya/vault/actions/workflows/web-deploy.yml)

Public site: https://eliezeramaya.github.io/vault/

Apps:
- `apps/web` — React + Three.js (esfera + heatmap RPB).
- `apps/flutter` — Shell Flutter (Android/iOS/Web/Windows) que incrusta la web.

## Requisitos
- Node 18+
- Flutter 3.22+ (Android/iOS/Web/Windows)
- VS Code

## Flujo recomendado
1) Desarrolla 3D en `apps/web`.
2) Publica `apps/web` a GitHub Pages (workflow incluido).
3) Apunta `apps/flutter` (WebView/IFrame) a la URL publicada de la web.
4) Compila Flutter para Android/iOS/Web/Windows.

## Primer push
```bash
git init
git add .
git commit -m "chore(repo): bootstrap monorepo sphere"
git branch -M main
git remote add origin <tu_repo_git>
git push -u origin main
```
