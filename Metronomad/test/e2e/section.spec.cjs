/**
 * CR 003 Phase 4 — section playback E2E (E2E-5.x), Playwright, chromium.
 *
 * Fixtures: sine3s.mp3 (≈ 3.0 s @ 44.1 kHz) for the playback rows;
 * clicks20.wav (20 s, 120 BPM click train) for the file-swap rows ONLY —
 * never assert its duration string (R-9, non-round float).
 *
 * Grid law (T-04/P-01): the song starts at t0 + (N+1)·60/bpm;
 * 120 BPM → 0.5 s/beat. E2E-5.1 worked example (recomputed at phase
 * close): count-in 4 → flip at t0+2500; section 1.5 s → ready at t0+4000.
 *
 * Conventions (context.md E2E Conventions; playback.spec.cjs):
 *   - timing from the IN-PAGE 5 ms transition logger (copied here —
 *     page.evaluate bodies are standalone programs, helpers local)
 *   - t0 anchored in the same evaluate as the trigger
 *   - node-side expects for state/text existence only
 *   - synthetic PointerEvents for the drag rows (CR-001 E2E-3.7)
 *   - marker position via the handle's inline `left` style — no new
 *     hooks (KB-6); no waitForTimeout for assertions; no audio assertions
 */

const { test, expect } = require('@playwright/test');
const path = require('path');
const { FIXTURE, loadFixture, expectReady, appState, waitForAppMount } = require('./helpers.cjs');

const CLICKS20 = path.join(__dirname, '..', 'fixtures', 'clicks20.wav');

/** Upload any fixture and wait for ready (loadFixture is the sine3s shortcut). */
async function loadFile(page, fixture) {
  await page.setInputFiles('#fileInput', fixture);
  await expectReady(page);
}

/** Set the count-in input to an exact value (commit-on-Enter/blur draft). */
async function setCountIn(page, value) {
  await page.fill('#countInInput', String(value));
  await page.keyboard.press('Enter');
}

/** Set the End field (empty string commits to null — EN-D6). */
async function setEnd(page, value) {
  await page.fill('#endInput', value);
  await page.keyboard.press('Enter');
}

/** Wait until the peaks for the live file are painted (KB-6 paint hook). */
async function expectWaveformReady(page) {
  await expect(page.locator('#waveformCanvas')).toHaveAttribute('data-loaded', 'true', { timeout: 10000 });
}

/**
 * Install the in-page 5 ms transition logger, then click the trigger
 * button (Play by default; Preview for the preview scenario). Same shape
 * as playback.spec.cjs, with one extra field: the playhead's
 * data-position-tenths (KB-6) — the section-bound clamp claim.
 * `t0 = performance.now()` is anchored to the exact click instant on the
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
      document.querySelector('div[role="status"][aria-live="polite"]').textContent,
      document.querySelector('#waveformPlayhead') ? document.querySelector('#waveformPlayhead').dataset.positionTenths : ''
    ];
    let prev = read();
    const log = (values) => {
      if (values.some((v, i) => v !== prev[i])) {
        window.__timeline.push({
          t: performance.now() - window.__t0,
          state: values[0],
          beat: values[1],
          pos: values[2] ? toSec(values[2].split('/')[0]) : null,
          ann: values[3],
          ph: values[4] === '' ? null : Number(values[4])
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

/** Entries where the state TRANSITIONS into `state`. */
const transitionsTo = (timeline, state) =>
  timeline.filter((e, i) => e.state === state && (i === 0 || timeline[i - 1].state !== state));

/** In-page click of a button at `delayMs` after t0 (exact click time → __actionT). */
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

/** The handle's inline left (%) — read in-page, no new hooks (KB-6). */
const handleLeftPct = (page) => page.$eval('#waveformEndHandle', (el) => parseFloat(el.style.left));

test.describe('CR 003 Phase 4 — section playback (E2E-5.x)', () => {
  test('E2E-5.1 bounded sequence: flip at t0+2500, section stops at 1.5 s, "Section ended"', async ({ page }) => {
    await loadFixture(page);
    await setEnd(page, '0:01.5');
    await expect(page.locator('#endInput')).toHaveValue('0:01.5');
    await setCountIn(page, 4);

    await startRecordedSequence(page);
    await expect.poll(() => appState(page), { timeout: 15000 }).toBe('ready');
    const timeline = await readTimeline(page);

    // Grid law: count-in 4 @ 120 → clicks at +500/+1000/+1500/+2000,
    // playing flip at t0 + (4+1)·0.5 = t0+2500 (±300 ms).
    const playing = firstAt(timeline, 'playing');
    expect(playing, 'playing entry').toBeTruthy();
    expect(Math.abs(playing.t - 2500), `playing flip at ${playing.t.toFixed(0)} ms`)
      .toBeLessThanOrEqual(300);

    const dots = {};
    for (const b of ['0', '1', '2', '3']) {
      dots[b] = timeline.find((e) => e.beat === b);
      expect(dots[b], `dot ${b} entry`).toBeTruthy();
    }
    expect(dots['0'].t).toBeGreaterThanOrEqual(400);
    expect(dots['1'].t).toBeGreaterThanOrEqual(900);
    expect(dots['2'].t).toBeGreaterThanOrEqual(1400);
    expect(dots['3'].t).toBeGreaterThanOrEqual(1900);
    for (const b of ['0', '1', '2', '3']) {
      expect(dots[b].t, `dot ${b} before the flip`).toBeLessThan(playing.t);
    }

    // Exactly ONE ready transition, at t0+4000 (2500 flip + 1.5 s section, ±500 ms)
    const readys = transitionsTo(timeline, 'ready');
    expect(readys.length, 'exactly one ready transition').toBe(1);
    expect(Math.abs(readys[0].t - 4000), `ready at ${readys[0].t.toFixed(0)} ms`)
      .toBeLessThanOrEqual(500);

    // Playhead (KB-6 tenths hook) reaches the 1.5 s bound and never exceeds it.
    const playingPh = timeline
      .filter((e) => e.state === 'playing' && e.ph !== null)
      .map((e) => e.ph);
    expect(playingPh.length, 'playhead samples during playing').toBeGreaterThan(0);
    expect(Math.max(...playingPh), 'reaches the 15-tenth bound').toBe(15);
    for (const v of playingPh) {
      expect(v, 'never exceeds the bound').toBeLessThanOrEqual(15);
    }

    // Resting state: readout reset to the offset (KB-4), "Section ended"
    // (not "Song ended"), the end field untouched.
    await expect(page.locator('.progress-readout')).toHaveText('0:00.0 / 0:03.0');
    await expect(page.locator('div[role="status"][aria-live="polite"]')).toHaveText(/Section ended/);
    await expect(page.locator('#endInput')).toHaveValue('0:01.5');
  });

  test('E2E-5.2 empty end field commits null: unbounded run, "Song ended"', async ({ page }) => {
    await loadFixture(page);
    await setEnd(page, ''); // empty commits to null (EN-D6)
    await expect(page.locator('#endInput')).toHaveValue('');
    await expect(page.locator('#endInput')).toHaveAttribute('placeholder', 'song end');
    await setCountIn(page, 2);

    await startRecordedSequence(page);
    await expect.poll(() => appState(page), { timeout: 15000 }).toBe('ready');
    const timeline = await readTimeline(page);

    // Unbounded: song at t0+1500 (count-in 2), ends 3.0 s later (±500 ms)
    const playing = firstAt(timeline, 'playing');
    expect(playing, 'playing entry').toBeTruthy();
    expect(Math.abs(playing.t - 1500), `playing flip at ${playing.t.toFixed(0)} ms`)
      .toBeLessThanOrEqual(300);
    const ready = transitionsTo(timeline, 'ready').pop();
    expect(ready, 'ready entry').toBeTruthy();
    expect(Math.abs(ready.t - 4500), `ready at ${ready.t.toFixed(0)} ms`)
      .toBeLessThanOrEqual(500);

    await expect(page.locator('div[role="status"][aria-live="polite"]')).toHaveText(/Song ended/);
  });

  test('E2E-5.3 end marker + post-end dim track the committed end', async ({ page }) => {
    await loadFixture(page);
    await expectWaveformReady(page);

    await setEnd(page, '0:02.0');
    expect(await handleLeftPct(page), 'handle at 2.0/3.0').toBeCloseTo(66.667, 1);
    expect(await page.$eval('#waveformEndHandle', (el) => el.offsetParent !== null), 'handle visible').toBe(true);

    // Post-end dim: from the end marker to the right edge (EN-D12)
    const dim = await page.$eval('.waveform-dim--end', (el) => ({
      left: parseFloat(el.style.left),
      right: getComputedStyle(el).right,
      visible: el.offsetParent !== null
    }));
    expect(dim.left).toBeCloseTo(66.667, 1);
    expect(dim.right, 'pinned to the right edge').toBe('0px');
    expect(dim.visible, 'end dim visible').toBe(true);

    // Clear the field: the handle RESTS at the song end as a muted ghost
    // (2026-08-30: at-the-end ⇔ null — the marker is always visible once
    // peaks are painted, so a section can be started by dragging it);
    // the post-end dim needs an active section and hides.
    await setEnd(page, '');
    expect(await page.$eval('#waveformEndHandle', (el) => el.offsetParent !== null), 'ghost handle visible').toBe(true);
    expect(await handleLeftPct(page), 'ghost at the right edge').toBeCloseTo(100, 1);
    expect(await page.$eval('#waveformEndHandle', (el) => el.classList.contains('waveform-end-handle--ghost')), 'ghost style').toBe(true);
    expect(await page.$eval('.waveform-dim--end', (el) => el.offsetParent), 'end dim hidden').toBe(null);
  });

  test('E2E-5.4 dragging the end handle commits; pointercancel discards (W-1)', async ({ page }) => {
    await loadFixture(page);
    await expectWaveformReady(page);
    await setEnd(page, '0:02.0');

    const handle = await page.locator('#waveformEndHandle').boundingBox();
    const canvas = await page.locator('#waveformCanvas').boundingBox();
    const y = handle.y + handle.height / 2;

    // Real mouse drag: down on the handle → 50 % of the box → up commits
    await page.mouse.move(handle.x + handle.width / 2, y);
    await page.mouse.down();
    await page.mouse.move(canvas.x + canvas.width * 0.5, y, { steps: 5 });
    await page.mouse.up();

    // Marker and field mirror each other (U-10 shared law)
    await expect(page.locator('#endInput')).toHaveValue('0:01.5');
    expect(await handleLeftPct(page), 'handle at 50 %').toBeCloseTo(50, 1);

    // pointercancel mid-drag (synthetic, E2E-3.7 convention): the draft is
    // discarded, nothing committed, no stuck draft
    await page.evaluate(() => {
      const handle = document.getElementById('waveformEndHandle');
      const rect = handle.getBoundingClientRect();
      handle.dispatchEvent(new PointerEvent('pointerdown', {
        clientX: rect.left + rect.width / 2,
        clientY: rect.top + rect.height / 2,
        pointerId: 1, bubbles: true, cancelable: true
      }));
      handle.dispatchEvent(new PointerEvent('pointercancel', {
        pointerId: 1, bubbles: true, cancelable: true
      }));
    });
    await expect(page.locator('#endInput')).toHaveValue('0:01.5'); // unchanged
    expect(await handleLeftPct(page), 'no stuck draft').toBeCloseTo(50, 1);
  });

  test('E2E-5.5 offset bounded by end − 0.1 in all three commit paths', async ({ page }) => {
    await loadFixture(page);
    await expectWaveformReady(page);
    await setEnd(page, '0:02.0');

    // (a) keyboard End key on the canvas slider → the section max
    await page.locator('#waveformCanvas').focus();
    await page.keyboard.press('End');
    await expect(page.locator('#offsetInput')).toHaveValue('0:01.9');

    // (b) canvas click at 90 % (2.7 s) → clamps to end − 0.1
    const box = await page.locator('#waveformCanvas').boundingBox();
    await page.mouse.click(box.x + box.width * 0.9, box.y + box.height / 2);
    await expect(page.locator('#offsetInput')).toHaveValue('0:01.9');

    // (c) field entry → clamps + the section-specific hint (EN-D16/EN-D18)
    await page.fill('#offsetInput', '0:02.5');
    await page.keyboard.press('Enter');
    await expect(page.locator('#offsetInput')).toHaveValue('0:01.9');
    await expect(page.locator('.control-group--offset .clamp-hint'))
      .toHaveText('Offset limited by the end point');
  });

  test('E2E-5.6 preview hears the section: offset 0:00.5, end 0:01.5 → 1.0 s', async ({ page }) => {
    await loadFixture(page);
    await page.fill('#offsetInput', '0:00.5');
    await page.keyboard.press('Enter');
    await setEnd(page, '0:01.5');

    await startRecordedSequence(page, '#previewBtn');
    await expect(page.locator('div[role="status"][aria-live="polite"]'), { timeout: 10000 })
      .toHaveText(/Preview stopped/);
    const timeline = await readTimeline(page);

    // D2 generalized (EN-D5): length = min(3 s preview, 1.0 s section)
    const stopped = timeline.filter((e) => /Preview stopped/.test(e.ann)).pop();
    expect(stopped, 'Preview stopped announcement').toBeTruthy();
    expect(Math.abs(stopped.t - 1000), `preview ended at ${stopped.t.toFixed(0)} ms`)
      .toBeLessThanOrEqual(300);

    await expect(page.locator('.progress-readout')).toHaveText('0:00.5 / 0:03.0');
  });

  test('E2E-5.7 param lock: end field disabled + handle pointer-events none while running', async ({ page }) => {
    await loadFixture(page);
    await expectWaveformReady(page);
    await setEnd(page, '0:02.0');
    await setCountIn(page, 8); // long count-in: stay locked through both states

    const handlePointerEvents = () =>
      page.$eval('#waveformEndHandle', (el) => getComputedStyle(el).pointerEvents);

    await startRecordedSequence(page);

    await expect.poll(() => appState(page), { timeout: 10000 }).toBe('countingIn');
    await expect(page.locator('#endInput'), 'end locked in countingIn').toBeDisabled();
    expect(await handlePointerEvents(), 'handle locked in countingIn').toBe('none');

    await expect.poll(() => appState(page), { timeout: 10000 }).toBe('playing');
    await expect(page.locator('#endInput'), 'end locked in playing').toBeDisabled();
    expect(await handlePointerEvents(), 'handle locked in playing').toBe('none');

    await page.click('#playStopBtn');
    await expect.poll(() => appState(page), { timeout: 10000 }).toBe('ready');
    await expect(page.locator('#endInput'), 'end unlocked after stop').toBeEnabled();
    expect(await handlePointerEvents(), 'handle unlocked after stop').toBe('auto');
    await readTimeline(page); // stop the in-page logger
  });

  test('E2E-5.8 swap to a LONGER file preserves a still-valid end (EN-D14)', async ({ page }) => {
    await loadFixture(page);
    await expectWaveformReady(page);
    await setEnd(page, '0:02.5');

    // Tag the handle node: v-show must NOT recreate it across the swap (R-3)
    await page.evaluate(() => { document.getElementById('waveformEndHandle').__cr003 = 'kept'; });

    await loadFile(page, CLICKS20); // 20 s — 2.5 s is still in range
    await expectWaveformReady(page);

    await expect(page.locator('#endInput')).toHaveValue('0:02.5'); // re-clamp no-op
    await expect(page.locator('.control-group--end .clamp-hint')).toHaveCount(0);
    expect(await page.$eval('#waveformEndHandle', (el) => el.__cr003), 'handle node preserved (v-show)')
      .toBe('kept');
    expect(await page.$eval('#waveformEndHandle', (el) => el.offsetParent !== null), 'handle visible')
      .toBe(true);
  });

  test('E2E-5.9 swap to a SHORTER file clears an inexpressible end (EN-D14)', async ({ page }) => {
    await waitForAppMount(page); // loadFile assumes a mounted app
    await loadFile(page, CLICKS20); // 20 s
    await page.fill('#offsetInput', '0:15.0');
    await page.keyboard.press('Enter');
    await setEnd(page, '0:15.1');
    await expect(page.locator('#endInput')).toHaveValue('0:15.1');

    await loadFile(page, FIXTURE); // 3 s — 15.1 s is inexpressible
    await expect(page.locator('#offsetInput')).toHaveValue('0:03.0'); // existing offset re-clamp
    await expect(page.locator('#endInput')).toHaveValue('');          // cleared, not broken
    await expect(page.locator('.control-group--end .clamp-hint'))
      .toHaveText('Section end removed (song too short)');
  });

  test('E2E-5.10 restart mid-section replays the identical section (KB-5)', async ({ page }) => {
    await loadFixture(page);
    await setEnd(page, '0:01.5');
    await setCountIn(page, 4);

    await startRecordedSequence(page);
    await scheduleActionAt(page, '#restartBtn', 3000); // mid-first-section (2500–4000)
    await expect.poll(() => appState(page), { timeout: 20000 }).toBe('ready');
    const timeline = await readTimeline(page);
    const actionT = await readActionT(page);
    expect(actionT, 'restart click recorded').toBeTruthy();

    const playings = transitionsTo(timeline, 'playing');
    const readys = transitionsTo(timeline, 'ready');
    expect(playings.length, 'two playing phases').toBe(2);
    // The restart ABORTS the first section mid-run — the whole run produces
    // exactly ONE ready transition (at the end of the second section).
    expect(readys.length, 'exactly one ready transition').toBe(1);

    // Second sequence follows the grid law again from the restart press:
    // count-in 4 @ 120 → flip at +2500 (±300 ms); the identical 1.5 s
    // section ends ≈ 1500 ms later (±500 ms).
    expect(Math.abs(playings[1].t - actionT - 2500),
      `second flip at ${playings[1].t.toFixed(0)} ms (restart ${actionT.toFixed(0)})`)
      .toBeLessThanOrEqual(300);
    expect(Math.abs(readys[0].t - playings[1].t - 1500),
      `ready at ${readys[0].t.toFixed(0)} ms`)
      .toBeLessThanOrEqual(500);

    // The aborted section never completes → exactly ONE "Section ended"
    // across the run (EN-D7); the interrupted sequence announces nothing.
    const sectionEnds = timeline.filter((e) => /Section ended/.test(e.ann));
    expect(sectionEnds.length, 'one Section ended announcement').toBe(1);
  });

  test('E2E-5.11 drag from the ghost handle sets a section; drag back to the edge clears it (2026-08-30)', async ({ page }) => {
    await loadFixture(page);
    await expectWaveformReady(page);

    // No end set: the ghost rests at the right edge.
    expect(await page.locator('#endInput').inputValue(), 'no end set').toBe('');
    expect(await handleLeftPct(page), 'ghost at the right edge').toBeCloseTo(100, 1);

    const ghost = await page.locator('#waveformEndHandle').boundingBox();
    const canvas = await page.locator('#waveformCanvas').boundingBox();
    const y = ghost.y + ghost.height / 2;

    // Drag the ghost LEFT to 50 % → commits a 1.5 s section.
    await page.mouse.move(ghost.x + ghost.width / 2, y);
    await page.mouse.down();
    await page.mouse.move(canvas.x + canvas.width * 0.5, y, { steps: 5 });
    await page.mouse.up();
    await expect(page.locator('#endInput')).toHaveValue('0:01.5');
    expect(await page.$eval('#waveformEndHandle', (el) => el.classList.contains('waveform-end-handle--ghost')), 'no longer a ghost').toBe(false);

    // Drag it back to the right edge → at-the-end ⇔ null: the field clears.
    const handle = await page.locator('#waveformEndHandle').boundingBox();
    await page.mouse.move(handle.x + handle.width / 2, y);
    await page.mouse.down();
    await page.mouse.move(canvas.x + canvas.width - 2, y, { steps: 5 });
    await page.mouse.up();
    await expect(page.locator('#endInput')).toHaveValue('');
    expect(await handleLeftPct(page), 'back at the right edge').toBeCloseTo(100, 1);
  });
});
