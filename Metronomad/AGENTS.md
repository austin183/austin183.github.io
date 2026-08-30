# Metronomad

Single-page in-browser tool for musicians: drop a local audio file, set BPM (30–250), a start offset (mm:ss.t), an optional end point (empty = play to the song end), and a count-in length (1–16), then Play runs a metronome count-in on the Web Audio clock and starts the song sample-accurately on the downbeat at the offset — stopping dead at the end point when a section is set.

## Architecture

- **Static, no build step.** One HTML entry point; ES modules with named exports; Vue 3 Options API + Howler.js from CDN. Factory functions (no classes) decomposed per concern, wired by `createMetronomadApp`.
- **Howler does setup only** — AudioContext creation (`initHowler` touches `Howler.volume()` to force the lazy ctx), `Howler.masterGain`, `Howler.codecs()` for the codec gate. Two distinct Howler features are handled separately: `Howler.autoSuspend = false` (idle-suspend kill switch — its suspend timer only sees Howler's own sounds) and `Howler.autoUnlock` deliberately left at its default `true` (first-touch unlock, `howlerSetup.js:27-30`). The precision path never goes through Howler playback.
- **Raw Web Audio for precision.** The decoded `AudioBuffer` is played via `AudioBufferSourceNode.start(when, offset)` — one immediate, sample-accurate call for the song start (D5), plus a hand-rolled lookahead scheduler (~25 ms tick, ~100 ms horizon) that schedules only the count-in clicks. **Bounded playback (CR 2026-08-29-003):** the D5 start call is conditionally 3-arg — `start(when, offset, length)` when a section is set (the `preview()` precedent) — and termination at the bound rides the existing generation-guarded `onended` → `ENDED` path (no new engine state/event); `startSequence`/`preview` take an optional `length` (the key is **absent**, not `null`, when unbounded, so the unbounded call shape is byte-for-byte unchanged). **No Tone.js** (D6/KB-9) — the scheduler is ~60 lines and avoids a second audio graph.
- **Visual clock ownership:** the **app-level** `createBeatDots` RAF loop (in `MyESModules/App/`) is the **sole** owner of the visual clock — it drives the beat dots and progress readout. The engine has no visual clock (its P-12 surface was removed by review-fix I-5/RD-6 — never describe the engine as driving the dots). Beat phase is a pure function of the audio clock (D9), with visibility-pause/snap, tempo-driven CSS `--beat-interval`, and reduced-motion static highlighting. `createBeatDots(vm, base, callbacks)` is as DI-pure as the engine: `raf`/`cancelRaf`/`matchMedia`/`isPageHidden` are injected via `base` with browser defaults, and `stopAll()` touches only visualizer resources — engine `dispose()` is owned by `beforeUnmount`. The waveform playhead is a CSS-positioned DOM overlay riding the existing 10 Hz `songPosition` throttle — no new clock, and it stays under reduced-motion (KB-14).
- **Waveform + offset scrubbing (CR 2026-08-23-001).** `MyESModules/Analysis/` is the pure signal-analysis concern: `channelData.js` (`channelArrays`/`mixDown`/`monoMixdown` — the one shared mean), `waveformPeaks.js` (`extractPeaks`/`poolPeaks`: 4096-bucket high-res pool, stride 4 above 20 M samples/channel, stereo min-of-mins/max-of-maxs, `sampleRate`-explicit, no AudioContext), `tempoDetection.js` (`detectTempo` → `{bpm, confidence} | null`: mixdown → silence trim → onset envelope → autocorrelation over the *imported* `BPM_MIN`/`BPM_MAX` range with a 70–180 prior). `createWaveformView(vm, base, callbacks)` (app-level, in `MyESModules/App/`) is DI-pure like the engine/beatDots and owns only its canvas + its own listeners; the canvas is the offset **slider** (pointer scrub + full keyboard parity) and **replaced the old offset range input** (the app now has zero `input[type="range"]`) — the `.progress-readout` carries the `progressbar` role (W-10). The end marker (CR 2026-08-29-003) is a **pointer-only** static-DOM drag handle on the waveform — a second pointer path in `createWaveformView` reusing the W-1 hygiene with the shared window `pointerup`/`blur` safety nets (zero new window listeners); `#endInput` is the keyboard/SR path and the canvas stays the single offset slider (W-10/KB-18). The handle is **always visible** once peaks are painted: with no section it rests at the song end as a muted ghost (`.waveform-end-handle--ghost`), and a commit that lands in the final display tick (end ≥ duration − `MIN_SECTION_SEC`) maps to `end = null` — **at-the-end ⇔ no section** (2026-08-30 UX correction of EN-D13; drag left to start a section, drag back to the edge to clear it). Both features run as async post-Ready tasks from the single `_schedulePostLoadTasks` hook in `onFileDropped`'s ok-branch, each guarded by the three-clause `_analysisValid` generation/buffer-identity check (D4 discipline on the UI side; `_disposed` is the unmount half).
- **BPM suggestion (same CR).** `detectTempo` prefills the BPM field as a *correctable suggestion* after Ready, gated at write time by the per-file `_bpmTouchedThisFile` flag + `#bpmInput` focus + draft checks (W-16); the flag resets on every successful load, so a re-drop re-suggests. Wrong-but-confident is worse than silent: low confidence → `null` → no prefill, no hint, no announcement (W-13). The prefill clears `bpmClamped` (in-range by construction) so the two clamp-style hints never coexist.

## Directory

```
Metronomad/
├── index.html                      # Entry: Vue template + CDN scripts (vue.global.js, howler.min.js)
├── Style.css
├── AGENTS.md
├── playwright.config.cjs           # chromium only, :8000, autoplay flag, no webServer (repo rule)
├── scripts/run-tests.cjs           # Mocha-in-browser runner (opens MyComponents/*Test.html over HTTP)
├── scripts/make-clicks20-wav.cjs   # dependency-free generator for the clicks20.wav fixture (byte-identical regen)
├── MyESModules/
│   ├── index.js                    # Barrel (named exports only — a re-export of a missing name silently yields undefined)
│   ├── Analysis/                   # channelData, waveformPeaks, tempoDetection (pure DSP — no AudioContext, sampleRate explicit)
│   ├── App/                        # createMetronomadApp/Data/Methods/Lifecycle + createBeatDots (RAF visualizer) + createWaveformView (canvas waveform / offset slider)
│   ├── Audio/                      # howlerSetup, codecSupport, clickBuffers (pre-rendered 1568/1047 Hz clicks)
│   ├── File/fileLoader.js          # decode + codec gate + 30-min guard + object-URL lifecycle
│   ├── Playback/playbackEngine.js  # scheduler + sources + state machine + generation counter (D4)
│   └── Utils/                      # beatGrid, timeFormat, paramClamps (pure functions)
├── MyComponents/                   # Mocha+Chai in-browser unit tests
│   ├── TimingMathTest.html         # T-01…T-35, R-I8.1, EN-C1.1…16 (pure timing math + clampEnd/clampOffset-bound)
│   ├── FileLoaderTest.html         # F-01…F-09, H-01…H-02
│   ├── PlaybackEngineTest.html     # P-01…P-11, P-13…P-22, H-03, R-I5.1 (fake context/clock/timers — zero real AudioContext; P-12 retired; P-15…22 = bounded playback)
│   ├── BeatDotsTest.html           # B-01…B-05 (rev), R-I6.1/R-I6.2, B-06 (DI-injected fakes — no global patching)
│   ├── WaveformPeaksTest.html      # WF-P1.1…WF-P1.9 (pure peaks math)
│   ├── TempoDetectionTest.html     # TD-1.1…TD-1.15 (click trains synthesized in-page — zero real AudioContext)
│   ├── WaveformViewTest.html       # WF-V1.1…WF-V1.11, EN-V1.1…8 (Proxy ctx + fake RAF/window — no global patching; EN-V1 = end-handle pointer path)
│   └── UiHandlersTest.html         # V-01…V-07, WF-I1.1…5, WF-I2.1…10, TD-U1.1…10, EN-U1.1…23 (mock-VM pattern; EN-U1 = end-point UI handlers)
└── test/
    ├── fixtures/                   # sine3s.mp3 (all playback E2E), bad.mp3 (garbage-file E2E), clicks20.wav (120 BPM known-tempo fixture — regen via scripts/make-clicks20-wav.cjs)
    └── e2e/                        # Playwright, chromium: playback.spec.cjs, errors.spec.cjs, smoke.spec.cjs, keyboard.spec.cjs, reducedMotion.spec.cjs, visibility.spec.cjs, waveform.spec.cjs, tempo.spec.cjs, section.spec.cjs (CR 003, E2E-5.x), helpers.cjs
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
- **Unit tests for the pure/view modules open no real AudioContext** — engine: fake context/clock/timers; waveform view: Proxy-mocked 2D ctx + fake RAF/window; tempo detection: click trains synthesized in-page as plain `Float32Array`s from the `clickBuffers.js` recipe (1568/1047 Hz, both 44.1 kHz and 48 kHz). Only the click-buffer-render tests open one real context.
- **`clicks20.wav` is the known-tempo + file-swap E2E fixture** — 20 s · 44.1 kHz · mono · 16-bit PCM, 40 clicks at 0.5 s spacing (120 BPM, 1568 Hz accent every 4th); reproducible byte-identically via `scripts/make-clicks20-wav.cjs`; also the file-swap E2E fixture for the section rows (E2E-5.8/5.9 in `section.spec.cjs`). Never assert its duration string (R-9) — assert the BPM/end field, hints, and announcement only.
- `page.evaluate` bodies are standalone programs — define every helper locally inside them.

## Conventions

- Named exports only; factory functions returning plain objects; relative imports with `.js` extension; everything re-exported through the `MyESModules/index.js` barrel.
- Dependencies are injected as factory parameters (context, clock, timers, callbacks) — never imported where a parameter would do.
- Testability hooks are intentional and minimal (KB-6): `document.body[data-state]` = appState; `#beatDots[data-beat]` = zero-based lit dot index (−1 during lead-in/idle); `#waveformCanvas[data-loaded]` (peaks painted); `#waveformPlayhead[data-position-tenths]` (position × 10, at the 10 Hz cadence). They carry no styling and no ARIA.
- The new user-facing strings (CR 001) are exactly two: "Detected ~N BPM" (hint, `role="status"`) and "Detected tempo N BPM" (polite live-region announcement). The CR-003 strings (EN-D18) are exactly six: "End limited to song length", "End must be after the offset", "Offset limited by the end point" (clamp hints), "Section ended" (announcement — "Song ended" stays verbatim), "Section end removed (song too short)" (file-swap hint), and the placeholder "song end" (`#endInput`) — "Enter the time as m:ss.t" is reused, not new. All other strings stay verbatim.
- The post-load analysis tasks (peaks, tempo) each yield once (`setTimeout(0)`) so decode → Ready is never delayed, then guard with `_analysisValid(buffer, generation)` — `!_disposed && generation === _loadGeneration && buffer === _buffer` — before AND after the compute; the tempo gate reads focus/draft state at **write** time, never at kickoff. Failure paths (codec/decode/tooLong) do not bump the generation — the old buffer stays live.
- Errors are non-blocking overlays (app keeps its last valid state); `Ended` is not a resting state (returns to Ready, position reset to the offset).
- Memory: exactly one decoded buffer live at a time; object URLs revoked on every exit path; `beforeUnmount` order is listener removal → `beatDots.stopAll()` → `_disposed = true` + `_peaks`/`_buffer` null (in-flight analysis dies) → `waveformView.dispose()` (cancels pending RAF, removes all listeners, zeroes the canvas backing store) → `engine.dispose()` → `fileLoader.release()` (the lifecycle owns all teardown — the visualizers never touch the engine).

## Project Docs (`_agent_docs/`)

- `_agent_docs/specifications/metronomad-v1-specification.md` — the spec
- `_agent_docs/research/howlerjs-research.md` — Howler v2.2.3 research (pitfalls §5, codec matrix §6)
- `_agent_docs/plans/2026-08-17-metronomad-v1/` — implementation plan (index.md phase map, context.md decisions D1–D11 + known behaviors KB-1…KB-18 (14–17 added by CR 001, 18 by CR 003), behavior-specs.md scenario IDs)
- `_agent_docs/plans/2026-08-22-address-v1-review/` — v1 review remediation plan (phase map; RD-1…RD-6 fix contracts; R-* scenario IDs)
- `_agent_docs/plans/2026-08-23-cr-001-ui-enhancements/` — waveform + BPM-detection plan (phase map; decisions D-A…D-M, KB-14…KB-17 canonical in v1 `context.md`, WF-*/TD-*/E2E-3.x/4.x scenario IDs)
- `_agent_docs/plans/2026-08-29-cr-003-end-point-section-playback/` — end-point/section-playback plan (phase map; decisions EN-D1…EN-D18, KB-18 canonical in v1 `context.md`, EN-C1*/EN-V1*/EN-U1*/P-15…P-22/E2E-5.x scenario IDs)
- `_agent_docs/learnings/` — dated, cross-project lessons (barrel link-failure silence, in-page poll logger drain race, …)
- `_agent_docs/project-timeline/` — `project-timeline.md` milestone history (v1 → review remediation → CR 001) + `sessions/` per-phase TDD session summaries
- `.pi/skills/building-web-apps/SKILL.md` — the project skill (symlinked) with verified patterns and gotchas

## Git Commit Convention

Include `Co-Authored-By: LittleLight <noreply@traveler.dstny>` in commit messages.
