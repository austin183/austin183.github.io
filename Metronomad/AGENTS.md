# Metronomad

Single-page in-browser tool for musicians: drop a local audio file, set BPM (30–250), a start offset (mm:ss.t), and a count-in length (1–16), then Play runs a metronome count-in on the Web Audio clock and starts the song sample-accurately on the downbeat at the offset.

## Architecture

- **Static, no build step.** One HTML entry point; ES modules with named exports; Vue 3 Options API + Howler.js from CDN. Factory functions (no classes) decomposed per concern, wired by `createMetronomadApp`.
- **Howler does setup only** — AudioContext creation (`initHowler` touches `Howler.volume()` to force the lazy ctx), `Howler.masterGain`, `Howler.codecs()` for the codec gate. Two distinct Howler features are handled separately: `Howler.autoSuspend = false` (idle-suspend kill switch — its suspend timer only sees Howler's own sounds) and `Howler.autoUnlock` deliberately left at its default `true` (first-touch unlock, `howlerSetup.js:27-30`). The precision path never goes through Howler playback.
- **Raw Web Audio for precision.** The decoded `AudioBuffer` is played via `AudioBufferSourceNode.start(when, offset)` — one immediate, sample-accurate call for the song start (D5), plus a hand-rolled lookahead scheduler (~25 ms tick, ~100 ms horizon) that schedules only the count-in clicks. **No Tone.js** (D6/KB-9) — the scheduler is ~60 lines and avoids a second audio graph.
- **Visual clock ownership:** the **app-level** `createBeatDots` RAF loop (in `MyESModules/App/`) is the **sole** owner of the visual clock — it drives the beat dots and progress readout. The engine has no visual clock (its P-12 surface was removed by review-fix I-5/RD-6 — never describe the engine as driving the dots). Beat phase is a pure function of the audio clock (D9), with visibility-pause/snap, tempo-driven CSS `--beat-interval`, and reduced-motion static highlighting. `createBeatDots(vm, base, callbacks)` is as DI-pure as the engine: `raf`/`cancelRaf`/`matchMedia`/`isPageHidden` are injected via `base` with browser defaults, and `stopAll()` touches only visualizer resources — engine `dispose()` is owned by `beforeUnmount`.

## Directory

```
Metronomad/
├── index.html                      # Entry: Vue template + CDN scripts (vue.global.js, howler.min.js)
├── Style.css
├── AGENTS.md
├── playwright.config.cjs           # chromium only, :8000, autoplay flag, no webServer (repo rule)
├── scripts/run-tests.cjs           # Mocha-in-browser runner (opens MyComponents/*Test.html over HTTP)
├── MyESModules/
│   ├── index.js                    # Barrel (named exports only — a re-export of a missing name silently yields undefined)
│   ├── App/                        # createMetronomadApp/Data/Methods/Lifecycle + createBeatDots (RAF visualizer)
│   ├── Audio/                      # howlerSetup, codecSupport, clickBuffers (pre-rendered 1568/1047 Hz clicks)
│   ├── File/fileLoader.js          # decode + codec gate + 30-min guard + object-URL lifecycle
│   ├── Playback/playbackEngine.js  # scheduler + sources + state machine + generation counter (D4)
│   └── Utils/                      # beatGrid, timeFormat, paramClamps (pure functions)
├── MyComponents/                   # Mocha+Chai in-browser unit tests
│   ├── TimingMathTest.html         # T-01…T-35, R-I8.1 (pure timing math)
│   ├── FileLoaderTest.html         # F-01…F-09, H-01…H-02
│   ├── PlaybackEngineTest.html     # P-01…P-11, P-13…P-14, H-03, R-I5.1 (fake context/clock/timers — zero real AudioContext; P-12 retired)
│   ├── BeatDotsTest.html           # B-01…B-05 (rev), R-I6.1/R-I6.2, B-06 (DI-injected fakes — no global patching)
│   └── UiHandlersTest.html         # V-01…V-07 (mock-VM pattern)
└── test/
    ├── fixtures/                   # sine3s.mp3 (all playback E2E), bad.mp3 (garbage-file E2E)
    └── e2e/                        # Playwright, chromium: playback.spec.cjs, errors.spec.cjs, smoke.spec.cjs, keyboard.spec.cjs, reducedMotion.spec.cjs, visibility.spec.cjs, helpers.cjs
```

## Running

The user starts the server — **agents never start it**: `bash start-server.sh` (from the repo root) → app at `http://localhost:8000/Metronomad/index.html`. If the server isn't up, ask the user.

## Testing

```bash
node scripts/run-tests.cjs        # all Mocha unit suites (MyComponents/*Test.html), from any cwd; needs the server on :8000
npx playwright test               # E2E (chromium only), from this directory; needs the server on :8000
```

Test conventions:

- **Timing assertions use in-page clocks, not node-side polls.** Sub-second timing is recorded by the 5 ms in-page transition logger (`startRecordedSequence` in `test/e2e/playback.spec.cjs`, anchored `t0 = performance.now()` in the same `evaluate` as the trigger) and asserted with tolerance. Node-side `expect`/`expect.poll` are for state/text existence only — the node poll loop is starved under load.
- **No `waitForTimeout` for assertions** — assert on state + tolerance (`document.body[data-state]`, `#beatDots[data-beat]`, announcement text).
- **Never assert audio by ear** — E2E asserts state, DOM hooks, and wall-clock timing; click pitch/crispness and downbeat exactness are the manual acceptance checklist.
- **Engine unit tests open no real AudioContext** — fake context (recording stubs + shared `calls` log), fake clock, fake RAF collector, fake timers. Only the click-buffer-render tests open one real context.
- `page.evaluate` bodies are standalone programs — define every helper locally inside them.

## Conventions

- Named exports only; factory functions returning plain objects; relative imports with `.js` extension; everything re-exported through the `MyESModules/index.js` barrel.
- Dependencies are injected as factory parameters (context, clock, timers, callbacks) — never imported where a parameter would do.
- Testability hooks are intentional and minimal (KB-6): `document.body[data-state]` = appState; `#beatDots[data-beat]` = zero-based lit dot index (−1 during lead-in/idle). They carry no styling and no ARIA.
- Errors are non-blocking overlays (app keeps its last valid state); `Ended` is not a resting state (returns to Ready, position reset to the offset).
- Memory: exactly one decoded buffer live at a time; object URLs revoked on every exit path; `beforeUnmount` order is listener removal → `beatDots.stopAll()` → `engine.dispose()` → `fileLoader.release()` (the lifecycle owns all teardown — the visualizer never touches the engine).

## Project Docs (`_agent_docs/`)

- `_agent_docs/specifications/metronomad-v1-specification.md` — the spec
- `_agent_docs/research/howlerjs-research.md` — Howler v2.2.3 research (pitfalls §5, codec matrix §6)
- `_agent_docs/plans/2026-08-17-metronomad-v1/` — implementation plan (index.md phase map, context.md decisions D1–D11 + known behaviors KB-1…KB-10, behavior-specs.md scenario IDs)
- `_agent_docs/sessions/` — per-phase TDD session summaries
- `.pi/skills/building-web-apps/SKILL.md` — the project skill (symlinked) with verified patterns and gotchas

## Git Commit Convention

Include `Co-Authored-By: LittleLight <noreply@traveler.dstny>` in commit messages.
