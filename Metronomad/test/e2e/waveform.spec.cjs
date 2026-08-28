/**
 * CR 001 Phase 4 — waveform progress + playhead E2E (E2E-3.1…E2E-3.4),
 * Playwright, chromium.
 *
 * Fixture: 3 s 440 Hz sine MP3 (test/fixtures/sine3s.mp3).
 *
 * Conventions (behavior-specs.md §4; playback.spec.cjs timing methodology):
 *   - in-page clocks only — node-side polls are starved under load
 *   - E2E-3.1 uses in-page MutationObservers: it asserts the ORDER of two
 *     one-shot transitions (ready → first painted frame), and a 5 ms poll
 *     can land both in one sample (the READY→paint gap is one setTimeout(0)
 *     + ~1 ms of peak extraction) — observers record each DOM change at its
 *     exact in-page timestamp, so the ordering is exact, not sampled
 *   - E2E-3.2 uses the 5 ms transition logger for the continuous signal
 *     (t0 anchored in the same evaluate as the Play click, the convention)
 *   - data-position-tenths is a STRING at 10 Hz (R-7) — compare stringified
 *     tenths
 *   - never listen to audio
 */

const { test, expect } = require('@playwright/test');
const {
  loadFixture, waitForAppMount, expectReady, appState, FIXTURE
} = require('./helpers.cjs');

/** Set the count-in input to an exact value (commit-on-Enter draft, C-1). */
async function setCountIn(page, value) {
  await page.fill('#countInInput', String(value));
  await page.keyboard.press('Enter');
}

/** Read back window.__timeline and stop the in-page logger. */
async function readTimeline(page) {
  return page.evaluate(() => {
    if (window.__tlIv) clearInterval(window.__tlIv);
    window.__tlIv = null;
    if (window.__moIv) window.__moIv.disconnect();
    return window.__timeline;
  });
}

test.describe('CR 001 Phase 4 — waveform progress (E2E-3.x)', () => {
  test('E2E-3.1 waveform paints; Ready is never delayed (W-6)', async ({ page }) => {
    await waitForAppMount(page);

    // In-page observers record every change of body[data-state] and
    // #waveformCanvas[data-loaded] at its exact timestamp — the assertion
    // is the ORDER of the two transitions, exact without a poll gap.
    await page.evaluate(() => {
      window.__t0 = performance.now();
      window.__timeline = [];
      const record = (kind, value) =>
        window.__timeline.push({ t: performance.now() - window.__t0, kind, value });
      window.__moIv = new MutationObserver((mutations) => {
        for (const m of mutations) {
          if (m.target === document.body) {
            record('state', document.body.dataset.state);
          } else if (m.target.id === 'waveformCanvas') {
            record('loaded', m.target.getAttribute('data-loaded'));
          }
        }
      });
      window.__moIv.observe(document.body, { attributes: true, attributeFilter: ['data-state'] });
      const canvas = document.getElementById('waveformCanvas');
      window.__moIv.observe(canvas, { attributes: true, attributeFilter: ['data-loaded'] });
    });

    await page.setInputFiles('#fileInput', FIXTURE);
    await expect(page.locator('#waveformCanvas')).toHaveAttribute('data-loaded', 'true', { timeout: 10000 });
    await expectReady(page);

    const timeline = await readTimeline(page);

    const ready = timeline.find((e) => e.kind === 'state' && e.value === 'ready');
    const painted = timeline.find((e) => e.kind === 'loaded' && e.value === 'true');
    expect(ready, 'a ready transition was recorded').toBeTruthy();
    expect(painted, 'a data-loaded=true transition was recorded').toBeTruthy();
    // The READY paint strictly precedes the first painted frame: the peaks
    // task yields (setTimeout 0) BEHIND the READY flip (W-6).
    expect(painted.t, `painted at ${painted.t.toFixed(0)} ms must be after ready at ${ready.t.toFixed(0)} ms`)
      .toBeGreaterThan(ready.t);

    const width = await page.$eval('#waveformCanvas', (el) => el.offsetWidth);
    expect(width, 'canvas is visible (offsetWidth > 0)').toBeGreaterThan(0);
  });

  test('E2E-3.2 playhead tracks during playback (10 Hz tenths)', async ({ page }) => {
    await loadFixture(page);
    await setCountIn(page, 1);

    // In-page 5 ms logger anchored to the Play click (same evaluate):
    // { state, playhead tenths, readout position } per change.
    await page.evaluate(() => {
      window.__t0 = performance.now();
      window.__timeline = [];
      const toSec = (s) => {
        const [m, r] = s.trim().split(':');
        return Number(m) * 60 + Number(r);
      };
      const read = () => {
        const ph = document.getElementById('waveformPlayhead');
        const ro = document.querySelector('.progress-readout');
        return [
          document.body.dataset.state,
          ph ? ph.dataset.positionTenths : null,
          ro ? toSec(ro.textContent.split('/')[0]) : null
        ];
      };
      let prev = read();
      window.__tlIv = setInterval(() => {
        const v = read();
        if (v.some((x, i) => x !== prev[i])) {
          window.__timeline.push({ t: performance.now() - window.__t0, state: v[0], tenths: v[1], pos: v[2] });
          prev = v;
        }
      }, 5);
      document.querySelector('#playStopBtn').click();
    });

    // Count-in 1 @120 BPM: song at t0+1.0 s, 3 s song → ready again by ~4.2 s.
    await expect.poll(() => appState(page), { timeout: 10000 }).toBe('ready');
    const timeline = await readTimeline(page);

    const playing = timeline.filter((e) => e.state === 'playing');
    expect(playing.length, 'playing frames recorded').toBeGreaterThan(0);

    // Two samples ≥ 1 s apart during playing.
    const a = playing[0];
    const b = playing.find((e) => e.t >= a.t + 1000);
    expect(b, 'a second playing sample ≥ 1 s later').toBeTruthy();

    // Monotonic advance from the offset's tenths (offset 0 → "0").
    expect(Number(a.tenths), 'first sample at/after the offset').toBeGreaterThanOrEqual(0);
    expect(Number(b.tenths), 'second sample advanced').toBeGreaterThan(Number(a.tenths));

    // Each within ±1 tenth of the readout at the same timestamp (the
    // readout is the tenth-second ground truth; 10 Hz cadence).
    expect(Math.abs(Number(a.tenths) - a.pos * 10), 'sample A tracks the readout').toBeLessThanOrEqual(1);
    expect(Math.abs(Number(b.tenths) - b.pos * 10), 'sample B tracks the readout').toBeLessThanOrEqual(1);
  });

  test('E2E-3.3 playhead parks at the offset in Ready', async ({ page }) => {
    await loadFixture(page);

    // Commit the offset via the text field (Enter commits, RD-1).
    await page.fill('#offsetInput', '0:01.2');
    await page.keyboard.press('Enter');

    await expect(page.locator('#waveformPlayhead')).toHaveAttribute('data-position-tenths', '12');
    await expect(page.locator('.progress-readout')).toHaveText('0:01.2 / 0:03.0');
  });

  test('E2E-3.4 responsive height clamp (W-4)', async ({ page }) => {
    // 360 px wide → the ≤375 px breakpoint → 48 px.
    await page.setViewportSize({ width: 360, height: 740 });
    await loadFixture(page);
    const hNarrow = await page.$eval('.waveform', (el) => getComputedStyle(el).height);
    expect(hNarrow, 'narrow viewport height').toBe('48px');
    // The canvas backing store must track the clamped box, not a
    // hard-coded 64 (review F-2 — vertical squish regression guard).
    const matchNarrow = await page.$eval('#waveformCanvas', (c) =>
      c.height / window.devicePixelRatio === c.parentElement.clientHeight);
    expect(matchNarrow, 'narrow backing store matches the CSS box').toBe(true);
    await expect(page.locator('.progress-readout')).toBeVisible();

    // 1280 px wide → default 64 px.
    await page.setViewportSize({ width: 1280, height: 800 });
    await loadFixture(page);
    const hWide = await page.$eval('.waveform', (el) => getComputedStyle(el).height);
    expect(hWide, 'wide viewport height').toBe('64px');
    const matchWide = await page.$eval('#waveformCanvas', (c) =>
      c.height / window.devicePixelRatio === c.parentElement.clientHeight);
    expect(matchWide, 'wide backing store matches the CSS box').toBe(true);
    await expect(page.locator('.progress-readout')).toBeVisible();
  });
});

/**
 * CR 001 Phase 5 — scrub + keyboard replaces the old offset range
 * scrubber (E2E-3.5…E2E-3.10; behavior-specs.md §5).
 *
 * Conventions: same as the Phase 4 block — in-page programs are
 * standalone (every helper defined locally), no waitForTimeout for
 * assertions, no audio assertions. pointercancel/blur are dispatched
 * in-page (synthetic PointerEvents; the view's capture try/catch makes
 * the stale synthetic pointerId a no-op, exactly the W-1 shape).
 */
test.describe('CR 001 Phase 5 — scrub + keyboard (E2E-3.5…E2E-3.10)', () => {
  /** Canvas client point at a horizontal fraction (0–1) of its width. */
  async function canvasPoint(page, fracX) {
    const box = await page.locator('#waveformCanvas').boundingBox();
    return { x: box.x + box.width * fracX, y: box.y + box.height / 2, box };
  }

  /** Dispatch a synthetic pointerdown at 50 % of the canvas (in-page). */
  const dispatchSyntheticDown = (page) => page.evaluate(() => {
    const canvas = document.getElementById('waveformCanvas');
    const rect = canvas.getBoundingClientRect();
    canvas.dispatchEvent(new PointerEvent('pointerdown', {
      clientX: rect.left + rect.width * 0.5,
      clientY: rect.top + rect.height / 2,
      pointerId: 1, bubbles: true, cancelable: true
    }));
  });

  test('E2E-3.5 click scrubs the offset; focus returns to the canvas', async ({ page }) => {
    await loadFixture(page);

    const { x, y } = await canvasPoint(page, 0.5);
    await page.mouse.click(x, y);

    await expect(page.locator('#offsetInput')).toHaveValue('0:01.5');
    await expect(page.locator('#waveformCanvas')).toHaveAttribute('aria-valuenow', '1.5');
    await expect(page.locator('#waveformCanvas')).toHaveAttribute('aria-valuetext', 'Offset 0:01.5');
    await expect(page.locator('.progress-readout')).toHaveText('0:01.5 / 0:03.0');
    // CR §1.5: a committed end returns focus to the slider — arrow
    // continuation is one action away.
    const activeId = await page.evaluate(() => document.activeElement.id);
    expect(activeId, 'focus returned to the canvas').toBe('waveformCanvas');
  });

  test('E2E-3.6 drag scrubs continuously; release commits, no stuck draft', async ({ page }) => {
    await loadFixture(page);

    // In-page 5 ms logger: readout text on each change — the draft
    // tracking during the drag is a continuous signal (the convention).
    await page.evaluate(() => {
      window.__readoutLog = [];
      const ro = document.querySelector('.progress-readout');
      let prev = ro.textContent;
      window.__roIv = setInterval(() => {
        if (ro.textContent !== prev) {
          prev = ro.textContent;
          window.__readoutLog.push(prev);
        }
      }, 5);
    });

    const box = await page.locator('#waveformCanvas').boundingBox();
    const y = box.y + box.height / 2;
    await page.mouse.move(box.x + box.width * 0.2, y);
    await page.mouse.down();
    for (const f of [0.3, 0.4, 0.5, 0.6]) {
      await page.mouse.move(box.x + box.width * f, y);
    }
    await page.mouse.up();

    // Release: the draft commits — the committed readout is the exact
    // tick (the 5 ms sampler can coalesce intermediate ticks under load,
    // so the during-drag claim is "samples advance", pinned below).
    await expect(page.locator('.progress-readout')).toHaveText('0:01.8 / 0:03.0');
    // Wait until the in-page sampler has actually RECORDED the final tick
    // (clearing the logger first would race the next 5 ms tick).
    await page.waitForFunction(() => {
      const log = window.__readoutLog;
      return log.length > 0 && log[log.length - 1] === '0:01.8 / 0:03.0';
    });

    const log = await page.evaluate(() => {
      clearInterval(window.__roIv);
      return window.__readoutLog;
    });

    const toSec = (s) => {
      const [m, r] = s.trim().split(':');
      return Number(m) * 60 + Number(r);
    };
    const positions = log.map((t) => toSec(t.split('/')[0]));
    expect(positions.length, 'multiple draft samples during the drag').toBeGreaterThanOrEqual(3);
    for (let i = 1; i < positions.length; i++) {
      expect(positions[i], `sample ${i} advances`).toBeGreaterThan(positions[i - 1]);
    }
    // The first SAMPLED tick can coalesce under load (two pointer events
    // in one 5 ms window) — pin the RANGE, not the exact tick: the drag
    // starts at the press point (≥ 0.6) and never jumps to the release
    // point. The exact end is pinned by the committed-readout wait above.
    expect(positions[0], 'draft starts at/after the press point').toBeGreaterThanOrEqual(0.6);
    expect(positions[0], 'draft does not jump to the release point').toBeLessThan(1.8);
    expect(positions[positions.length - 1], 'draft ends at 60 %').toBeCloseTo(1.8, 1);

    // Committed state: the field mirrors the release point (≈ 1.8, ±1
    // tenth per the spec — the readout above pins the exact tick).
    await expect(page.locator('#offsetInput')).toHaveValue('0:01.8');
    await page.mouse.click(box.x + box.width * 0.5, y);
    await expect(page.locator('#offsetInput')).toHaveValue('0:01.5'); // no stuck draft
  });

  test('E2E-3.7 pointercancel and window blur discard the draft (W-1)', async ({ page }) => {
    await loadFixture(page);
    const { box } = await canvasPoint(page, 0.5);
    const y = box.y + box.height / 2;
    const realClick = (frac) => page.mouse.click(box.x + box.width * frac, y);

    // The draft tracks the READOUT (displayPosition) — #offsetInput
    // mirrors the COMMITTED offset only, so the draft-live / discarded
    // assertions target the readout, not the field.
    // (a) pointercancel (iOS OS-gesture shape): the draft is live, then
    // discarded; nothing committed; a subsequent real click commits.
    await dispatchSyntheticDown(page);
    await expect(page.locator('.progress-readout')).toHaveText('0:01.5 / 0:03.0'); // draft is live
    await page.evaluate(() => {
      document.getElementById('waveformCanvas')
        .dispatchEvent(new PointerEvent('pointercancel', { pointerId: 1, bubbles: true, cancelable: true }));
    });
    await expect(page.locator('.progress-readout')).toHaveText('0:00.0 / 0:03.0'); // discarded
    await expect(page.locator('#offsetInput')).toHaveValue('0:00.0'); // nothing committed
    await realClick(0.5);
    await expect(page.locator('#offsetInput')).toHaveValue('0:01.5'); // no stuck draft

    // Reset to 0 (keyboard parity doubles as the reset path).
    await page.locator('#waveformCanvas').focus();
    await page.keyboard.press('Home');
    await expect(page.locator('#offsetInput')).toHaveValue('0:00.0');

    // (b) window blur mid-drag: the other cleanup path, same discard.
    await dispatchSyntheticDown(page);
    await expect(page.locator('.progress-readout')).toHaveText('0:01.5 / 0:03.0');
    await page.evaluate(() => window.dispatchEvent(new Event('blur')));
    await expect(page.locator('.progress-readout')).toHaveText('0:00.0 / 0:03.0');
    await realClick(0.5);
    await expect(page.locator('#offsetInput')).toHaveValue('0:01.5');
  });

  test('E2E-3.8 keyboard parity on the canvas (replaces the old scrubber arrow test)', async ({ page }) => {
    await loadFixture(page);
    const canvas = page.locator('#waveformCanvas');
    await canvas.focus();

    for (let i = 0; i < 5; i++) await page.keyboard.press('ArrowRight');
    await expect(page.locator('.progress-readout')).toHaveText('0:00.5 / 0:03.0');
    await expect(canvas).toHaveAttribute('aria-valuenow', '0.5');
    await expect(canvas).toHaveAttribute('aria-valuetext', 'Offset 0:00.5');

    await page.keyboard.press('Shift+ArrowRight');
    await expect(page.locator('.progress-readout')).toHaveText('0:01.5 / 0:03.0');
    await expect(canvas).toHaveAttribute('aria-valuenow', '1.5');

    // PageUp = 10 % of duration = +0.3 on the 3 s fixture (W-9/UX-1).
    await page.keyboard.press('PageUp');
    await expect(page.locator('.progress-readout')).toHaveText('0:01.8 / 0:03.0');
    await expect(canvas).toHaveAttribute('aria-valuenow', '1.8');

    await page.keyboard.press('End');
    await expect(page.locator('.progress-readout')).toHaveText('0:03.0 / 0:03.0');
    await expect(canvas).toHaveAttribute('aria-valuenow', '3');
    await expect(canvas).toHaveAttribute('aria-valuetext', 'Offset 0:03.0');

    await page.keyboard.press('Home');
    await expect(page.locator('.progress-readout')).toHaveText('0:00.0 / 0:03.0');
    await expect(canvas).toHaveAttribute('aria-valuenow', '0');
  });

  test('E2E-3.9 ARIA roles + tabindex: canvas = slider, readout = progressbar (W-10)', async ({ page }) => {
    await loadFixture(page);

    const aria = await page.evaluate(() => {
      const c = document.getElementById('waveformCanvas');
      const ro = document.querySelector('.progress-readout');
      return {
        canvas: {
          role: c.getAttribute('role'),
          tabindex: c.getAttribute('tabindex'),
          label: c.getAttribute('aria-label'),
          valuemax: c.getAttribute('aria-valuemax'),
          valuemin: c.getAttribute('aria-valuemin'),
          valuenow: c.getAttribute('aria-valuenow'),
          valuetext: c.getAttribute('aria-valuetext')
        },
        readout: {
          role: ro.getAttribute('role'),
          valuenow: ro.getAttribute('aria-valuenow'),
          valuetext: ro.getAttribute('aria-valuetext')
        }
      };
    });

    // The two roles live on TWO DISTINCT elements (W-10 split).
    expect(aria.canvas.role).toBe('slider');
    expect(aria.readout.role).toBe('progressbar');
    // Ready: the canvas is in the tab order, valued from the offset.
    expect(aria.canvas.tabindex).toBe('0');
    expect(aria.canvas.label).toBe('Start offset');
    expect(aria.canvas.valuemin).toBe('0');
    // KB-17/R-3: aria-valuemax carries the raw (possibly non-round)
    // float — assert numerically, not by string.
    expect(Number(aria.canvas.valuemax)).toBeCloseTo(3, 1);
    expect(aria.canvas.valuenow).toBe('0');
    expect(aria.canvas.valuetext).toBe('Offset 0:00.0');
    expect(aria.readout.valuenow).toBe('0');
    expect(aria.readout.valuetext).toBe('0:00.0');

    // noFile: the canvas is out of the tab order; the progressbar
    // readout is absent (no file).
    await waitForAppMount(page);
    const noFile = await page.evaluate(() => ({
      tabindex: document.getElementById('waveformCanvas').getAttribute('tabindex'),
      readoutCount: document.querySelectorAll('.progress-readout').length
    }));
    expect(noFile.tabindex).toBe('-1');
    expect(noFile.readoutCount).toBe(0);
  });

  test('E2E-3.10 param lock on the canvas; the old range scrubber is gone (E2E-1.6 preserved, O-1)', async ({ page }) => {
    await loadFixture(page);
    // Long count-in so node-side polls (slow under load) stay inside the window.
    await setCountIn(page, 8);
    const canvas = page.locator('#waveformCanvas');
    const pointerEvents = () =>
      page.$eval('#waveformCanvas', (el) => getComputedStyle(el).pointerEvents);

    await page.click('#playStopBtn');

    // R-1: a canvas can never be :disabled — the lock contract is
    // aria-disabled + pointer-events: none.
    await expect.poll(() => appState(page), { timeout: 10000 }).toBe('countingIn');
    await expect(canvas).toHaveAttribute('aria-disabled', 'true');
    expect(await pointerEvents(), 'pointer-events none in countingIn').toBe('none');

    await expect.poll(() => appState(page), { timeout: 10000 }).toBe('playing');
    await expect(canvas).toHaveAttribute('aria-disabled', 'true');
    expect(await pointerEvents(), 'pointer-events none in playing').toBe('none');

    await page.click('#playStopBtn');
    await expect.poll(() => appState(page), { timeout: 10000 }).toBe('ready');
    await expect(canvas).not.toHaveAttribute('aria-disabled');

    // O-1: the old range scrubber is out of the DOM entirely (it was the
    // app's only range input).
    await expect(page.locator('#app input[type="range"]')).toHaveCount(0);
  });
});
