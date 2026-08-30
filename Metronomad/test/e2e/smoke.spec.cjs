/**
 * Phase 1 — App scaffold smoke (Playwright, chromium).
 *
 * Success criteria (plan §Phase 1):
 *   - page loads at /Metronomad/index.html with zero console errors
 *   - data-state=noFile (KB-6 hook mirrors the raw D8 appState value)
 *   - drop zone visible (hero in no-file state)
 *   - all controls present and disabled (no-file state)
 *
 * Repo conventions:
 *   - no `waitForTimeout` — assert on state via the data-state hook
 *   - `domcontentloaded` + explicit wait (CDN scripts load after DOM parse)
 */

const { test, expect } = require('@playwright/test');

const APP_URL = '/Metronomad/index.html';

/**
 * Every interactive control in the scaffold. All must be present and
 * disabled while the app sits in the no-file state.
 */
const CONTROLS = [
  '#playStopBtn',
  '#restartBtn',
  '#previewBtn',
  '#bpmMinusBtn',
  '#bpmInput',
  '#bpmPlusBtn',
  // O-1 (CR 001 Phase 5): the old offset range scrubber is deleted —
  // the waveform canvas is the offset slider (presence-only list below).
  '#offsetInput',
  // CR 003 (EN-D17): the End field — empty = play to the song end (null).
  '#endInput',
  '#countInInput'
];

/**
 * R-1: a canvas can never be `:disabled` — the lock contract is
 * aria-disabled + pointer-events (Phase 5). The canvas is in the DOM in the
 * no-file state via v-show (display:none), so assert PRESENCE ONLY — no
 * disabled or visibility claim.
 */
const PRESENCE_ONLY = ['#waveformCanvas'];

/** Wait until the Vue app has mounted (data-state hook is written by the appState watch). */
async function waitForAppMount(page) {
  await page.goto(APP_URL, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => document.body.dataset.state === 'noFile', null, {
    timeout: 10000
  });
}

test.describe('Phase 1 — Metronomad scaffold smoke', () => {
  test('loads with zero console errors', async ({ page }) => {
    const errors = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    page.on('pageerror', (err) => errors.push(String(err)));

    await waitForAppMount(page);

    expect(errors).toEqual([]);
  });

  test('body exposes data-state=noFile', async ({ page }) => {
    await waitForAppMount(page);

    await expect(page.locator('body')).toHaveAttribute('data-state', 'noFile');
  });

  test('drop zone hero is visible with the live regions present', async ({ page }) => {
    await waitForAppMount(page);

    await expect(page.locator('#dropZone')).toBeVisible();
    await expect(page.locator('#browseBtn')).toBeVisible();
    // Live regions: polite status always present, alert only when an error exists.
    await expect(page.locator('div[role="status"][aria-live="polite"]')).toHaveCount(1);
    await expect(page.locator('div[role="alert"]')).toHaveCount(0);
  });

  test('all controls are present and disabled in the no-file state', async ({ page }) => {
    await waitForAppMount(page);

    for (const selector of CONTROLS) {
      await expect(page.locator(selector)).toHaveCount(1);
      await expect(page.locator(selector)).toBeDisabled();
    }

    for (const selector of PRESENCE_ONLY) {
      await expect(page.locator(selector)).toHaveCount(1);
    }
  });
});
