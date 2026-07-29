/**
 * E2E Test: Floating Sidebar Toggle Icons (Phase 1)
 * Tests floating edge-positioned toggle buttons for desktop sidebars.
 *
 * Covers: 1.4.e.1 through 1.4.e.8
 * Plan: _agent_docs/plans/2026-07-28-expander-icon-and-positions-implementation.md
 */

import { test, expect } from '@playwright/test';

test.describe('Floating Sidebar Toggles — Phase 1', () => {
    test.use({ baseURL: 'http://localhost:8000' });

    async function loadDesktop(page) {
        await page.setViewportSize({ width: 1400, height: 900 });
        await page.goto('/CollageMaker/index.html', { waitUntil: 'networkidle' });
        await page.waitForSelector('#app', { state: 'visible' });
    }

    async function loadMobile(page) {
        await page.setViewportSize({ width: 375, height: 667 });
        await page.goto('/CollageMaker/index.html', { waitUntil: 'networkidle' });
        await page.waitForSelector('#app', { state: 'visible' });
    }

    // ---- 1.4.e.1: Left toggle visible and clickable at desktop ----

    test('1.4.e.1 — Left toggle visible and has sidebar-float-btn class at desktop', async ({ page }) => {
        await loadDesktop(page);

        const leftToggle = page.locator('#leftSidebarToggleBtn');
        expect(await leftToggle.isVisible()).toBe(true);

        const classes = await leftToggle.getAttribute('class');
        expect(classes).toContain('sidebar-float-btn');
    });

    // ---- 1.4.e.2: Left toggle slides with sidebar ----

    test('1.4.e.2 — Left toggle position changes when sidebar collapses/expands', async ({ page }) => {
        await loadDesktop(page);

        const leftToggle = page.locator('#leftSidebarToggleBtn');

        // Initially sidebar is open — toggle should be at left: 260px
        let leftStyle = await leftToggle.evaluate(el => el.style.left || window.getComputedStyle(el).left);
        // The button starts with left: 260px (no sidebar-collapsed class)
        expect(leftStyle).toContain('260');

        // Click to collapse left sidebar
        await leftToggle.click();
        await page.waitForTimeout(300); // Allow CSS transition to settle

        // Now sidebar is collapsed — toggle should be at left: 8px (offset from edge)
        leftStyle = await leftToggle.evaluate(el => window.getComputedStyle(el).left);
        expect(leftStyle).toContain('8px');

        // Click again to re-open
        await leftToggle.click();
        await page.waitForTimeout(300);

        // Back to left: 260px
        leftStyle = await leftToggle.evaluate(el => window.getComputedStyle(el).left);
        expect(leftStyle).toContain('260');
    });

    // ---- 1.4.e.3: Right toggle slides with sidebar ----

    test('1.4.e.3 — Right toggle position changes when sidebar collapses/expands', async ({ page }) => {
        await loadDesktop(page);

        const rightToggle = page.locator('#sidebarToggleBtn');

        // Initially sidebar is open — toggle should be at right: 260px
        let rightStyle = await rightToggle.evaluate(el => window.getComputedStyle(el).right);
        expect(rightStyle).toContain('260');

        // Click to collapse right sidebar
        await rightToggle.click();
        await page.waitForTimeout(300);

        // Now sidebar is collapsed — toggle should be at right: 8px (offset from edge)
        rightStyle = await rightToggle.evaluate(el => window.getComputedStyle(el).right);
        expect(rightStyle).toContain('8px');

        // Click again to re-open — use force: true because the button at right: 0
        // may be at the viewport edge where Playwright hit-testing can be unreliable
        await rightToggle.click({ force: true });
        await page.waitForTimeout(300);

        // Back to right: 260px
        rightStyle = await rightToggle.evaluate(el => window.getComputedStyle(el).right);
        expect(rightStyle).toContain('260');
    });

    // ---- 1.4.e.4: Left toggle hidden on mobile ----

    test('1.4.e.4 — Left toggle hidden on mobile viewport', async ({ page }) => {
        await loadMobile(page);

        const leftToggle = page.locator('#leftSidebarToggleBtn');
        expect(await leftToggle.isVisible()).toBe(false);
    });

    // ---- 1.4.e.5: Right toggle hidden on mobile ----

    test('1.4.e.5 — Right toggle hidden on mobile viewport', async ({ page }) => {
        await loadMobile(page);

        const rightToggle = page.locator('#sidebarToggleBtn');
        expect(await rightToggle.isVisible()).toBe(false);
    });

    // ---- 1.4.e.6: Icon logic correct for left sidebar ----

    test('1.4.e.6 — Left toggle icon: chevron_left when open, chevron_right when closed', async ({ page }) => {
        await loadDesktop(page);

        const leftToggle = page.locator('#leftSidebarToggleBtn');
        const icon = leftToggle.locator('.material-icons');

        // Left sidebar starts open — icon should be chevron_left
        let iconText = await icon.textContent();
        expect(iconText.trim()).toBe('chevron_left');

        // Click to close left sidebar
        await leftToggle.click();
        await page.waitForTimeout(100);

        // Left sidebar now closed — icon should be chevron_right
        iconText = await icon.textContent();
        expect(iconText.trim()).toBe('chevron_right');

        // Click to re-open
        await leftToggle.click();
        await page.waitForTimeout(100);

        // Back to chevron_left
        iconText = await icon.textContent();
        expect(iconText.trim()).toBe('chevron_left');
    });

    // ---- 1.4.e.7: Icon logic correct for right sidebar ----

    test('1.4.e.7 — Right toggle icon: chevron_right when open, chevron_left when closed', async ({ page }) => {
        await loadDesktop(page);

        const rightToggle = page.locator('#sidebarToggleBtn');
        const icon = rightToggle.locator('.material-icons');

        // Right sidebar starts open — icon should be chevron_right
        let iconText = await icon.textContent();
        expect(iconText.trim()).toBe('chevron_right');

        // Click to close right sidebar
        await rightToggle.click();
        await page.waitForTimeout(100);

        // Right sidebar now closed — icon should be chevron_left
        iconText = await icon.textContent();
        expect(iconText.trim()).toBe('chevron_left');

        // Click to re-open — use force: true for same reason as above
        await rightToggle.click({ force: true });
        await page.waitForTimeout(100);

        // Back to chevron_right
        iconText = await icon.textContent();
        expect(iconText.trim()).toBe('chevron_right');
    });

    // ---- 1.4.e.8: Toggle doesn't intercept canvas events ----

    test('1.4.e.8 — Clicking canvas does not toggle sidebar state', async ({ page }) => {
        await loadDesktop(page);

        // Verify left sidebar is open
        const leftToggle = page.locator('#leftSidebarToggleBtn');
        let expanded = await leftToggle.getAttribute('aria-expanded');
        expect(expanded).toBe('true');

        // Click on the canvas area (center of viewport, away from toggles)
        const canvasArea = page.locator('.canvas-area');
        await canvasArea.click({ position: { x: 100, y: 100 } });
        await page.waitForTimeout(100);

        // Sidebar state should be unchanged
        expanded = await leftToggle.getAttribute('aria-expanded');
        expect(expanded).toBe('true');
    });

    // ---- Additional: aria attributes ----

    test('FST-E2E-01 — Left toggle has correct aria attributes', async ({ page }) => {
        await loadDesktop(page);

        const leftToggle = page.locator('#leftSidebarToggleBtn');

        // aria-controls
        expect(await leftToggle.getAttribute('aria-controls')).toBe('sidebar-left');

        // aria-expanded when open
        expect(await leftToggle.getAttribute('aria-expanded')).toBe('true');

        // aria-label when open
        expect(await leftToggle.getAttribute('aria-label')).toBe('Collapse image panel');

        // Click to close
        await leftToggle.click();
        await page.waitForTimeout(100);

        // aria-expanded when closed
        expect(await leftToggle.getAttribute('aria-expanded')).toBe('false');

        // aria-label when closed
        expect(await leftToggle.getAttribute('aria-label')).toBe('Expand image panel');
    });

    test('FST-E2E-02 — Right toggle has correct aria attributes', async ({ page }) => {
        await loadDesktop(page);

        const rightToggle = page.locator('#sidebarToggleBtn');

        // aria-controls
        expect(await rightToggle.getAttribute('aria-controls')).toBe('sidebar-right');

        // aria-expanded when open
        expect(await rightToggle.getAttribute('aria-expanded')).toBe('true');

        // aria-label when open
        expect(await rightToggle.getAttribute('aria-label')).toBe('Collapse editor panel');

        // Click to close
        await rightToggle.click();
        await page.waitForTimeout(100);

        // aria-expanded when closed
        expect(await rightToggle.getAttribute('aria-expanded')).toBe('false');

        // aria-label when closed
        expect(await rightToggle.getAttribute('aria-label')).toBe('Expand editor panel');
    });

    // ---- Additional: z-index verification ----

    test('FST-E2E-03 — Floating toggles have z-index 200', async ({ page }) => {
        await loadDesktop(page);

        const leftToggle = page.locator('#leftSidebarToggleBtn');
        const zIndex = await leftToggle.evaluate(el => window.getComputedStyle(el).zIndex);
        expect(zIndex).toBe('200');
    });

    // ---- Additional: Both toggles work independently ----

    test('FST-E2E-04 — Collapsing left sidebar does not affect right sidebar', async ({ page }) => {
        await loadDesktop(page);

        const rightToggle = page.locator('#sidebarToggleBtn');

        // Both start open
        expect(await rightToggle.getAttribute('aria-expanded')).toBe('true');

        // Collapse left sidebar
        await page.locator('#leftSidebarToggleBtn').click();
        await page.waitForTimeout(300);

        // Right sidebar should still be open
        expect(await rightToggle.getAttribute('aria-expanded')).toBe('true');

        // Right toggle position should be unchanged
        const rightStyle = await rightToggle.evaluate(el => window.getComputedStyle(el).right);
        expect(rightStyle).toContain('260');
    });
});
