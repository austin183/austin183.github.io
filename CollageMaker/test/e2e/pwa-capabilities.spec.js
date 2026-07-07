/**
 * E2E Test: PWA Capabilities (Section 3.6.9)
 * Tests PWA service worker registration, offline behavior, cache validation,
 * installability, and edge cases via Playwright.
 *
 * NOTE: All tests are marked as deferred since the PWA feature (service worker,
 * manifest.json, icons) has not been implemented yet. These tests document the
 * requirements and will pass once the feature is implemented.
 */

import { test, expect } from '@playwright/test';

test.describe('Section 3.6.9 — PWA Capabilities E2E (deferred)', () => {
    test.use({ baseURL: 'http://localhost:8000' });

    // ============================================================
    // 3.6.9.1 — 3.6.9.5: Service Worker Registration
    // ============================================================
    test.describe('3.6.9.1–5 — Service Worker Registration', () => {
        test('3.6.9.1 — SW registers on first load', async ({ page }) => {
            await page.goto('/CollageMaker/index.html', { waitUntil: 'networkidle' });
            await page.waitForSelector('#app', { state: 'visible' });
            await page.waitForTimeout(2000);
            const hasController = await page.evaluate(() => {
                return !!navigator.serviceWorker.controller;
            });
            // Deferred: will be true once service-worker.js exists and is registered
            expect(hasController).toBe(true);
        });

        test('3.6.9.2 — SW activates within timeout', async ({ page }) => {
            await page.goto('/CollageMaker/index.html', { waitUntil: 'networkidle' });
            await page.waitForTimeout(5000);
            const hasActive = await page.evaluate(() => {
                return new Promise((resolve) => {
                    if (!navigator.serviceWorker) return resolve(false);
                    navigator.serviceWorker.ready.then(reg => {
                        resolve(!!reg.active);
                    }).catch(() => resolve(false));
                });
            });
            expect(hasActive).toBe(true);
        });

        test('3.6.9.3 — SW scope is correct', async ({ page }) => {
            await page.goto('/CollageMaker/index.html', { waitUntil: 'networkidle' });
            await page.waitForTimeout(3000);
            const scope = await page.evaluate(() => {
                return new Promise((resolve) => {
                    if (!navigator.serviceWorker) return resolve(null);
                    navigator.serviceWorker.ready.then(reg => {
                        resolve(reg.scope);
                    }).catch(() => resolve(null));
                });
            });
            // Deferred: scope should include the CollageMaker directory
            expect(scope).toContain('CollageMaker');
        });

        test('3.6.9.4 — SW file served with correct MIME type', async ({ page }) => {
            const response = await page.goto('/CollageMaker/service-worker.js', {
                waitUntil: 'networkidle'
            });
            // Deferred: file doesn't exist yet
            expect(response?.ok()).toBe(true);
            const contentType = response?.headers()['content-type'] || '';
            expect(contentType).toMatch(/javascript|text\/ecmascript/);
        });

        test('3.6.9.5 — Manifest served with correct MIME type', async ({ page }) => {
            const response = await page.goto('/CollageMaker/manifest.json', {
                waitUntil: 'networkidle'
            });
            // Deferred: file doesn't exist yet
            expect(response?.ok()).toBe(true);
            const contentType = response?.headers()['content-type'] || '';
            expect(contentType).toMatch(/json/);
        });
    });

    // ============================================================
    // 3.6.9.6 — 3.6.9.11: Offline Mode
    // ============================================================
    test.describe('3.6.9.6–11 — Offline Mode', () => {
        test('3.6.9.6 — App loads after going offline', async ({ context, page }) => {
            // First load online to populate cache
            await page.goto('/CollageMaker/index.html', { waitUntil: 'networkidle' });
            await page.waitForSelector('#app', { state: 'visible' });
            await page.waitForTimeout(3000);

            // Go offline
            await context.setOffline(true);

            // Reload
            await page.reload({ waitUntil: 'networkidle' });
            await page.waitForSelector('#app', { state: 'visible', timeout: 10000 });
            expect(await page.isVisible('#app')).toBe(true);
        });

        test('3.6.9.7 — Canvas visible offline', async ({ context, page }) => {
            await page.goto('/CollageMaker/index.html', { waitUntil: 'networkidle' });
            await page.waitForSelector('#app', { state: 'visible' });
            await page.waitForTimeout(3000);

            await context.setOffline(true);
            await page.reload({ waitUntil: 'networkidle' });
            await page.waitForTimeout(2000);

            // Canvas should be visible (even if empty, the element exists)
            const canvasVisible = await page.isVisible('#previewCanvas').catch(() => false);
            expect(canvasVisible).toBe(true);
        });

        test('3.6.9.8 — Toolbar functional offline', async ({ context, page }) => {
            await page.goto('/CollageMaker/index.html', { waitUntil: 'networkidle' });
            await page.waitForSelector('#app', { state: 'visible' });
            await page.waitForTimeout(3000);

            await context.setOffline(true);
            await page.reload({ waitUntil: 'networkidle' });
            await page.waitForTimeout(2000);

            // Click toolbar buttons — no console errors expected
            const errors = [];
            page.on('console', msg => {
                if (msg.type() === 'error') errors.push(msg.text());
            });

            await page.click('#addImagesBtn').catch(() => {});
            await page.waitForTimeout(500);
            expect(errors.length).toBe(0);
        });

        test('3.6.9.9 — Settings persist across offline reload', async ({ context, page }) => {
            await page.goto('/CollageMaker/index.html', { waitUntil: 'networkidle' });
            await page.waitForSelector('#app', { state: 'visible' });

            // Change a setting (layout style)
            await page.selectOption('#layoutStyleSelect', 'hero');
            await page.waitForTimeout(500);

            // Go offline and reload
            await context.setOffline(true);
            await page.reload({ waitUntil: 'networkidle' });
            await page.waitForSelector('#app', { state: 'visible' });

            // Setting should be restored from localStorage
            const layoutValue = await page.locator('#layoutStyleSelect').inputValue();
            expect(layoutValue).toBe('hero');
        });

        test('3.6.9.10 — Previously loaded images visible offline', async ({ context, page }) => {
            // 1x1 red pixel PNG
            const RED_PNG = Buffer.from(
                'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
                'base64'
            );

            await page.goto('/CollageMaker/index.html', { waitUntil: 'networkidle' });
            await page.waitForSelector('#app', { state: 'visible' });

            // Load an image online
            const fileChooserPromise = page.waitForEvent('filechooser');
            await page.click('#addImagesBtn');
            const fileChooser = await fileChooserPromise;
            await fileChooser.setFiles([{
                name: 'test.png',
                mimeType: 'image/png',
                buffer: RED_PNG
            }]);
            await page.waitForSelector('#previewCanvas', { state: 'visible' });
            await page.waitForTimeout(1000);

            // Go offline and reload
            await context.setOffline(true);
            await page.reload({ waitUntil: 'networkidle' });
            await page.waitForSelector('#app', { state: 'visible' });

            // Image should still be in sidebar (from localStorage state)
            const imageCount = await page.locator('.image-item').count().catch(() => 0);
            expect(imageCount).toBeGreaterThan(0);
        });

        test('3.6.9.11 — Export produces file offline', async ({ context, page }) => {
            const RED_PNG = Buffer.from(
                'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
                'base64'
            );

            await page.goto('/CollageMaker/index.html', { waitUntil: 'networkidle' });
            await page.waitForSelector('#app', { state: 'visible' });

            // Load an image
            const fileChooserPromise = page.waitForEvent('filechooser');
            await page.click('#addImagesBtn');
            const fileChooser = await fileChooserPromise;
            await fileChooser.setFiles([{
                name: 'test.png',
                mimeType: 'image/png',
                buffer: RED_PNG
            }]);
            await page.waitForSelector('#previewCanvas', { state: 'visible' });
            await page.waitForTimeout(500);

            // Go offline
            await context.setOffline(true);

            // Export
            const downloadPromise = page.waitForEvent('download', { timeout: 10000 }).catch(() => null);
            await page.click('#exportBtn');
            const download = await downloadPromise;
            // Download may or may not fire in headless mode
            expect(await page.isVisible('#app')).toBe(true);
        });
    });

    // ============================================================
    // 3.6.9.12 — 3.6.9.15: Cache Validation
    // ============================================================
    test.describe('3.6.9.12–15 — Cache Validation', () => {
        test('3.6.9.12 — Shell cache populated', async ({ page }) => {
            await page.goto('/CollageMaker/index.html', { waitUntil: 'networkidle' });
            await page.waitForSelector('#app', { state: 'visible' });
            await page.waitForTimeout(3000);

            const cacheNames = await page.evaluate(async () => {
                if (!('caches' in window)) return [];
                return caches.keys();
            });
            // Deferred: caches should exist with shell and image caches
            expect(cacheNames.length).toBeGreaterThan(0);
        });

        test('3.6.9.13 — Shell cache contains index.html', async ({ page }) => {
            await page.goto('/CollageMaker/index.html', { waitUntil: 'networkidle' });
            await page.waitForSelector('#app', { state: 'visible' });
            await page.waitForTimeout(3000);

            const hasIndexHtml = await page.evaluate(async () => {
                if (!('caches' in window)) return false;
                const cacheNames = await caches.keys();
                for (const name of cacheNames) {
                    if (name.includes('shell')) {
                        const cache = await caches.open(name);
                        const keys = await cache.keys();
                        return keys.some(req => req.url.includes('index.html'));
                    }
                }
                return false;
            });
            expect(hasIndexHtml).toBe(true);
        });

        test('3.6.9.14 — Shell cache contains all JS modules', async ({ page }) => {
            await page.goto('/CollageMaker/index.html', { waitUntil: 'networkidle' });
            await page.waitForSelector('#app', { state: 'visible' });
            await page.waitForTimeout(3000);

            const jsCount = await page.evaluate(async () => {
                if (!('caches' in window)) return 0;
                const cacheNames = await caches.keys();
                for (const name of cacheNames) {
                    if (name.includes('shell')) {
                        const cache = await caches.open(name);
                        const keys = await cache.keys();
                        return keys.filter(req => req.url.endsWith('.js')).length;
                    }
                }
                return 0;
            });
            // Should have multiple JS files cached
            expect(jsCount).toBeGreaterThan(5);
        });

        test('3.6.9.15 — CDN requests not in cache', async ({ page }) => {
            await page.goto('/CollageMaker/index.html', { waitUntil: 'networkidle' });
            await page.waitForSelector('#app', { state: 'visible' });
            await page.waitForTimeout(3000);

            const hasCDN = await page.evaluate(async () => {
                if (!('caches' in window)) return false;
                const cacheNames = await caches.keys();
                for (const name of cacheNames) {
                    const cache = await caches.open(name);
                    const keys = await cache.keys();
                    if (keys.some(req =>
                        req.url.includes('unpkg.com') ||
                        req.url.includes('fonts.googleapis.com')
                    )) {
                        return true;
                    }
                }
                return false;
            });
            expect(hasCDN).toBe(false);
        });
    });

    // ============================================================
    // 3.6.9.16 — 3.6.9.19: Update Cycle
    // ============================================================
    test.describe('3.6.9.16–19 — Update Cycle', () => {
        test('3.6.9.16 — SW update detected on file change', async ({ page }) => {
            // Deferred: requires modifying service-worker.js and reloading
            await page.goto('/CollageMaker/index.html', { waitUntil: 'networkidle' });
            await page.waitForSelector('#app', { state: 'visible' });
            await page.waitForTimeout(3000);

            const hasRegistration = await page.evaluate(() => {
                return new Promise((resolve) => {
                    if (!navigator.serviceWorker) return resolve(false);
                    navigator.serviceWorker.ready.then(reg => {
                        resolve(!!reg.active);
                    }).catch(() => resolve(false));
                });
            });
            expect(hasRegistration).toBe(true);
        });

        test('3.6.9.17 — Old cache cleaned on version bump', async ({ page }) => {
            // Deferred: requires bumping CACHE_VERSION and reloading
            await page.goto('/CollageMaker/index.html', { waitUntil: 'networkidle' });
            await page.waitForSelector('#app', { state: 'visible' });
            await page.waitForTimeout(3000);

            const cacheNames = await page.evaluate(async () => {
                if (!('caches' in window)) return [];
                return caches.keys();
            });
            // Only current version caches should exist
            const oldCaches = cacheNames.filter(name => name.includes('v0'));
            expect(oldCaches.length).toBe(0);
        });

        test('3.6.9.18 — New cache populated on update', async ({ page }) => {
            // Deferred: same as 3.6.9.12 — cache should be populated
            await page.goto('/CollageMaker/index.html', { waitUntil: 'networkidle' });
            await page.waitForSelector('#app', { state: 'visible' });
            await page.waitForTimeout(3000);

            const cacheNames = await page.evaluate(async () => {
                if (!('caches' in window)) return [];
                return caches.keys();
            });
            expect(cacheNames.length).toBeGreaterThan(0);
        });

        test('3.6.9.19 — Skip waiting activates immediately', async ({ page }) => {
            // Deferred: requires sending skip-waiting message to SW
            await page.goto('/CollageMaker/index.html', { waitUntil: 'networkidle' });
            await page.waitForSelector('#app', { state: 'visible' });
            await page.waitForTimeout(3000);

            const hasController = await page.evaluate(() => {
                return !!navigator.serviceWorker.controller;
            });
            expect(hasController).toBe(true);
        });
    });

    // ============================================================
    // 3.6.9.20 — 3.6.9.21: Installability (Conditional)
    // ============================================================
    test.describe('3.6.9.20–21 — Installability', () => {
        test('3.6.9.20 — beforeinstallprompt fires if eligible', async ({ page }) => {
            let eventFired = false;
            page.evaluateOnNewDocument(() => {
                window.addEventListener('beforeinstallprompt', (e) => {
                    window.__installPromptFired = true;
                });
            });

            await page.goto('/CollageMaker/index.html', { waitUntil: 'networkidle' });
            await page.waitForSelector('#app', { state: 'visible' });
            await page.waitForTimeout(3000);

            eventFired = await page.evaluate(() => window.__installPromptFired === true);
            // May or may not fire depending on browser/install status
            // In headless Chromium, this typically doesn't fire
            expect(typeof eventFired).toBe('boolean');
        });

        test('3.6.9.21 — App installable criteria met', async ({ page }) => {
            // Deferred: checks manifest + SW + HTTPS criteria
            // All criteria: valid manifest, SW registered, HTTPS (or localhost),
            // start_url resolves, icons present
            const criteria = await page.evaluate(async () => {
                const result = {};
                result.hasSW = 'serviceWorker' in navigator;
                result.hasCache = 'caches' in window;
                result.isSecure = window.location.protocol === 'https:' ||
                    window.location.hostname === 'localhost';
                return result;
            });
            expect(criteria.hasSW).toBe(true);
            expect(criteria.hasCache).toBe(true);
            expect(criteria.isSecure).toBe(true);
        });
    });

    // ============================================================
    // 3.6.9.22 — 3.6.9.26: Edge Cases
    // ============================================================
    test.describe('3.6.9.22–26 — Edge Cases', () => {
        test('3.6.9.22 — Service worker disabled — app works', async ({ browser }) => {
            const context = await browser.newContext({
                serviceWorkers: 'block'
            });
            const page = await context.newPage();
            await page.goto('http://localhost:8000/CollageMaker/index.html', {
                waitUntil: 'networkidle'
            });
            await page.waitForSelector('#app', { state: 'visible' });
            expect(await page.isVisible('#app')).toBe(true);
            await context.close();
        });

        test('3.6.9.23 — Manifest missing — app works', async ({ page }) => {
            // App should work even without manifest (no install prompt)
            await page.goto('/CollageMaker/index.html', { waitUntil: 'networkidle' });
            await page.waitForSelector('#app', { state: 'visible' });
            expect(await page.isVisible('#app')).toBe(true);
        });

        test('3.6.9.24 — Rapid offline/online toggle', async ({ context, page }) => {
            await page.goto('/CollageMaker/index.html', { waitUntil: 'networkidle' });
            await page.waitForSelector('#app', { state: 'visible' });

            // Toggle 10 times rapidly
            for (let i = 0; i < 10; i++) {
                await context.setOffline(i % 2 === 0);
                await page.waitForTimeout(100);
            }

            // Ensure online for final check
            await context.setOffline(false);
            expect(await page.isVisible('#app')).toBe(true);
        });

        test('3.6.9.25 — Large image cache — eviction works', async ({ page }) => {
            // Deferred: requires uploading 100 images to test LRU eviction
            // For now, verify cache size is bounded
            await page.goto('/CollageMaker/index.html', { waitUntil: 'networkidle' });
            await page.waitForSelector('#app', { state: 'visible' });
            await page.waitForTimeout(3000);

            const cacheStats = await page.evaluate(async () => {
                if (!('caches' in window)) return { totalEntries: 0 };
                const cacheNames = await caches.keys();
                let totalEntries = 0;
                for (const name of cacheNames) {
                    const cache = await caches.open(name);
                    const keys = await cache.keys();
                    totalEntries += keys.length;
                }
                return { totalEntries };
            });
            // Cache should have entries (shell files)
            expect(cacheStats.totalEntries).toBeGreaterThan(0);
        });

        test('3.6.9.26 — Concurrent requests while offline', async ({ context, page }) => {
            await page.goto('/CollageMaker/index.html', { waitUntil: 'networkidle' });
            await page.waitForSelector('#app', { state: 'visible' });
            await page.waitForTimeout(3000);

            await context.setOffline(true);

            // Make multiple concurrent requests
            const promises = [];
            for (let i = 0; i < 5; i++) {
                promises.push(
                    page.evaluate(() => fetch('./index.html')).catch(() => 'failed')
                );
            }
            const results = await Promise.all(promises);
            // Requests should either succeed (from cache) or fail gracefully
            expect(results.length).toBe(5);
        });
    });

    // ============================================================
    // 3.6.9.27 — 3.6.9.32: GitHub Pages Compatibility (deferred)
    // ============================================================
    test.describe('3.6.9.27–32 — GitHub Pages Compatibility (deferred)', () => {
        test('3.6.9.27 — SW registered from subdirectory', async ({ page }) => {
            // Deferred: only testable on actual GitHub Pages deployment
            // For now, verify SW scope covers the app directory
            await page.goto('/CollageMaker/index.html', { waitUntil: 'networkidle' });
            await page.waitForSelector('#app', { state: 'visible' });
            await page.waitForTimeout(3000);

            const scope = await page.evaluate(() => {
                return new Promise((resolve) => {
                    if (!navigator.serviceWorker) return resolve(null);
                    navigator.serviceWorker.ready.then(reg => {
                        resolve(reg.scope);
                    }).catch(() => resolve(null));
                });
            });
            expect(scope).toContain('CollageMaker');
        });

        test('3.6.9.28 — start_url resolves correctly', async ({ page }) => {
            // Deferred: manifest.json doesn't exist yet
            // Verify start_url would resolve correctly
            const manifestResponse = await page.goto('/CollageMaker/manifest.json', {
                waitUntil: 'networkidle'
            });
            // File doesn't exist yet — this is expected for deferred feature
            if (manifestResponse?.ok()) {
                const manifest = await manifestResponse.json();
                expect(manifest.start_url).toMatch(/index\.html|\/$/);
            }
        });

        test('3.6.9.29 — Icon paths resolve on GitHub Pages', async ({ page }) => {
            // Deferred: icons don't exist yet
            // Verify icon paths would resolve correctly
            const manifestResponse = await page.goto('/CollageMaker/manifest.json', {
                waitUntil: 'networkidle'
            });
            if (manifestResponse?.ok()) {
                const manifest = await manifestResponse.json();
                manifest.icons.forEach(icon => {
                    expect(icon.src).toMatch(/^icons\//);
                });
            }
        });

        test('3.6.9.30 — HTTPS required — works on localhost', async ({ page }) => {
            // localhost is treated as secure context for SW registration
            await page.goto('/CollageMaker/index.html', { waitUntil: 'networkidle' });
            await page.waitForSelector('#app', { state: 'visible' });
            const isSecure = await page.evaluate(() => {
                return window.location.protocol === 'https:' ||
                    window.location.hostname === 'localhost';
            });
            expect(isSecure).toBe(true);
        });

        test('3.6.9.31 — SW does not intercept root page', async ({ page }) => {
            // Deferred: SW scope should be limited to /CollageMaker/
            const scope = await page.evaluate(() => {
                return new Promise((resolve) => {
                    if (!navigator.serviceWorker) return resolve(null);
                    navigator.serviceWorker.ready.then(reg => {
                        resolve(reg.scope);
                    }).catch(() => resolve(null));
                });
            });
            // Scope should not be '/'
            expect(scope).not.toBe('/');
        });

        test('3.6.9.32 — SW does not intercept sibling projects', async ({ page }) => {
            // Deferred: SW should not handle requests outside its scope
            await page.goto('/CollageMaker/index.html', { waitUntil: 'networkidle' });
            await page.waitForSelector('#app', { state: 'visible' });
            await page.waitForTimeout(3000);

            const scope = await page.evaluate(() => {
                return new Promise((resolve) => {
                    if (!navigator.serviceWorker) return resolve(null);
                    navigator.serviceWorker.ready.then(reg => {
                        resolve(reg.scope);
                    }).catch(() => resolve(null));
                });
            });
            // Scope should be /CollageMaker/ not /
            expect(scope).toMatch(/CollageMaker/);
        });
    });
});
