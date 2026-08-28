/**
 * Phase 8 — Tab-visibility snap E2E (acceptance item for U-17 / B-02), Playwright, chromium.
 *
 * Automates "switch tabs mid-play and return: dots snap to the correct
 * beat instantly, no drift".
 *
 * Visibility mechanism: headless Chromium (verified on 149: two-page
 * foreground, CDP Emulation.setFocusEmulationEnabled, and
 * Page.setWebLifecycleState all leave document.hidden false) cannot be
 * made genuinely hidden, so the page's `document.hidden` is stubbed and a
 * real `visibilitychange` event is dispatched — the same technique as
 * BeatDotsTest.html (B-02). The contract under test is still real: on
 * hidden, createBeatDots CANCELS its own RAF loop (so the frozen dot
 * state is genuine app behavior, not a browser artifact) while the audio
 * keeps running on the Web Audio clock; on visible, one immediate
 * re-render must snap the dots to the beat the grid law says is current
 * (D9: phase is a pure function of the audio clock — no accumulated
 * state to drift).
 *
 * The ≥ 5 s manual threshold is duration-independent (RAF pause is
 * binary; there is no per-frame accumulation), so the ~1 s hidden window
 * inside the 3 s fixture's song window [t0+1.5, t0+4.5] exercises the
 * identical contract.
 *
 * Grid law (count-in 2, 120 BPM): beat k is at t0 + 500 + k·500 ms
 * (first click 500 ms after the press), dot = k mod 4.
 *   - hide at ~t0+2.7 → beat 4 → dot 0 freezes
 *   - second frozen read at ~t0+3.4 (≈1.4 beats later — a running loop
 *     would have changed the dot by then)
 *   - show at ~t0+3.75 → mid-beat 6 → dot 2; the snap dot stays
 *     different from the frozen dot (0) even if scheduling drifts the
 *     return up to +0.5 s (beat 7 → dot 3)
 *
 * Timing anchors — two hard-won lessons from flake debugging:
 *   1. The expectation is anchored on t0 (set in the SAME evaluate as
 *      the Play click, the playback.spec.cjs convention), NOT on the
 *      state-flip transition: the flip NOTIFICATION can lag the audio
 *      clock by hundreds of ms under load (the audio itself starts on
 *      time), which would corrupt any flip-anchored math.
 *   2. All arithmetic uses MILLISECONDS (500 ms beats, not 0.5 s).
 * The grid-law expectation is computed in the SAME evaluate as the
 * visible-dispatch (the app re-renders synchronously during dispatchEvent,
 * so the gap is microseconds — a later separate read races the beat
 * boundary under load). The snapped DOM attribute is read afterwards:
 * `:data-beat` is a Vue binding that flushes in a microtask, so a
 * synchronous read in the dispatch evaluate would see the stale value.
 */

const { test, expect } = require('@playwright/test');
const { loadFixture } = require('./helpers.cjs');

const BEAT_MS = 500; // 120 BPM, in MILLISECONDS
const FIRST_CLICK_MS = 500; // first click is one beat after the press

/** Stub document.hidden = true and dispatch a real visibilitychange event. */
async function setHidden(page) {
  await page.evaluate(() => {
    // Save the original descriptor so the page is left clean.
    window.__hiddenDescriptor = Object.getOwnPropertyDescriptor(Document.prototype, 'hidden');
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
    document.dispatchEvent(new Event('visibilitychange'));
  });
}

/**
 * Restore document.hidden, dispatch visibilitychange (the app snaps
 * synchronously), and return the grid-law expected dot computed at the
 * same instant. See the file header for why the expectation is sampled
 * here but the DOM attribute is not.
 */
async function showAndExpect(page) {
  return page.evaluate(([beatMs, firstClickMs]) => {
    Object.defineProperty(document, 'hidden', window.__hiddenDescriptor);
    document.dispatchEvent(new Event('visibilitychange')); // app snaps synchronously
    const beatIndex = Math.floor((performance.now() - window.__t0 - firstClickMs) / beatMs);
    return String(((beatIndex % 4) + 4) % 4);
  }, [BEAT_MS, FIRST_CLICK_MS]);
}

test.describe('Phase 8 — tab visibility (U-17, B-02)', () => {
  test('hidden mid-song: dots frozen; on return they snap to the grid-law beat', async ({ page }) => {
    await loadFixture(page);
    await page.fill('#countInInput', '2');

    // Anchor t0 in the SAME evaluate as the trigger (playback.spec.cjs convention).
    await page.evaluate(() => {
      window.__t0 = performance.now();
      document.querySelector('#playStopBtn').click();
    });
    await expect(page.locator('body')).toHaveAttribute('data-state', 'playing', { timeout: 10000 });

    // Go hidden ~1.2 s into the song (grid beat 4 → dot 0 will freeze).
    await page.waitForFunction(() => performance.now() - window.__t0 >= 2700);
    await setHidden(page);
    const frozen1 = await page.locator('#beatDots').getAttribute('data-beat');

    // ~0.7 s later (≈1.4 beats): if the loop were still running the dot
    // would have changed; frozen means the app canceled its RAF loop.
    await page.waitForFunction(() => performance.now() - window.__t0 >= 3400);
    const frozen2 = await page.locator('#beatDots').getAttribute('data-beat');
    expect(frozen2).toBe(frozen1);

    // Return at ~2.25 s of song (mid-beat, grid beat 6 → dot 2).
    await page.waitForFunction(() => performance.now() - window.__t0 >= 3750);
    const expected = await showAndExpect(page);
    // Vue has flushed the snap patch by now (the locator round-trip is
    // far longer than the microtask flush; the value is stable for the
    // rest of the beat).
    const snapped = await page.locator('#beatDots').getAttribute('data-beat');
    expect(snapped).toBe(expected);
    expect(snapped).not.toBe(frozen1); // the snap actually moved the dot

    // The loop resumed — the dot advances to the next beat within 1 s
    // (proves frames flow again, not just the one-shot snap).
    await expect
      .poll(() => page.locator('#beatDots').getAttribute('data-beat'), { timeout: 3000 })
      .not.toBe(snapped);
  });
});
