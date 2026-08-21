/**
 * Phase 7 — Error-handling E2E (E2E-2.x), Playwright, chromium.
 *
 * Conventions (behavior-specs.md §3.4): assert via the data-state hook and
 * visible UI; no waitForTimeout; never listen to audio.
 *
 * Note: a true codec-reject E2E is impossible on chromium (it supports
 * every common codec — research §6); that path is unit F-02 + manual Safari.
 */

const { test, expect } = require('@playwright/test');
const { FIXTURE, BAD_FIXTURE, waitForAppMount, loadFixture } = require('./helpers.cjs');

test.describe('Phase 7 — error handling (E2E-2.x)', () => {
  test('E2E-2.1 decode failure: friendly alert, non-blocking (D8)', async ({ page }) => {
    await waitForAppMount(page);

    await page.setInputFiles('#fileInput', BAD_FIXTURE);

    // Friendly message — no cryptic DOMException text
    await expect(page.locator('div[role="alert"]')).toBeVisible();
    const message = await page.locator('div[role="alert"]').textContent();
    expect(message, 'no raw engine error text')
      .not.toMatch(/DOMException|Failed to execute|decodeAudioData/);
    expect(message).toMatch(/Couldn't decode/);

    // App stays in its last valid state (noFile — the load never succeeded)
    await expect(page.locator('body')).toHaveAttribute('data-state', 'noFile');

    // Non-blocking: a later successful load recovers and clears the error
    await page.setInputFiles('#fileInput', FIXTURE);
    await expect(page.locator('body')).toHaveAttribute('data-state', 'ready');
    await expect(page.locator('div[role="alert"]')).toHaveCount(0);
  });

  test('E2E-2.3 clamps: offset and BPM commit to limits with hints', async ({ page }) => {
    await loadFixture(page);
    const offsetHint = page.locator('.control-group--offset .clamp-hint');
    const bpmHint = page.locator('.control-group:first-child .clamp-hint');

    // Negative offset → invalid entry: reverts to the last valid value (0)
    // with a hint — observable outcome matches the plan's 0:00.0 + hint.
    // (Runs before the clamping commit: a later invalid entry would revert
    // to the clamped 0:03.0.)
    await page.fill('#offsetInput', '-1');
    await page.keyboard.press('Enter');
    await expect(page.locator('#offsetInput')).toHaveValue('0:00.0');
    await expect(offsetHint).toBeVisible();

    // Offset above duration → clamps to the end, with hint.
    // Plan note: E2E-2.3's "9:99.9" is MALFORMED per the pinned parser
    // (T-22: seconds ≥ 60 → null), so a valid over-duration value is used.
    await page.fill('#offsetInput', '9:59.9');
    await page.keyboard.press('Enter');
    await expect(page.locator('#offsetInput')).toHaveValue('0:03.0');
    await expect(offsetHint).toBeVisible();

    // BPM above range → 250, with hint
    await page.fill('#bpmInput', '999');
    await expect(page.locator('#bpmInput')).toHaveValue('250');
    await expect(bpmHint).toBeVisible();

    // BPM below range → 30, with hint
    await page.fill('#bpmInput', '10');
    await expect(page.locator('#bpmInput')).toHaveValue('30');
    await expect(bpmHint).toBeVisible();
  });

  test('E2E-2.2 drop lock: file drop during playback is rejected', async ({ page }) => {
    await loadFixture(page);
    await page.click('#playStopBtn');
    await expect.poll(() => page.evaluate(() => document.body.dataset.state), { timeout: 10000 })
      .toBe('playing');

    // A real DataTransfer + DragEvent: the app's drop handler reads
    // event.dataTransfer.files (mocking dataTransfer is impossible per the
    // E2E event-simulation notes, but a genuine DataTransfer converts fine).
    await page.evaluate(() => {
      const dt = new DataTransfer();
      dt.items.add(new File(['not really audio'], 'other-song.mp3', { type: 'audio/mpeg' }));
      document.querySelector('#dropZone').dispatchEvent(
        new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: dt }));
    });

    // Rejected with the lock hint; state and filename unchanged
    await expect(page.locator('div[role="alert"]')).toHaveText('Drop a new song after stopping');
    await expect(page.locator('body')).toHaveAttribute('data-state', 'playing');
    await expect(page.locator('.file-name')).toHaveText('sine3s.mp3');
  });

  test('E2E-2.4 non-audio upload: stays noFile, no crash, console-error free', async ({ page }) => {
    const errors = [];
    page.on('console', (msg) => { if (msg.type() === 'error') errors.push(msg.text()); });
    page.on('pageerror', (err) => errors.push(String(err)));

    await waitForAppMount(page);
    await page.setInputFiles('#fileInput', [{
      name: 'notes.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('not audio')
    }]);

    // Friendly codec error; the app never left noFile
    await expect(page.locator('div[role="alert"]')).toBeVisible();
    await expect(page.locator('body')).toHaveAttribute('data-state', 'noFile');
    expect(errors, 'no console/page errors').toEqual([]);
  });
});
