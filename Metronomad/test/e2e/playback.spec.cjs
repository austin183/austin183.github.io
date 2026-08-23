/**
 * Phase 7 — Playback E2E (E2E-1.x), Playwright, chromium.
 *
 * Fixture: 3 s 440 Hz sine MP3 (test/fixtures/sine3s.mp3, D11).
 * Grid law (T-04/P-01): with count-in N the song starts at t0 + (N+1)·beat.
 * 120 BPM → beat 0.5 s; count-in 2 → clicks at +0.5 s / +1.0 s,
 * song starts at t0+1.5 s, ends ≈ +3.0 s later (~4.5 s lifecycle).
 *
 * Conventions (behavior-specs.md §3.4):
 *   - timing via document.body[data-state] + #beatDots[data-beat] hooks (KB-6)
 *   - `t0 = performance.now()` at the Play click, in-page
 *   - assert with expect/expect.poll — no waitForTimeout for assertions
 *   - never listen to audio
 *
 * Timing methodology: transition times are asserted from an IN-PAGE
 * 5 ms transition log, not from node-side poll completion. Under load the
 * node-side polling loop is starved (samples can arrive 1–2 s late), which
 * corrupts node-side timing; the in-page clock is exact (measured flips land
 * within ~30 ms of the grid law). Node-side expects are used only for
 * state/text existence checks without timing claims.
 */

const { test, expect } = require('@playwright/test');
const { loadFixture, appState } = require('./helpers.cjs');

/** Set the count-in input to an exact value.
 *  C-1: the field is a commit-on-Enter/blur draft, so commit explicitly —
 *  fill() alone only sets the draft text, not the model. */
async function setCountIn(page, value) {
  await page.fill('#countInInput', String(value));
  await page.keyboard.press('Enter');
}

/**
 * Install the in-page transition logger, then click the trigger button
 * (Play by default; Preview for the preview scenario).
 *
 * The logger records one entry per change of { state, data-beat,
 * progress readout, live-region text } at 5 ms cadence. The click is
 * dispatched in-page so `t0` is anchored to the exact click instant on the
 * same clock the transitions are measured against.
 */
async function startRecordedSequence(page, trigger = '#playStopBtn') {
  await page.evaluate((trigger) => {
    window.__t0 = performance.now();
    window.__timeline = [];
    const toSec = (s) => { const [m, r] = s.trim().split(':'); return Number(m) * 60 + Number(r); };
    const read = () => [
      document.body.dataset.state,
      document.querySelector('#beatDots').dataset.beat,
      document.querySelector('.progress-readout') ? document.querySelector('.progress-readout').textContent : '',
      document.querySelector('div[role="status"][aria-live="polite"]').textContent
    ];
    let prev = read();
    const log = (values) => {
      if (values.some((v, i) => v !== prev[i])) {
        window.__timeline.push({
          t: performance.now() - window.__t0,
          state: values[0],
          beat: values[1],
          pos: values[2] ? toSec(values[2].split('/')[0]) : null,
          ann: values[3]
        });
        prev = values;
      }
    };
    window.__tlIv = setInterval(() => log(read()), 5);
    document.querySelector(trigger).click();
  }, trigger);
}

/** Read back the recorded transitions and stop the logger. */
async function readTimeline(page) {
  return page.evaluate(() => {
    clearInterval(window.__tlIv);
    return window.__timeline;
  });
}

/** First timeline entry whose state matches, or null. */
const firstAt = (timeline, state) => timeline.find((e) => e.state === state) || null;

/** Entries where the state TRANSITIONS into `state` (skips in-state
 *  beat/position/announcement changes). */
const transitionsTo = (timeline, state) =>
  timeline.filter((e, i) => e.state === state && (i === 0 || timeline[i - 1].state !== state));

/**
 * Schedule an in-page click of a button at `delayMs` after t0 and record
 * the exact click time in window.__actionT. In-page setTimeout keeps the
 * action inside the narrow count-in window, which node-side polling (starved
 * under load) cannot reliably hit.
 */
async function scheduleActionAt(page, selector, delayMs) {
  await page.evaluate(([sel, delay]) => {
    setTimeout(() => {
      window.__actionT = performance.now() - window.__t0;
      document.querySelector(sel).click();
    }, delay);
  }, [selector, delayMs]);
}

/** Read back window.__actionT (ms since t0). */
const readActionT = (page) => page.evaluate(() => window.__actionT);

test.describe('Phase 7 — playback (E2E-1.x)', () => {
  test('E2E-1.1 load → ready: filename, duration, state, Play enabled', async ({ page }) => {
    await loadFixture(page);

    await expect(page.locator('.file-name')).toHaveText('sine3s.mp3');
    await expect(page.locator('.file-duration')).toHaveText('0:03.0');
    await expect(page.locator('body')).toHaveAttribute('data-state', 'ready');
    await expect(page.locator('#playStopBtn')).toBeEnabled();
  });

  test('E2E-1.2 full sequence timing: count-in 2 → song at t0+1.5s → ended', async ({ page }) => {
    await loadFixture(page);
    await setCountIn(page, 2);

    await startRecordedSequence(page);

    // Let the full lifecycle run (~4.5 s), then assert on the in-page timeline.
    await expect.poll(() => appState(page), { timeout: 10000 }).toBe('ready');
    const timeline = await readTimeline(page);

    // countingIn within 300 ms of the click (state flips in the click handler)
    const countingIn = firstAt(timeline, 'countingIn');
    expect(countingIn, 'countingIn entry').toBeTruthy();
    expect(countingIn.t, `countingIn at ${countingIn.t.toFixed(0)} ms`).toBeLessThanOrEqual(300);

    // song starts at t0 + (N+1)·beat = t0 + 1.5 s (±0.3 s)
    const playing = firstAt(timeline, 'playing');
    expect(playing, 'playing entry').toBeTruthy();
    expect(Math.abs(playing.t - 1500), `playing flip at ${playing.t.toFixed(0)} ms`)
      .toBeLessThanOrEqual(300);

    // lead-in: "-1" before the first click (t0+0.5 s); first click → dot "0",
    // second click → dot "1"; both before the flip (zero-based, KB-6)
    const countInBeats = timeline.filter((e) => e.state === 'countingIn').map((e) => e.beat);
    expect(countInBeats[0], 'lead-in beat').toBe('-1');
    const firstDot0 = timeline.find((e) => e.beat === '0');
    const firstDot1 = timeline.find((e) => e.beat === '1');
    expect(firstDot0, 'dot 0 entry').toBeTruthy();
    expect(firstDot1, 'dot 1 entry').toBeTruthy();
    expect(firstDot0.t, `dot 0 at ${firstDot0.t.toFixed(0)} ms`).toBeGreaterThanOrEqual(400);
    expect(firstDot0.t).toBeLessThan(playing.t);
    expect(firstDot1.t, `dot 1 at ${firstDot1.t.toFixed(0)} ms`).toBeGreaterThanOrEqual(900);
    expect(firstDot1.t).toBeLessThan(playing.t);

    // song ends ≈ 3.0 s after the flip (±0.5 s); state back to ready
    const ready = transitionsTo(timeline, 'ready').pop();
    expect(ready, 'ready entry').toBeTruthy();
    expect(Math.abs(ready.t - playing.t - 3000), `ready at ${ready.t.toFixed(0)} ms`)
      .toBeLessThanOrEqual(500);

    // "Song started" announced while playing; progress advanced past 0:01.0
    expect(timeline.some((e) => /Song started/.test(e.ann) && e.t < playing.t + 1000), 'Song started announcement').toBeTruthy();
    expect(timeline.some((e) => e.pos !== null && e.pos > 1.0), 'progress past 0:01.0').toBeTruthy();

    // position reset to offset (0:00.0) and "Song ended" announced at the end
    await expect(page.locator('div[role="status"][aria-live="polite"]')).toHaveText(/Song ended/);
    await expect(page.locator('.progress-readout')).toHaveText('0:00.0 / 0:03.0');
  });

  test('E2E-1.3 stop during count-in: quick ready, position 0, params preserved', async ({ page }) => {
    await loadFixture(page);
    await setCountIn(page, 2);

    await startRecordedSequence(page);
    await scheduleActionAt(page, '#playStopBtn', 250); // inside count-in, before the first click
    await expect.poll(() => appState(page), { timeout: 10000 }).toBe('ready');

    const timeline = await readTimeline(page);
    const actionT = await readActionT(page);
    expect(actionT, 'stop click recorded').toBeTruthy();
    // N-26: the count-in stop window ends at the grid-law flip —
    // t0 + (countIn + 1) · beat = t0 + 1500 ms (count-in 2 @ 120 BPM).
    // The old self-imposed 450 ms bound was flake-able under saturated
    // CI (the in-page 250 ms timeout can slip past 450 while still a
    // valid count-in stop). A count-in stop never reaches `playing`, so
    // the grid-law time is the exact proxy (R-N26.1).
    const flipAt = (2 + 1) * 500; // (countIn + 1) beats × 500 ms @ 120 BPM
    expect(actionT, `stop at ${actionT.toFixed(0)} ms`).toBeLessThan(flipAt); // before the song would have started

    const ready = transitionsTo(timeline, 'ready').pop();
    expect(ready, 'ready entry').toBeTruthy();
    expect(ready.t - actionT, `ready ${ready.t.toFixed(0)} ms after stop at ${actionT.toFixed(0)} ms`)
      .toBeLessThanOrEqual(500);

    // position reset; BPM/offset preserved; controls re-enabled
    await expect(page.locator('.progress-readout')).toHaveText('0:00.0 / 0:03.0');
    await expect(page.locator('#bpmInput')).toHaveValue('120');
    await expect(page.locator('#countInInput')).toHaveValue('2');
    for (const sel of ['#bpmInput', '#offsetScrubber', '#offsetInput', '#countInInput']) {
      await expect(page.locator(sel)).toBeEnabled();
    }
  });

  test('E2E-1.4 stop during playback: ready, progress reset to offset', async ({ page }) => {
    await loadFixture(page);
    await setCountIn(page, 2);

    await startRecordedSequence(page);
    await scheduleActionAt(page, '#playStopBtn', 2000); // after the t0+1.5 s flip
    await expect.poll(() => appState(page), { timeout: 10000 }).toBe('ready');

    const timeline = await readTimeline(page);
    const actionT = await readActionT(page);
    const playing = firstAt(timeline, 'playing');
    expect(playing, 'playing entry').toBeTruthy();
    expect(actionT, 'stop after the flip').toBeGreaterThan(playing.t);

    const ready = transitionsTo(timeline, 'ready').pop();
    expect(ready.t - actionT, `ready ${ready.t.toFixed(0)} ms after stop at ${actionT.toFixed(0)} ms`)
      .toBeLessThanOrEqual(500);

    await expect(page.locator('.progress-readout')).toHaveText('0:00.0 / 0:03.0');
  });

  test('E2E-1.5 restart: new count-in → playing again, progress restarts from offset', async ({ page }) => {
    await loadFixture(page);
    await setCountIn(page, 2);

    await startRecordedSequence(page);
    await scheduleActionAt(page, '#restartBtn', 2000); // during the first song
    await expect.poll(() => appState(page), { timeout: 15000 }).toBe('ready');

    const timeline = await readTimeline(page);
    const actionT = await readActionT(page);

    const countIns = transitionsTo(timeline, 'countingIn');
    const playings = transitionsTo(timeline, 'playing');
    expect(countIns.length, 'two count-in phases').toBeGreaterThanOrEqual(2);
    expect(playings.length, 'two playing phases').toBeGreaterThanOrEqual(2);

    // second sequence follows the grid law again from the restart press
    const restartCountIn = countIns[1];
    const restartPlaying = playings[1];
    expect(restartCountIn.t, `re-count-in at ${restartCountIn.t.toFixed(0)} ms`).toBeGreaterThan(actionT);
    expect(restartCountIn.t - actionT).toBeLessThanOrEqual(300);
    expect(Math.abs(restartPlaying.t - actionT - 1500), `second flip at ${restartPlaying.t.toFixed(0)} ms`)
      .toBeLessThanOrEqual(300);

    // progress restarts from the offset after the second flip
    const afterRestart = timeline.filter((e) => e.state === 'playing' && e.t > restartPlaying.t && e.pos !== null);
    expect(afterRestart[0], 'position after restart').toBeTruthy();
    expect(afterRestart[0].pos).toBeLessThanOrEqual(0.2);
  });

  test('E2E-1.6 parameter lock: controls disabled in countingIn and playing, re-enabled after Stop', async ({ page }) => {
    await loadFixture(page);
    // Long count-in so node-side polls (slow under load) stay inside the window.
    await setCountIn(page, 8);

    const lockedInputs = ['#bpmInput', '#offsetScrubber', '#offsetInput', '#countInInput'];

    await startRecordedSequence(page);

    await expect.poll(() => appState(page), { timeout: 10000 }).toBe('countingIn');
    for (const sel of lockedInputs) {
      await expect(page.locator(sel), `${sel} locked in countingIn`).toBeDisabled();
    }

    await expect.poll(() => appState(page), { timeout: 10000 }).toBe('playing');
    for (const sel of lockedInputs) {
      await expect(page.locator(sel), `${sel} locked in playing`).toBeDisabled();
    }

    await page.click('#playStopBtn');
    await expect.poll(() => appState(page), { timeout: 10000 }).toBe('ready');
    for (const sel of lockedInputs) {
      await expect(page.locator(sel), `${sel} unlocked after stop`).toBeEnabled();
    }
    await readTimeline(page); // stop the in-page logger
  });

  test('E2E-1.7 preview clamp: offset 0:01.0 → plays from 1.0 s, auto-stops ≤ 2 s (D2)', async ({ page }) => {
    await loadFixture(page);
    await page.fill('#offsetInput', '0:01.0');
    await page.keyboard.press('Enter');
    await expect(page.locator('#offsetInput')).toHaveValue('0:01.0');

    // Preview keeps appState 'ready' (isPreviewing flag) — the live region
    // and the in-page timeline carry the observable transitions.
    await startRecordedSequence(page, '#previewBtn');

    await expect(page.locator('div[role="status"][aria-live="polite"]'),
      { timeout: 10000 }).toHaveText(/Preview stopped/);
    const timeline = await readTimeline(page);

    const started = timeline.find((e) => /Preview started/.test(e.ann));
    expect(started, 'Preview started announcement').toBeTruthy();
    const stopped = timeline.filter((e) => /Preview stopped/.test(e.ann)).pop();
    expect(stopped, 'Preview stopped announcement').toBeTruthy();
    // D2: preview length = min(3 s, duration − offset) = 2.0 s here.
    // The clamp timing IS the observable evidence the preview started at
    // the offset (an unclamped 3 s preview, or one starting at 0, would
    // end later). Progress is intentionally static during preview (Phase 6).
    expect(stopped.t, `preview ended at ${stopped.t.toFixed(0)} ms`).toBeGreaterThanOrEqual(1700);
    expect(stopped.t, `preview ended at ${stopped.t.toFixed(0)} ms`).toBeLessThanOrEqual(2300);

    // back to the resting state; offset preserved; position reset to offset
    await expect(page.locator('body')).toHaveAttribute('data-state', 'ready');
    await expect(page.locator('#offsetInput')).toHaveValue('0:01.0');
    await expect(page.locator('.progress-readout')).toHaveText('0:01.0 / 0:03.0');
  });

  test('E2E-1.8 beat dots in play: downbeat class + active index advances', async ({ page }) => {
    await loadFixture(page);
    await setCountIn(page, 2);

    await startRecordedSequence(page);
    await expect.poll(() => appState(page), { timeout: 10000 }).toBe('ready');
    const timeline = await readTimeline(page);

    // dot 1 carries the distinct downbeat class (a11y: not color alone)
    await expect(page.locator('#beatDot-0')).toHaveClass(/beat-dot--downbeat/);

    // over a full count-in 2 + 3 s song the active dot index visits every
    // dot (≥ 1 advance per observed beat pair)
    const beatsSeen = [...new Set(timeline.map((e) => e.beat))];
    for (const b of ['0', '1', '2', '3']) {
      expect(beatsSeen, `dot ${b} lit during the sequence`).toContain(b);
    }
  });

  test('E2E-R-C1.1 BPM types per-keystroke, commits on Enter, runs at the typed rate', async ({ page }) => {
    await loadFixture(page);

    // The review's live-repro path (C-1): select-all, then type one
    // keystroke at a time (pressSequentially — never fill). The field is a
    // draft; the model must not move until commit, and the display must
    // never diverge from the keystrokes.
    await page.locator('#bpmInput').click({ clickCount: 3 });
    await page.locator('#bpmInput').pressSequentially('9');
    await expect(page.locator('#bpmInput')).toHaveValue('9');   // draft only
    await page.locator('#bpmInput').pressSequentially('0');
    await expect(page.locator('#bpmInput')).toHaveValue('90');  // still draft

    await page.keyboard.press('Enter');
    await expect(page.locator('#bpmInput')).toHaveValue('90');  // committed, in range

    // The sequence really runs at 90 BPM: beat = 60/90 ≈ 667 ms. Grid law:
    // count-in 4 (default) → song starts at t0 + (4+1)·667 ≈ 3333 ms.
    await startRecordedSequence(page);
    await expect.poll(() => appState(page), { timeout: 10000 }).toBe('ready');
    const timeline = await readTimeline(page);

    const countingIn = firstAt(timeline, 'countingIn');
    expect(countingIn, 'countingIn entry').toBeTruthy();
    expect(countingIn.t, `countingIn at ${countingIn.t.toFixed(0)} ms`).toBeLessThanOrEqual(300);

    const playing = firstAt(timeline, 'playing');
    expect(playing, 'playing entry').toBeTruthy();
    expect(Math.abs(playing.t - 3333), `playing flip at ${playing.t.toFixed(0)} ms (want ~3333)`)
      .toBeLessThanOrEqual(300);

    // dot-to-dot spacing ≈ 667 ms across the count-in — proof it runs at 90
    // BPM, not the 120 default (a 120 BPM run would flip at ~2500 ms with
    // 500 ms gaps).
    const dots = timeline.filter((e) => e.state === 'countingIn' && e.beat !== '-1');
    expect(dots.length, `count-in dot advances (got ${dots.length})`).toBeGreaterThanOrEqual(3);
    for (let i = 1; i < dots.length; i++) {
      const gap = dots[i].t - dots[i - 1].t;
      expect(Math.abs(gap - 667), `beat gap ${gap.toFixed(0)} ms (want ~667)`).toBeLessThanOrEqual(150);
    }
  });
});
