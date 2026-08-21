/**
 * Phase 8 — Reduced-motion E2E (acceptance item 11 / U-22 / B-03), Playwright, chromium.
 *
 * Automates the manual reduced-motion check with `reducedMotion: 'reduce'`
 * context emulation: the active dot must carry `beat-dot--static`
 * (no `beat-dot--pulse`) while the sequence runs, and the treatment must
 * follow the dot as beats advance (motion reduced, not frozen).
 *
 * NOTE: the context is created manually because `test.use({ reducedMotion })`
 * is silently dropped by this Playwright/Chromium combination (verified with
 * a minimal repro) while `browser.newContext({ reducedMotion: 'reduce' })`
 * emulates correctly. baseURL is repeated from playwright.config.cjs.
 *
 * Conventions: state via body[data-state] and #beatDots[data-beat] (KB-6),
 * expect/expect.poll, no audio assertions.
 */

const { test, expect } = require('@playwright/test');
const { loadFixture } = require('./helpers.cjs');

test.describe('Phase 8 — reduced motion (U-22, B-03)', () => {
  test('active dot is a static highlight, never pulsing', async ({ browser }) => {
    const context = await browser.newContext({
      reducedMotion: 'reduce',
      baseURL: 'http://localhost:8000',
    });
    const page = await context.newPage();

    try {
      // Sanity: the emulation actually matched (guard against a silent
      // no-op — the test would otherwise pass vacuously).
      await expect.poll(() =>
        page.evaluate(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches)
      ).toBe(true);

      await loadFixture(page);
      await page.fill('#countInInput', '2'); // first click (accent) at +0.5 s → dot 0

      await page.locator('#playStopBtn').press('Enter');
      await expect(page.locator('#beatDots')).toHaveAttribute('data-beat', '0', { timeout: 5000 });

      const dot0 = page.locator('#beatDot-0');
      await expect(dot0).toHaveClass(/beat-dot--active/);
      await expect(dot0).toHaveClass(/beat-dot--static/);
      await expect(dot0).not.toHaveClass(/beat-dot--pulse/);

      // The dot advances (the loop still tracks beats) and the static
      // treatment follows the active dot.
      await expect(page.locator('#beatDots')).toHaveAttribute('data-beat', '1', { timeout: 5000 });
      const dot1 = page.locator('#beatDot-1');
      await expect(dot1).toHaveClass(/beat-dot--static/);
      await expect(dot1).not.toHaveClass(/beat-dot--pulse/);
      await expect(dot0).not.toHaveClass(/beat-dot--active/);

      await page.locator('#playStopBtn').press('Enter');
      await expect(page.locator('body')).toHaveAttribute('data-state', 'ready');
    } finally {
      await context.close();
    }
  });
});
