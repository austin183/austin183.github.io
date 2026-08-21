/**
 * Shared E2E helpers for Metronomad (Phase 7).
 *
 * Constants + the mount/load sequence used by every spec. Timing-sensitive
 * helpers (in-page timeline logger) live in playback.spec.cjs because only
 * that spec makes timing claims.
 */

const path = require('path');
const { expect } = require('@playwright/test');

const APP_URL = '/Metronomad/index.html';
const FIXTURE = path.join(__dirname, '..', 'fixtures', 'sine3s.mp3');
const BAD_FIXTURE = path.join(__dirname, '..', 'fixtures', 'bad.mp3');

/** Wait until the Vue app has mounted (data-state hook, written by the appState watch). */
async function waitForAppMount(page) {
  await page.goto(APP_URL, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => document.body.dataset.state === 'noFile', null, {
    timeout: 10000
  });
}

/** Upload the 3 s fixture and wait for the ready state (decode completes). */
async function loadFixture(page) {
  await waitForAppMount(page);
  await page.setInputFiles('#fileInput', FIXTURE);
  await expectReady(page);
}

/** Poll body[data-state] until 'ready'. */
async function expectReady(page) {
  await expect(page.locator('body')).toHaveAttribute('data-state', 'ready', { timeout: 10000 });
}

/** Read body[data-state] from the page. */
const appState = (page) => page.evaluate(() => document.body.dataset.state);

module.exports = { APP_URL, FIXTURE, BAD_FIXTURE, waitForAppMount, loadFixture, expectReady, appState };
