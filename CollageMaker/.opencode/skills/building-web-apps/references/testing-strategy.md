# Testing Strategy

## Contents
- Deferred Feature Tests
- Pure Function Testing
- Cache API Gotchas
- Gotchas
- Testing Strategy for Deduplication
- Assertion Density

## Deferred Feature Tests

For deferred features (PWA, ML saliency, responsive CSS), tests serve as requirements documentation:

- **Unit tests for pure functions** pass immediately (no browser API dependencies)
- **E2E tests** document expected behavior but will fail until the feature ships
- **Deferred tests** include clear comments explaining what's needed
- **Test numbering** follows the priority plan sections for traceability

```javascript
it('3.5.3.1 — Style.css: @media rules (deferred — documents requirement)', () => {
    // Responsive media queries are a deferred feature.
    // This test documents the requirement: @media rules should be added
    // for mobile (<768px) and tablet (<1200px) breakpoints.
    expect(css).to.be.a('string');
    expect(css.length).to.be.greaterThan(100);
});
```

**Rules:**
1. Label tests as **"deferred"** in the test name
2. Verify base selectors exist (`.main-layout`, `.sidebar`, `#previewCanvas`)
3. Comment with `TODO` for the future assertion
4. **Never assert on features that don't exist yet** — causes CI failures

### Pure Function Testing

Design browser-dependent utilities as pure functions that can be unit tested without browser APIs. Example: PWA cache utilities (`PWACacheUtils.js`) export pure functions for URL routing, cache key computation, and manifest validation — all testable in Mocha without a service worker context.

### Cache API Gotchas

- **No built-in eviction** — The Cache API has no LRU eviction or size limits. Implement eviction logic in the service worker `activate` event.
- **Opaque responses cannot be cached** — Cross-origin requests without CORS headers return `response.type === 'opaque'`. `caches.put()` throws `TypeError` on opaque responses. Always check `response.type !== 'opaque'` before caching.

## Gotchas

1. **CORS for ES modules** — Tests must run on HTTP server, not `file://`
2. **Viewport resize waits** — After `setViewportSize()`, use `waitForSelector('#app', { state: 'visible' })` to wait for Vue re-render, not `waitForTimeout()`. Fixed timeouts are fragile.
3. **`mocha.run()` timing** — Must be after all `describe` blocks
4. **`waitForTimeout()` is fragile** — Use assertion-based waits in Playwright. For viewport resizes, wait for `#app` visibility instead.
5. **Canvas is opaque** — Can't inspect canvas pixels directly in Playwright
6. **Undo history is crop-only** — Only crop operations push undo commands. Image removal, layout changes, gutter adjustments, and other actions do NOT create undo history. The `#undoBtn` and `#redoBtn` use `:disabled="!canUndo"` / `:disabled="!canRedo"` bindings, so they stay disabled if no undo commands exist on the stack.
7. **Chai CDN lacks plugins** — No `eventually` for async or `startWith` for strings. Use try/catch and regex.
8. **TitleManager formatting toggles are independent** — `toggleBold()` only affects bold; `toggleItalic()` only affects italic; `toggleUnderline()` only affects underline. Each toggle preserves the other two flags. (Fixed 2026-07-17 Phase 1: `applyFormattingToRange` now uses `'prop' in formatting` instead of `formatting.prop !== undefined` to distinguish "toggle this property" from "preserve this property".)
9. **Mock restore discipline** — Always restore mocked browser APIs in `finally` blocks. A leaking mock breaks all subsequent tests.
10. **E2E dev server port** — Full session tests require dev server on port 8000 and are sensitive to Vue mount timing.
11. **Hit test boundary points** — For a 2x2 grid, (50%, 50%) lands on all four panel boundaries. Use 25% or 75% offsets.
12. **`networkidle` timeouts** — `waitUntil: 'networkidle'` in test runners times out when tests include `fetch()` for non-existent resources. Use `domcontentloaded` + `waitForSelector('#mocha', { state: 'attached' })` instead.
13. **World-review catches gaps** — An external reviewer asks "What edge cases are not covered?" and often discovers missing tests for combined formatting, default behavior, property state, and exact positioning. Schedule world-review for all P1 test files before marking them complete.
14. **Registry signature alignment** — Test the dispatcher → strategy integration path, not just the strategy in isolation. A misaligned strategy signature silently corrupts output (e.g., quality passed where exportSize is expected).
15. **Barrel export verification** — Test barrel exports explicitly: `expect(typeof barrel.exportToJpeg).to.equal('function')`. A re-export of a non-existent name silently yields `undefined`.
16. **DragEvent.dataTransfer is unmockable** — Cannot pass custom `dataTransfer` to `DragEvent` constructor. Test listener presence via `preventDefault()` tracking instead.
17. **Document-level listeners leak across tests** — Listeners on `document` persist between Mocha tests. Use describe-level `afterEach` cleanup, never `beforeEach` + per-test setup (causes accumulation).
18. **RAF mock must be bound** — `window.requestAnimationFrame.bind(window)` preserves `this`. Without bind, restoring the original fails in strict mode. Always restore in `afterEach`.
19. **Read state inside RAF callback** — When debouncing with RAF, capture state at frame time, not call time. Reading at call time produces stale values during rapid interactions.
20. **Null inputs crash browser API utilities** — `FileReader.readAsDataURL(null)` throws `TypeError`. Always guard: `if (!file) return Promise.resolve(null)`.
21. **Worker timeout guards** — Always clear `setTimeout` IDs on every exit path (ready, failed, error, dispose). Guard the callback with `if (this.isDisposed || !this.worker) return;`. See `references/web-workers.md`.
22. **TouchEvent requires real Touch objects** — Cannot create `Touch` instances from JS. Use `Object.defineProperty` on a plain `Event` to set `touches`/`targetTouches`/`changedTouches`. Mock TouchLists need `length`, indexed access, `item()`, and `Symbol.iterator`. See `references/testing-e2e.md` TouchEvent section.
23. **Multi-touch: exactly 2 fingers, not 2+** — Mobile OSes reserve 3-finger gestures for system navigation (iOS: back/forward; Android: split-screen). Check `e.touches.length !== 2` and cancel gesture if count deviates.

## Testing Strategy for Deduplication

When extracting a shared utility from N duplicated implementations, follow this 4-step testing approach:

1. **Test the utility in isolation** — happy path, error paths, null inputs
2. **Test the barrel export** — verify the re-export resolves to a function: `expect(typeof barrel.loadImageFromFile).to.equal('function')`
3. **Test the consumers still work** — the existing test suite should catch regressions
4. **Verify line count reduction** — document how many lines were eliminated

This strategy ensures the extracted utility is correct on its own, properly wired through the module system, and doesn't break existing callers.

## Assertion Density

Rule of thumb: unit tests average 2-3 assertions per test. E2E tests average fewer assertions since each interaction is expensive. Grep-based counting (`grep -c 'expect(' file`) is a quick way to estimate coverage.
