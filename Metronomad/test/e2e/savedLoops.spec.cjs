/**
 * CR 2026-08-29-004 Phase 3 — saved loops E2E (SL-E1.1…E1.7), Playwright, chromium.
 *
 * The feature: save the current setup (live file identity + committed
 * bpm/offset/countInBeats/end) to localStorage; next session, dropping the
 * same file auto-restores every setting — nothing typed.
 *
 * Conventions:
 *   - SL-D21: seed from the app's OWN save — save, read the raw JSON,
 *     addInitScript, reload, re-drop. Identity is never fabricated or
 *     hardcoded (R-9-safe; immune to File.lastModified truncation questions)
 *   - R-9: no fixture duration-string assertions — fields, hints,
 *     announcements, and row structure only (dates are NEVER asserted —
 *     environment-dependent)
 *   - live region: div.sr-only[role="status"] (the sole announcement
 *     channel, W-3 — the visible saved-loops hints carry no live role)
 *   - absence-of-tempo assertions wait on the existing
 *     #waveformCanvas[data-loaded=true] hook: the peaks and tempo tasks
 *     share the same post-load yield batch, so by peak-paint the tempo
 *     write — if any — has landed (tempo.spec.cjs precedent)
 *   - no timing claims → no in-page logger
 */

const { test, expect } = require('@playwright/test');
const path = require('path');
const {
  waitForAppMount, loadFixture, expectReady, FIXTURE
} = require('./helpers.cjs');

const CLICKS20 = path.join(__dirname, '..', 'fixtures', 'clicks20.wav');

/** The versioned localStorage key (SL-D1). */
const STORAGE_KEY = 'metronomad.savedLoops.v1';

/** The polite live region (V-07) — the div, not any hint <p>. */
const liveRegion = (page) => page.locator('div.sr-only[role="status"]');

/** The saved-loop rows (plain class, no testability hooks — KB-6). */
const rows = (page) => page.locator('.saved-loop-row');

/** Read the raw stored JSON (null when absent). */
async function readRaw(page) {
  return page.evaluate((key) => localStorage.getItem(key), STORAGE_KEY);
}

/**
 * Wait for the mounted app in the no-file state (works after both the
 * initial goto and a reload).
 */
async function awaitMounted(page) {
  await page.waitForFunction(() => document.body.dataset.state === 'noFile', null, {
    timeout: 10000
  });
}

/**
 * SL-D21: save from the app, then seed the context with the app's OWN raw
 * JSON so a subsequent reload starts from it. Assumes the file is already
 * loaded and ready; setParams (optional) sets committed params (fill +
 * Enter) before the Save click.
 */
async function saveAndSeed(context, page, setParams) {
  if (setParams) await setParams(page);
  await page.locator('#saveSetupBtn').click();
  const raw = await readRaw(page);
  expect(raw, 'the app wrote its own save to localStorage').not.toBeNull();
  await context.addInitScript((seed) => {
    localStorage.setItem(STORAGE_KEY, seed);
  }, raw);
}

test.describe('CR 004 Phase 3 — saved loops (SL-E1.1…E1.7)', () => {
  test('SL-E1.1 save, close (reload), re-drop — everything back (the literal user story)', async ({ context, page }) => {
    await loadFixture(page); // sine3s
    // Committed params (fill + Enter — fill() is a draft setter).
    await page.fill('#bpmInput', '122');
    await page.keyboard.press('Enter');
    await page.fill('#offsetInput', '0:01.2');
    await page.keyboard.press('Enter');
    await page.fill('#countInInput', '3');
    await page.keyboard.press('Enter');

    await page.locator('#saveSetupBtn').click();
    // (1) the transient visible hint + the raw record (SL-D12 — no
    //     live-region announcement for Save).
    await expect(page.locator('.saved-loops .clamp-hint')
      .filter({ hasText: 'Setup saved' })).toBeVisible();
    const raw = await readRaw(page);
    expect(raw).toContain('sine3s.mp3');
    expect(raw).toContain('"bpm":122');

    // (2) seed from the app's own raw (SL-D21); reload; re-drop — NOTHING typed.
    await context.addInitScript((seed) => {
      localStorage.setItem(STORAGE_KEY, seed);
    }, raw);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await awaitMounted(page);
    await page.setInputFiles('#fileInput', FIXTURE);
    await expectReady(page);

    await expect(page.locator('#bpmInput')).toHaveValue('122');
    await expect(page.locator('#offsetInput')).toHaveValue('0:01.2');
    await expect(page.locator('#countInInput')).toHaveValue('3');
    await expect(liveRegion(page)).toHaveText('sine3s.mp3 loaded — settings restored');
    await expect(page.locator('.saved-loops .clamp-hint')
      .filter({ hasText: 'Restored saved settings' })).toBeVisible();
    await expect(rows(page)).toHaveCount(1);
  });

  test('SL-E1.2 tempo detection does NOT clobber a restored BPM (the ordering pin)', async ({ context, page }) => {
    await waitForAppMount(page);
    await page.setInputFiles('#fileInput', CLICKS20);
    await expectReady(page);
    // A user-touched committed BPM that DIFFERS from the detected 120.
    await saveAndSeed(context, page, async (p) => {
      await p.fill('#bpmInput', '122');
      await p.keyboard.press('Enter');
    });

    await page.reload({ waitUntil: 'domcontentloaded' });
    await awaitMounted(page);
    await page.setInputFiles('#fileInput', CLICKS20);
    await expectReady(page);
    // The post-load batch (peaks + tempo) has run — a clobbering write
    // would already be visible.
    await expect(page.locator('#waveformCanvas'))
      .toHaveAttribute('data-loaded', 'true', { timeout: 10000 });

    await expect(page.locator('#bpmInput')).toHaveValue('122');
    // No "Detected ~N BPM" hint anywhere (the 120 detection must not
    // overwrite the restored 122 — _bpmTouchedThisFile was set
    // synchronously by the auto-apply, before the task's write gate).
    expect(await page.locator('.clamp-hint').filter({ hasText: 'Detected' }).count()).toEqual(0);
    await expect(liveRegion(page)).toHaveText('clicks20.wav loaded — settings restored');
  });

  test('SL-E1.3 multi-match: no auto-apply, rows highlighted, Load applies the pick', async ({ context, page }) => {
    await loadFixture(page);
    // Two saved windows for the same file (CR §5.3).
    await page.fill('#offsetInput', '0:00.5');
    await page.keyboard.press('Enter');
    await page.locator('#saveSetupBtn').click();
    await page.fill('#offsetInput', '0:02.0');
    await page.keyboard.press('Enter');
    await page.locator('#saveSetupBtn').click();

    const raw = await readRaw(page);
    expect(JSON.parse(raw).entries).toHaveLength(2);
    await context.addInitScript((seed) => {
      localStorage.setItem(STORAGE_KEY, seed);
    }, raw);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await awaitMounted(page);
    await page.setInputFiles('#fileInput', FIXTURE);
    await expectReady(page);

    // After drop: nothing auto-applied, both rows highlighted, Load enabled.
    await expect(page.locator('#offsetInput')).toHaveValue('0:00.0');
    await expect(liveRegion(page)).toHaveText('sine3s.mp3 loaded — choose a saved setup');
    await expect(rows(page)).toHaveCount(2);
    await expect(page.locator('.saved-loop-row--matched')).toHaveCount(2);
    for (let i = 0; i < 2; i++) {
      await expect(rows(page).nth(i).locator('.saved-loop-load')).toBeEnabled();
    }

    // The click is the pick: Load on the 0:02.0 row.
    await rows(page).filter({ hasText: '0:02.0' }).locator('.saved-loop-load').click();
    await expect(page.locator('#offsetInput')).toHaveValue('0:02.0');
    await expect(page.locator('.saved-loops .clamp-hint')
      .filter({ hasText: 'Restored saved settings' })).toBeVisible();
  });

  test('SL-E1.4 Delete removes the row and the stored record', async ({ page }) => {
    await loadFixture(page);
    await page.locator('#saveSetupBtn').click();
    await expect(rows(page)).toHaveCount(1);

    await rows(page).locator('.saved-loop-delete').click();

    // The section hides with its last entry; the stored record is gone;
    // focus lands on #saveSetupBtn (SL-D11 refocus — the row's button
    // left the DOM).
    await expect(page.locator('.saved-loops')).toHaveCount(0);
    expect(JSON.parse(await readRaw(page)).entries).toHaveLength(0);
    await expect.poll(() => page.evaluate(() => document.activeElement?.id ?? '')).toBe('saveSetupBtn');
  });

  test('SL-E1.5 non-matching file: no highlight, tempo suggestion proceeds as today', async ({ context, page }) => {
    // Seed a sine3s record from the app's own save…
    await loadFixture(page);
    await saveAndSeed(context, page);

    // …then reload and drop a DIFFERENT file (zero match).
    await page.reload({ waitUntil: 'domcontentloaded' });
    await awaitMounted(page);
    await page.setInputFiles('#fileInput', CLICKS20);
    await expectReady(page);
    await expect(page.locator('#waveformCanvas'))
      .toHaveAttribute('data-loaded', 'true', { timeout: 10000 });

    // The row renders but is NOT highlighted; Load is disabled with the
    // rationale title (SL-D6 #6 / XR-4).
    await expect(rows(page)).toHaveCount(1);
    await expect(page.locator('.saved-loop-row--matched')).toHaveCount(0);
    const load = page.locator('.saved-loop-load');
    await expect(load).toBeDisabled();
    await expect(load).toHaveAttribute('title', 'Only available for the matching song');

    // Zero match → _bpmTouchedThisFile stays false → the tempo suggestion
    // proceeds exactly as today (tempo.spec.cjs precedent for clicks20).
    await expect(page.locator('.controls p.clamp-hint')
      .filter({ hasText: 'Detected ~120 BPM' })).toBeVisible();
    await expect(page.locator('#bpmInput')).toHaveValue('120');
  });

  test('SL-E1.6 Save button presence + gating', async ({ page }) => {
    // (a) no-file state: the file row (and the button) is absent — this is
    //     why #saveSetupBtn is out of smoke.spec.cjs's CONTROLS.
    await waitForAppMount(page);
    await expect(page.locator('#saveSetupBtn')).toHaveCount(0);

    // (b) ready: present and enabled.
    await page.setInputFiles('#fileInput', FIXTURE);
    await expectReady(page);
    await expect(page.locator('#saveSetupBtn')).toHaveCount(1);
    await expect(page.locator('#saveSetupBtn')).toBeEnabled();

    // (c) a running sequence: disabled (U-12 — the lock scopes to Save/Load).
    await page.locator('#playStopBtn').press('Enter');
    await expect(page.locator('body')).toHaveAttribute('data-state', 'countingIn');
    await expect(page.locator('#saveSetupBtn')).toBeDisabled();

    // Leave the app clean.
    await page.locator('#playStopBtn').press('Enter');
    await expect(page.locator('body')).toHaveAttribute('data-state', 'ready');
  });

  test('SL-E1.7 dirty draft on re-drop degrades; the click is consent', async ({ context, page }) => {
    // RE-PIN (2026-08-30, Phase 3): the plan's literal steps — a focused
    // #bpmInput draft ('1', no Enter) + re-drop — are unreachable in a
    // browser: decoding flips isReady → :disabled on the field, a focused
    // element that becomes disabled blurs, and the app's own commit-on-
    // blur law (RD-1) commits the draft BEFORE the ok-branch's match
    // decision (it clamps to a clean value → the auto-apply runs —
    // observed: '…settings restored', field '30'). Same platform
    // invariant as tempo.spec.cjs's E2E-4.4 re-pin. The closest drivable
    // form of the pinned intent (W-1: a dirty draft on re-drop degrades
    // to explicit Load; the click is consent) uses the one draft that
    // SURVIVES a re-drop — offsetDraft, live from a pointer scrub that
    // has not been released. The text-draft half of W-1 stays pinned at
    // unit level (SL-U1.4…U1.10).
    await loadFixture(page);
    await saveAndSeed(context, page, async (p) => {
      await p.fill('#bpmInput', '122');
      await p.keyboard.press('Enter');
    });

    await page.reload({ waitUntil: 'domcontentloaded' });
    await awaitMounted(page);
    await page.setInputFiles('#fileInput', FIXTURE);
    await expectReady(page);
    // Single match + clean drafts → the auto-apply landed.
    await expect(page.locator('#bpmInput')).toHaveValue('122');
    // Peaks painted → the canvas scrub is interactive.
    await expect(page.locator('#waveformCanvas'))
      .toHaveAttribute('data-loaded', 'true', { timeout: 10000 });

    // Dirty draft: start a pointer scrub and DO NOT release —
    // offsetDraft is non-null from pointerdown onward.
    const box = await page.locator('#waveformCanvas').boundingBox();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();

    // Re-drop with the scrub in flight.
    await page.setInputFiles('#fileInput', FIXTURE);
    await expectReady(page);
    // Degraded: nothing applied, the user must pick.
    await expect(liveRegion(page)).toHaveText('sine3s.mp3 loaded — choose a saved setup');
    await expect(page.locator('#bpmInput')).toHaveValue('122'); // never clobbered
    await expect(page.locator('#offsetInput')).toHaveValue('0:00.0'); // a draft is not a commit
    await expect(page.locator('.saved-loop-row--matched')).toHaveCount(1);
    await expect(page.locator('.saved-loop-load')).toBeEnabled();

    // Release the scrub: the app commits the draft to a non-zero offset.
    await page.mouse.up();
    const scrubbed = await page.locator('#offsetInput').inputValue();
    expect(scrubbed, 'the in-flight draft committed to a non-zero offset').not.toBe('0:00.0');

    // The Load click is the consent — the saved setup wins.
    await page.locator('.saved-loop-load').click();
    await expect(page.locator('#offsetInput')).toHaveValue('0:00.0');
    await expect(page.locator('#bpmInput')).toHaveValue('122');
    await expect(page.locator('.saved-loops .clamp-hint')
      .filter({ hasText: 'Restored saved settings' })).toBeVisible();
  });
});
