# Web Audio Scheduling

Production patterns from Metronomad's `MyESModules/Playback/playbackEngine.js` and `MyESModules/Audio/clickBuffers.js`, tested in `MyComponents/PlaybackEngineTest.html`.

## Contents
- "A Tale of Two Clocks" scheduling shape
- Terminal events vs. poll-driven state transitions (the race)
- Generation/epoch guards
- Single terminal event convention
- Test harness: fake context/clock/RAF/timers
- Testing synthesized audio (zero-crossing frequency, tail silence)

## "A Tale of Two Clocks" Scheduling Shape

Web Audio has one precise clock (`context.currentTime`) but browsers give you no per-note timer. The proven shape (no Tone.js needed) splits the work:

- **Immediate precision start** — sources with a fixed, known start time are `start(when, offset)`-ed *immediately* at the call site (one deterministic call, sample-accurate). Don't schedule these through the loop.
- **Lookahead loop for the rest** — a `setInterval` tick (~25 ms) walks a precomputed schedule and creates+starts any source whose time has entered the horizon (`now + ~100 ms`). Sources are created just-in-time so a stop can cancel notes that were never created.

```javascript
function _schedulerTick() {
    if (_state !== ENGINE_STATES.COUNTING_IN || !_seq) return;
    const horizon = _clock.currentTime + lookaheadSec; // 100 ms
    for (const click of _seq.clicks) {
        // Monotonic `scheduled` flag: each click scheduled exactly once —
        // no duplicates, no gaps across tick boundaries.
        if (!click.scheduled && click.time <= horizon) {
            _scheduleClick(click);
        }
    }
    // Visible state follows the audio clock crossing the song-start time.
    if (_clock.currentTime >= _seq.songStart.time) {
        _setState(ENGINE_STATES.PLAYING);
    }
}
```

- **Precompute the schedule as pure data** (`buildSchedule({ tP, bpm, countInBeats, offset })` → clicks + songStart). The tick only performs it. Pure schedule math is independently unit-testable.
- **Phase/position are pure functions of the audio clock**, never accumulated per-frame (accumulated values drift and break after a suspend/resume). Expose a "beat grid" (`{ firstBeatTime, interval }`) and compute phase per RAF: `phase = f(now, grid.firstBeatTime, grid.interval)`.
- **Watch context state** (~250 ms interval): `suspended`/`interrupted` → self-stop + notify once. The one-shot guarantee comes from clearing the watch interval in teardown — not from an extra flag.
- **One `createSource` choke point** — every source is created through a single function so tests can fake the context and record every start/stop/connect.

## Terminal Events vs. Poll-Driven State Transitions (the race)

**A state machine whose visible state transitions on a poll (interval tick) but whose sequence termination is event-driven (sample-accurate `onended`) has a race window: the terminal event can arrive before the flip tick runs.**

Concrete trigger: a song offset leaving less than one tick period (~25 ms) of audio. The song starts at `songStart.time` and ends 20 ms later. The next 25 ms tick (the one that would flip `countingIn → playing`) has not run when `onended` fires — state is still `countingIn`. A terminal handler guarded by `if (_state !== PLAYING) return;` silently drops the event: the sources are dead but the engine is frozen in `countingIn` forever. This was found in review, not by a test — the GREEN suite was fully passing. The fix was one RED test + one guard clause.

**The rule: a terminal handler must accept the event from every state the sequence can legitimately be in — not just the "expected" one.**

```javascript
_songSource.onended = () => {
    if (gen !== _generation) return; // stale (cross-sequence rejection)
    // countingIn included: if the offset leaves < one tick of song,
    // onended can arrive before the flip tick ran — no frozen state.
    if (_state !== ENGINE_STATES.PLAYING && _state !== ENGINE_STATES.COUNTING_IN) return;
    _teardown();
    _state = ENGINE_STATES.STOPPED;
    _emit('ended');
};
```

General form: for any sequence with states `A → B → (terminal event) T`, the handler for T must accept **A and B** (every state reachable after the sequence started and before T), and only reject states belonging to a *different* generation/sequence. Generation/epoch guards handle cross-sequence rejection; state guards should not double as the primary rejection mechanism for the sequence's own events.

**When it does NOT apply:**
- Transitions driven by the same event clock as the terminations (everything flipped inside one handler) — no window exists.
- Sequences where the remaining duration is provably longer than the tick period by construction — the window is theoretical (the guard is still cheap; add it anyway).

**Testing the window:** the edge case is cheap to force — pick an offset within ~one tick of the buffer's end, advance the fake clock past song start *without ticking the scheduler*, fire `onended`, assert the sequence terminated.

## Generation/Epoch Guards

For atomic start/stop/restart with no lock: every sequence start bumps a `_generation` counter; async callbacks (onended, ticks) capture theirs at creation and no-op if stale. Makes Play/Stop mashing safe: after N mash cycles, firing every stale `onended` produces zero events.

**Capture-order gotcha:** capture the generation **after** the operation that may bump it, or don't guard on it at all.

- `onended` handler: capture `const gen = _generation` *after* `_teardown()` in the start path → gen equals the live generation → guard works.
- A watch tick that captured `gen` *before* calling `_teardown()` (which increments) → `gen !== _generation` was always true → the callback was silently dead. The one-shot guarantee was actually coming from the watch interval being cleared in teardown — the generation check was both wrong and unnecessary.

Be deliberate about **which mechanism provides the one-shot guarantee** (epoch vs. resource cleanup) and don't stack a broken second one.

## Single Terminal Event Convention

Terminal events are single (`'ended'` / `'previewEnded'`), not preceded by a `'stopped'`. The state silently becomes `stopped` and the terminal event is the one `onStateChange` call. Emitting both `'stopped'` and `'ended'` was caught by an event-log assertion — pin the exact event sequence in tests (`expect(events).to.deep.equal(['countingIn', 'playing', 'ended'])`).

## Test Harness: Fake Context/Clock/RAF/Timers

Engine tests instantiate **ZERO real AudioContext** (the only real-context block is the buffer-render test — see below). Every dependency is injectable:

- **Every time read goes through `clock.currentTime`** (defaults to `context`) — the fake clock is advanced by hand:
  ```javascript
  function createFakeClock(t = 0) {
      const clock = { get currentTime() { return clock._t; } };
      clock._t = t;
      clock.set = (v) => { clock._t = v; };
      clock.advance = (dt) => { clock._t += dt; };
      return clock;
  }
  ```
- **Fake RAF** — callback collector with `flush()` / `cancelRaf` / `pendingCount()` (same pattern as the existing `flushRAF` debounce-test pattern in `testing-unit.md`).
- **Fake timers** — `setInterval`/`clearInterval` spies with manual ticks. `tickWithMs(ms)` ticks only the interval matching a period, so tests drive the scheduler (25 ms) and the context watch (250 ms) independently. `count()` asserts cleanup.
- **Fake AudioContext** — `createBufferSource`/`createGain` return recording stubs. Each source records `startedWith: { when, offset, duration }`, `stopped`, `disconnected`, `connectCalls`. The context keeps `sources`, `gains`, and — the key piece — **`calls`: a shared ordered log** of every `start`/`stop`. This is the Web-Audio analogue of the "Canvas Render Order Testing via Context Method Wrapping" pattern in `testing-unit.md`:

  ```javascript
  // Ordering contract: old song source stopped BEFORE the new one starts.
  const stopIdx = context.calls.findIndex(c => c.type === 'stop' && c.source === songOld);
  const startIdx = context.calls.findIndex(c => c.type === 'start' && c.source === songNew);
  expect(stopIdx).to.be.lessThan(startIdx);
  ```

- **Source selection helpers** distinguish sources by their recorded start args:
  ```javascript
  const songSources  = (ctx) => ctx.sources.filter(s => s.startedWith && s.startedWith.offset !== undefined);
  const clickSources = (ctx) => ctx.sources.filter(s => s.startedWith && s.startedWith.offset === undefined);
  const liveSources  = (ctx) => ctx.sources.filter(s => s.startedWith && !s.stopped);
  ```
- **One `makeEngine(overrides)` factory** wires one engine to one set of fakes and returns `{ engine, context, clock, timers, fakeRAF, events, frames, interrupted, tickScheduler, tickWatch }`. Callbacks (`onStateChange`, `onInterrupted`, `onFrame`) append to plain arrays — event-log assertions are `deep.equal` on the array, which pins the *exact* sequence.
- **Stale-callback assertion** — after a mash of start/stop cycles, fire `onended` on every song source ever created and assert the event log is unchanged (generation guard works).
- **Lookahead invariant test** — step the fake clock across every tick boundary; every source must have `when ∈ (now, now + horizon]` at the moment it first appears.

## Testing Synthesized Audio

### Zero-Crossing Frequency Assertion

"Assert the buffers are different" (object identity) is weak — it passes even if both buffers encode the same frequency. To recover the dominant frequency from raw samples without an FFT or new tooling, count zero crossings (~10 lines, exact for pure tones — which click buffers and beeps are):

```javascript
const dominantFreq = (buf) => {
    const data = buf.getChannelData(0);
    let crossings = 0;
    for (let i = 1; i < data.length; i++) {
        if ((data[i - 1] < 0 && data[i] >= 0) || (data[i - 1] >= 0 && data[i] < 0)) crossings++;
    }
    return crossings / 2 / buf.duration; // full cycles per second
};
expect(dominantFreq(accent)).to.be.within(1400, 1700);   // ~1568 Hz
expect(dominantFreq(regular)).to.be.within(900, 1200);   // ~1047 Hz
```

- **Assert with tolerance bands, not exact values** — a 60 ms window at 44.1 kHz contains ~94 cycles, so the estimate is accurate to roughly ±1 cycle (~±10 Hz); the attack ramp + decay envelope slightly distort edge crossings. ±10–15% bands keep the test deterministic while still failing if the frequency constant is wrong or the buffers are swapped.
- **It tests the artifact, not the configuration.** Also assert the constant (`expect(CLICK.ACCENT_FREQ).to.equal(1568)`) — the constant pins *intent*, the zero-crossing assertion pins that the *render actually used it*. The constant can drift from the render.
- **Pairs with a tail-silence assertion** for click artifacts: `Math.max(...[...data.slice(-32)].map(Math.abs)) < 0.001` catches a missing decay (audible click-on at buffer end).
- **When it does NOT work:** multi-tone or shaped content (chords, speech — zero-crossings conflate partials; needs real spectrum analysis), buffers shorter than ~2 cycles, or buffers with DC offset.

### Real-AudioContext Isolation

`createBuffer()` + writing samples needs the real API — no meaningful fake exists. Isolate it: **one `new AudioContext()` in `before`/`after` for the render block only**; every other test block stays at zero real contexts (headless-safe, no permission prompts, fully deterministic).

```javascript
describe('clickBuffers (render — real AudioContext)', () => {
    let ctx;
    before(function () { ctx = new (window.AudioContext || window.webkitAudioContext)(); });
    after(function () { ctx.close(); });
    // ... render + zero-crossing + tail-silence assertions
});
```
