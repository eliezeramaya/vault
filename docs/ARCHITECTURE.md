# Architecture

Feature-first with boundaries. Each feature exposes a public API via `index.ts` (barrel) and hides internals in subfolders:

- ui/ presentational components
- logic/ hooks and state
- model/ types and selectors
- services/ storage/api

Imports across features must go through the feature barrel, not deep paths.
