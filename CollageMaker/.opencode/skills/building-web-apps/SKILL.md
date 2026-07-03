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

- `references/vue-options-api.md` — Vue 3 Options API factory decomposition, provide() timing, @mousedown.prevent
- `references/canvas-2d.md` — Canvas 2D rendering, DPR scaling, offscreen export
- `references/es-modules.md` — ES module conventions and barrel exports
- `references/rich-text-runs.md` — Run-based text formatting, merge/split algorithm
- `references/testing.md` — Mocha/Chai unit tests and Playwright E2E
- `references/midiestro-pattern.md` — Entry point pattern, shared infrastructure, directory structure
- `references/css-layout.md` — Flex column chain, `min-height: 0` requirement, CollageMaker flex tree

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
- Mock browser APIs by intercepting `document.createElement` and `localStorage` (bind original, always restore)
- Chai CDN lacks `eventually` and `startWith` — use try/catch and regex

## Feature Development Workflow

1. Identify the domain (Vue, Canvas, Layout, State, Export) and read the relevant reference
2. Write new logic as a factory function in the appropriate `MyESModules/` subdirectory
3. Wire into the Vue app via the matching config module (`createCollageData`, `createCollageMethods`, etc.)
4. Add tests in `MyComponents/` (unit) or Playwright (E2E)
5. Verify: run `node scripts/run-tests.js`, check dev server, confirm no regressions

## Quick Reference

- **Vue:** `provide()` runs before `mounted()` — lazy services are null. Use getter functions or `this.manager` access. Use `@mousedown.prevent` on toolbar buttons that operate on text selection.
- **Canvas export:** Always wrap `URL.createObjectURL` + `a.click()` in `try/finally` to prevent memory leaks.
- **Run processing:** Never use `break` in run-processing loops — it drops subsequent runs. Use a flag. Always merge after mutations.
- **CSS flex:** Every `flex: 1` item inside a `flex-direction: column` container needs `min-height: 0`. Same for `min-width: 0` in row containers. See `references/css-layout.md` for the CollageMaker flex chain.
- **Testing:** TitleManager `toggleBold()` flips all three formatting flags (bold+italic+underline) due to `undefined` fallback. Test actual behavior. Mock browser APIs with `bind()` and always restore. Chai CDN lacks `eventually`/`startWith`.

---

Base directory for this skill: `.opencode/skills/building-web-apps/`
Relative paths in this skill are relative to this base directory.
