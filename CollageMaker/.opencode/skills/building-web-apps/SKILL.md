---
name: building-web-apps
description: Build static web apps with Vue 3 Options API, Canvas 2D rendering, ES modules, and CDN-loaded libraries. No build step, no bundler. Use when working on CollageMaker web app features, rendering, state management, or testing.
---

# Building Web Apps

This skill covers patterns for the CollageMaker web app: Vue 3 Options API, Canvas 2D rendering, ES modules, and the Midiestro3D project pattern.

## Project Pattern

**Single HTML entry point, ES modules, no build step.** All code loads via `<script type="module">` from CDN or local files. No bundler, no transpilation, no build step.

## Key References

Consult these files for verified patterns and gotchas:

- `references/vue-options-api.md` — Vue 3 Options API factory decomposition
- `references/canvas-2d.md` — Canvas 2D rendering and DPR scaling
- `references/es-modules.md` — ES module conventions and barrel exports
- `references/testing.md` — Mocha/Chai unit tests and Playwright E2E

## Core Conventions

### ES Modules
- Named exports only, no default exports
- Barrel exports in `MyESModules/index.js`
- Relative imports with `.js` extension

### Factory Functions
- Create instances via factory functions, not classes
- Plain objects for data models
- Pure functions for layout math

### Vue 3 Options API
- Factory decomposition: `createCollageApp()` assembles data/methods/lifecycle/services
- Reactive state in Vue `data()` return value
- State managers receive Vue instance reference

### Canvas 2D
- Lifecycle pattern: `init()` → `resize()` → `scheduleRender()` → `dispose()`
- DPR scaling for sharp rendering on Retina displays
- `requestAnimationFrame` for debounced renders

### Testing
- Mocha + Chai via CDN for unit tests (browser-based)
- Playwright for E2E tests
- Test HTML files in `MyComponents/`

## Learnings

Check `_agent_docs/learnings/` for hard-won knowledge from past sessions.
