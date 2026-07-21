# Web Workers and Timeout Guards

## Contents
- Timeout Guard Pattern
- Timeout Cleanup on Every Exit Path
- Guard Clause in Timeout Callback
- Mock Worker Pattern
- Testing Timeout Behavior

## Timeout Guard Pattern

When a Web Worker performs long-running computation (e.g., saliency inference), set a `setTimeout` as a safety net. The timeout is **not** the primary flow — the worker message is. If the worker responds first, the timeout must be cleared. If the timeout fires first, it must check that the analyzer is still alive before updating state.

### Timeout Cleanup on Every Exit Path

Clear the timeout ID on **every** termination path: ready, failed, error, and dispose. A stale callback on a disposed object causes errors or memory leaks.

```javascript
// On worker ready
clearTimeout(this.inferenceTimeoutId);
this.inferenceTimeoutId = null;

// On worker failed
clearTimeout(this.inferenceTimeoutId);
this.inferenceTimeoutId = null;

// On worker error event
clearTimeout(this.inferenceTimeoutId);
this.inferenceTimeoutId = null;

// On dispose
clearTimeout(this.inferenceTimeoutId);
this.inferenceTimeoutId = null;
```

### Guard Clause in Timeout Callback

Add a defensive guard inside the timeout callback itself. This catches edge cases where the worker `'error'` event fires but doesn't reach the cleanup code:

```javascript
this.inferenceTimeoutId = setTimeout(() => {
    // Guard: bail if already disposed or worker gone
    if (this.isDisposed || !this.worker) return;

    this.isInferencing = false;
    this.error = 'Saliency analysis timeout';
    this.onComplete();
}, INFERENCE_TIMEOUT_MS);
```

**Rule:** The timeout is a safety net. Always clear it on every exit path AND guard the callback against stale invocations.

## Mock Worker Pattern

When testing worker-dependent code, mock `window.Worker` to capture `onmessage` assignments and fire messages manually. This avoids spawning real workers and enables deterministic control over message timing.

```javascript
let capturedOnMessage = null;
let capturedWorker = null;

function mockWorker() {
    const originalWorker = window.Worker;
    Object.defineProperty(window, 'Worker', {
        configurable: true,
        value: class {
            constructor(url) {
                capturedWorker = this;
            }
            set onmessage(fn) { capturedOnMessage = fn; }
            postMessage(msg) { /* no-op */ }
            terminate() { /* no-op */ }
        }
    });
    return () => {
        Object.defineProperty(window, 'Worker', {
            configurable: true,
            value: originalWorker
        });
    };
}
```

**Key points:**
- Use `Object.defineProperty` with `configurable: true` to replace `window.Worker`
- Capture `onmessage` via a setter to retrieve the message handler
- Capture the worker instance to verify `terminate()` calls
- Always restore the original `Worker` constructor in `afterEach`

### Firing Mock Messages

To simulate the worker sending a message, invoke the captured handler with a synthetic event:

```javascript
// Simulate worker 'ready' message
capturedOnMessage({ data: { type: 'ready' } });

// Simulate worker 'result' message
capturedOnMessage({ data: { type: 'result', saliencyMap: [/* ... */] } });

// Simulate worker 'failed' message
capturedOnMessage({ data: { type: 'failed', error: 'Model load failed' } });
```

## Testing Timeout Behavior

To test timeout behavior without waiting the full production timeout (e.g., 15 seconds):

1. **Override the config** — set `SALIENCY_CONFIG.INFERENCE_TIMEOUT_MS = 50` before creating the analyzer
2. **Mock `window.Worker`** — use the pattern above to capture `onmessage`
3. **Test the happy path** — fire worker message before timeout → verify timeout is cleared
4. **Test the failure path** — fire worker failure before timeout → verify timeout is cleared
5. **Test the timeout path** — let timeout fire with no worker message → verify error state
6. **Test the dispose path** — dispose before timeout → verify timeout is cleared and callback is a no-op

### Example: Happy Path

```javascript
it('clears timeout when worker responds before deadline', () => {
    SALIENCY_CONFIG.INFERENCE_TIMEOUT_MS = 50;
    const restore = mockWorker();
    const analyzer = createSaliencyAnalyzer(image);

    // Fire ready message — should clear the timeout
    capturedOnMessage({ data: { type: 'ready' } });
    capturedOnMessage({ data: { type: 'result', saliencyMap: [1, 2, 3] } });

    expect(analyzer.error).to.be.null;
    expect(analyzer.inferenceTimeoutId).to.be.null; // Timeout was cleared

    restore();
});
```

### Example: Dispose Before Timeout

```javascript
it('disposal prevents timeout callback from updating state', () => {
    SALIENCY_CONFIG.INFERENCE_TIMEOUT_MS = 50;
    const restore = mockWorker();
    const analyzer = createSaliencyAnalyzer(image);

    // Dispose before timeout fires
    analyzer.dispose();

    // Fast-forward past timeout
    await new Promise(r => setTimeout(r, 100));

    // State should not have been mutated by stale callback
    expect(analyzer.error).to.be.null;

    restore();
});
```

## Gotchas

1. **Error message wording** — Use "timeout" (not "timed out") to match test assertions like `.include('timeout')`
2. **Worker `'error'` events** — The `onerror` event on the worker (not a `'failed'` message) can leave timeouts uncleared if not handled. Always attach an `onerror` handler that clears the timeout.
3. **Config override scope** — When overriding `INFERENCE_TIMEOUT_MS` for tests, restore the original value in `afterEach` to avoid affecting other tests.

---

Base directory: `.opencode/skills/building-web-apps/`
