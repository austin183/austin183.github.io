/**
 * Phase 8 — Full keyboard pass (acceptance item 10 / U-23, U-12, V-07), Playwright, chromium.
 *
 * Automates the manual keyboard checklist:
 *   - exact Tab order in the ready state (U-23: sensible order, all operable by keyboard)
 *   - locked parameter controls are unfocusable while a sequence runs (U-12: Tab skips them)
 *   - a complete play → restart → stop → tune → preview flow using the KEYBOARD ONLY,
 *     with live-region announcements asserted on the polite status region (V-07)
 *   - focus returns to the Play/Stop button after Stop/Restart (U-04/V-02)
 *
 * Conventions: same as playback.spec.cjs — state via body[data-state],
 * expect/expect.poll for transitions, no waitForTimeout for assertions,
 * no audio assertions (announcements are DOM text).
 */

const { test, expect } = require('@playwright/test');
const { loadFixture } = require('./helpers.cjs');

/** Polite live region (the clamp hints also use role="status" — scope to .sr-only). */
const liveRegion = (page) => page.locator('div.sr-only[role="status"]');

const activeId = (page) => page.evaluate(() => document.activeElement?.id ?? '');

/**
 * Press Tab `n` times and return the sequence of focused element ids
 * (empty string for body/none). Called with focus already on `startId`.
 */
async function tabSequence(page, n) {
  const seq = [];
  for (let i = 0; i < n; i++) {
    await page.keyboard.press('Tab');
    seq.push(await activeId(page));
  }
  return seq;
}

test.describe('Phase 8 — keyboard pass (U-23, U-12, V-07)', () => {
  test.beforeEach(async ({ page }) => {
    await loadFixture(page);
  });

  test('ready: exact Tab order, all controls keyboard-reachable', async ({ page }) => {
    await expect(page.locator('body')).toHaveAttribute('data-state', 'ready');
    await page.locator('#browseBtn').focus();
    // restartBtn is disabled in ready (isSequenceRunning false) → skipped.
    // O-1 (CR 001 Phase 5): the canvas slider lands at the END of the
    // app's tab order — tab order is DOM order and the canvas lives in
    // the progress block below the playback buttons (it cannot take the
    // deleted scrubber's slot without moving the whole layout).
    const seq = await tabSequence(page, 8);
    expect(seq).toEqual([
      'bpmMinusBtn',
      'bpmInput',
      'bpmPlusBtn',
      'offsetInput',
      'countInInput',
      'playStopBtn',
      'previewBtn',
      'waveformCanvas',
    ]);
  });

  test('counting in: Tab skips locked parameter controls, Restart reachable', async ({ page }) => {
    await page.fill('#countInInput', '8'); // long count-in: stay locked through the pass
    await page.locator('#playStopBtn').press('Enter');
    await expect(page.locator('body')).toHaveAttribute('data-state', 'countingIn');

    await page.locator('#playStopBtn').focus();
    const seq = await tabSequence(page, 4);
    // Only Restart sits between Play/Stop and the end of the focusable list
    // (preview disabled in countingIn; all parameter controls disabled +
    // canvas tabindex=-1). The rest lands back on body (no wrap in headless).
    expect(seq[0]).toBe('restartBtn');
    for (const id of seq) {
      expect(['bpmMinusBtn', 'bpmInput', 'bpmPlusBtn', 'waveformCanvas', 'offsetInput', 'countInInput', 'previewBtn'])
        .not.toContain(id);
    }

    // Keyboard Stop: focus returns to the toggle (V-02)
    await page.locator('#playStopBtn').press('Enter');
    await expect(page.locator('body')).toHaveAttribute('data-state', 'ready');
    await expect.poll(() => activeId(page)).toBe('playStopBtn');
  });

  test('keyboard-only full flow with live-region announcements', async ({ page }) => {
    await page.fill('#countInInput', '2'); // song starts t0+1.5 s, ends ~t0+4.5 s

    // Play (Enter on the button) → count-in announced
    await page.locator('#playStopBtn').press('Enter');
    await expect.poll(() => liveRegion(page).textContent()).toBe('Count-in started');
    await expect(page.locator('#playStopBtn .btn-label')).toHaveText('Stop');

    // Song starts on the downbeat → announced
    await expect.poll(() => liveRegion(page).textContent(), { timeout: 10000 }).toBe('Song started');

    // Restart by keyboard → new count-in, focus returns to Play/Stop (V-02).
    // N-12: the restart is announced as its own event — "Count-in restarted"
    // (supersedes the engine's "Count-in started" for the new count-in).
    await page.locator('#restartBtn').press('Enter');
    await expect.poll(() => liveRegion(page).textContent()).toBe('Count-in restarted');
    await expect.poll(() => activeId(page)).toBe('playStopBtn');

    // Stop by keyboard → ready + announced
    await page.locator('#playStopBtn').press('Enter');
    await expect(page.locator('body')).toHaveAttribute('data-state', 'ready');
    await expect.poll(() => liveRegion(page).textContent()).toBe('Stopped');

    // BPM by keyboard: stepper +1
    await expect(page.locator('#bpmInput')).toHaveValue('120');
    await page.locator('#bpmPlusBtn').press('Enter');
    await expect(page.locator('#bpmInput')).toHaveValue('121');

    // Offset by keyboard scrub: arrows move the canvas slider (step 0.1),
    // readout follows (item 2; O-1 — the old range is gone)
    await page.locator('#waveformCanvas').focus();
    for (let i = 0; i < 5; i++) await page.keyboard.press('ArrowRight');
    await expect(page.locator('.progress-readout')).toHaveText('0:00.5 / 0:03.0');

    // Offset by keyboard: type + Enter commits, progress readout follows
    await page.locator('#offsetInput').fill('0:01.0');
    await page.locator('#offsetInput').press('Enter');
    await expect(page.locator('.progress-readout')).toHaveText('0:01.0 / 0:03.0');

    // Preview by keyboard → announced, button flips to Stop, clamped auto-stop
    await page.locator('#previewBtn').press('Enter');
    await expect.poll(() => liveRegion(page).textContent()).toBe('Preview started');
    await expect(page.locator('#playStopBtn .btn-label')).toHaveText('Stop');
    await expect.poll(() => liveRegion(page).textContent(), { timeout: 10000 }).toBe('Preview stopped');

    // Offset preserved through preview (acceptance item 3)
    await expect(page.locator('#offsetInput')).toHaveValue('0:01.0');
  });
});
