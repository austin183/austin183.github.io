#!/usr/bin/env node
/**
 * Run Mocha tests from HTML files using Playwright
 * Outputs test results in JSON format for CI/automation
 *
 * Adapted from CollageMaker/scripts/run-tests.js (BASE_DIR → Metronomad).
 *
 * I-9 (review-fix plan): the runner can no longer report green with zero
 * tests executed. A missing Mocha runner (CDN blocked, page error) or a
 * suite that registers 0 tests is a per-file FAILURE with a non-zero exit.
 *
 * Server: the user-started server on :8000 is REQUIRED (repo rule — the
 * runner never spawns its own). Paths are derived from __dirname, so the
 * script works from any cwd.
 *
 * Usage:
 *   node scripts/run-tests.cjs                    # Runs all Test.html files in MyComponents
 *   node scripts/run-tests.cjs [test-file-path]   # Run a specific test file
 *
 * Default: Metronomad/MyComponents/*Test.html (all matching files)
 */

const http = require('http');
const path = require('path');
const fs = require('fs');

// cwd-independent: everything resolves from this script's location.
const ROOT = path.resolve(__dirname, '..');
const MYCOMPONENTS_DIR = path.join(ROOT, 'MyComponents');
const SERVER_PORT = 8000;

// Is the user-started server on :8000 serving the repo root?
function checkServer() {
    return new Promise((resolve) => {
        const options = {
            hostname: 'localhost',
            port: SERVER_PORT,
            path: '/Metronomad/MyComponents/',
            method: 'HEAD',
            timeout: 3000
        };

        const req = http.request(options, (res) => {
            resolve(res.statusCode === 200);
        });

        req.on('error', () => resolve(false));
        req.on('timeout', () => { req.destroy(); resolve(false); });
        req.end();
    });
}

/**
 * Harness instrumentation (I-9). Mocha 10's browser build exposes NO runner
 * on the global (mocha._runner does not exist) and its stats.tests counts
 * COMPLETED tests, not the registered total — so neither can signal
 * completion. The reliable signal is the Runner's 'end' event, and the
 * Runner is only reachable as the return value of mocha.run().
 *
 * This init script registers a load listener BEFORE the test page's own
 * (init scripts run first, so its listener dispatches first on 'load'),
 * wraps mocha.run to capture the returned runner, and marks
 * window.__mochaRun settled when the run's 'end' event fires. The HTML
 * reporter renders its final stats before that event, so the DOM and the
 * runner stats are both final when we extract.
 */
async function runTests(testPath, baseUrl = 'http://localhost:' + SERVER_PORT) {
    const { chromium } = require('playwright');

    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    await context.addInitScript(() => {
        window.__mochaRun = null; // { unavailable } | { settled, runner }
        window.addEventListener('load', () => {
            if (typeof mocha === 'undefined' || typeof mocha.run !== 'function') {
                window.__mochaRun = { unavailable: true };
                return;
            }
            const originalRun = mocha.run;
            mocha.run = function (...args) {
                const runner = originalRun.apply(mocha, args);
                window.__mochaRun = { settled: false, runner };
                if (runner && typeof runner.on === 'function') {
                    runner.on('end', () => { window.__mochaRun.settled = true; });
                }
                return runner;
            };
        }, { once: true });
    });
    const page = await context.newPage();

    // Capture ALL console messages to file
    let allLogs = [];
    page.on('console', msg => {
        const entry = `[${msg.type().toUpperCase()}] ${msg.text()}`;
        allLogs.push(entry);
    });

    page.on('pageerror', error => {
        const entry = `[PAGE ERROR] ${error.message}`;
        allLogs.push(entry);
    });

    try {
        console.log(baseUrl + '/' + testPath);
        // Navigate to test page
        // Use 'domcontentloaded' instead of 'networkidle' to avoid timeouts
        // from deferred tests that fetch non-existent resources
        await page.goto(baseUrl + '/' + testPath, {
            waitUntil: 'domcontentloaded'
        });
        // Wait for the page to expose #mocha (CDN scripts load after DOM parse)
        await page.waitForSelector('#mocha', { state: 'attached', timeout: 10000 });

        // Wait for the run to SETTLE: the captured runner's 'end' event
        // (window.__mochaRun.settled — see the init script), or a blocked CDN
        // (unavailable is marked on 'load'). A suite that never calls
        // mocha.run() or a test that never resolves hits the timeout; the
        // verdict evaluate below names the failure.
        try {
            await page.waitForFunction(() => {
                const run = window.__mochaRun;
                return !!run && (run.unavailable || run.settled);
            }, null, { timeout: 30000 });
        } catch (_) {
            // Fall through: the verdict reports whatever state the run is in.
        }

        // Extract test results (I-9: a missing runner, a run that never
        // started, or a 0-test suite is an ERROR, never a green 0/0 line).
        // Runner stats are final (the 'end' event fires after the reporter
        // renders); failure details come from the rendered DOM.
        const results = await page.evaluate(() => {
            const mochaEl = document.querySelector('#mocha');
            if (!mochaEl) {
                const bodyText = document.body.innerText || '';
                if (bodyText.includes('404') || bodyText.includes('Not Found')) {
                    return { error: 'Page not found - check the URL path' };
                }
                return { error: 'Could not find #mocha element - the test page did not load correctly' };
            }

            const run = window.__mochaRun;
            if (!run) {
                return { error: 'mocha.run() was never reached within the timeout — test page error or hung suite' };
            }
            if (run.unavailable) {
                return { error: 'Mocha unavailable (no runner) — CDN blocked or test page error' };
            }
            if (!run.settled) {
                const s = run.runner && run.runner.stats;
                return {
                    error: `run did not settle within the timeout (${s ? s.tests : 0} tests complete)`
                };
            }

            const stats = run.runner && run.runner.stats;
            if (!stats) {
                return { error: 'Mocha runner unavailable (no stats) — test page error' };
            }
            if (stats.tests === 0) {
                return { error: '0 tests — the suite loaded but registered no tests' };
            }

            const passes = stats.passes;
            const failures = stats.failures;
            const pendings = stats.pending;

            // Get failure details from DOM
            const failureDetails = [];
            mochaEl.querySelectorAll('.fail').forEach(fail => {
                const title = fail.querySelector('h2')?.innerText || '';

                const errorMsg = fail.querySelector('.error')?.innerText || '';

                const preErrors = fail.querySelectorAll('pre.error');
                let combinedError = errorMsg;
                preErrors.forEach(pre => {
                    if (pre.innerText && !combinedError.includes(pre.innerText)) {
                        combinedError += '\n' + pre.innerText;
                    }
                });

                const lines = combinedError.split('\n').filter(line => line.trim());
                const firstLine = lines[0] || '';

                // Normalize encoding: replace problematic characters
                const normalizeText = (text) => text.replace(/\u2026/g, '...').replace(/[^\x00-\x7F]/g, '');

                failureDetails.push({
                    title: normalizeText(title.trim()),
                    message: normalizeText(firstLine.trim().substring(0, 500)),
                    fullError: normalizeText(combinedError.substring(0, 5000))
                });
            });

            return {
                passes,
                failures,
                pendings,
                failureDetails
            };
        });

        // Output any console errors
        if (allLogs.length > 0) {
            console.log('\n=== CONSOLE LOGS ===');
            allLogs.forEach(log => console.log(log));
        }

        await browser.close();
        return results;

    } catch (error) {
        if (browser) await browser.close();
        throw error;
    }
}

// Find all Test.html files in MyComponents directory
function findTestFiles() {
    const files = fs.readdirSync(MYCOMPONENTS_DIR);
    return files
        .filter(file => file.endsWith('Test.html'))
        .map(file => `Metronomad/MyComponents/${file}`);
}

// Check if a test file exists on the server
// Always resolves to default path: Metronomad/MyComponents/<filename>
async function testFileExists(testPath) {
    // Extract just the filename from any provided path
    const fileName = path.basename(testPath);

    // Always use the default base path
    const url = 'Metronomad/MyComponents/' + fileName;

    const exists = await new Promise((resolve) => {
        const httpOptions = {
            hostname: 'localhost',
            port: SERVER_PORT,
            path: '/' + url,
            method: 'HEAD',
            timeout: 3000
        };

        const req = http.request(httpOptions, (res) => {
            resolve(res.statusCode === 200);
        });

        req.on('error', () => resolve(false));
        req.on('timeout', () => { req.destroy(); resolve(false); });
        req.end();
    });

    return exists ? url : null;
}

// Main
async function main() {
    // The runner requires the user-started server on :8000 (repo rule —
    // it never spawns one itself).
    if (!(await checkServer())) {
        throw new Error('No server on :8000 — start it first: bash start-server.sh (from the repo root)');
    }

    // Get test file(s) - either from args or find all Test.html files
    const providedPath = process.argv[2];
    const testFiles = providedPath ? [providedPath] : findTestFiles();

    if (testFiles.length === 0) {
        throw new Error('No test files found');
    }

    const fileResults = [];
    const fileErrors = [];

    // Run each test file
    for (const testFile of testFiles) {
        try {
            const resolvedPath = await testFileExists(testFile);

            if (!resolvedPath) {
                throw new Error(`Test file not found: ${testFile}`);
            }

            const results = await runTests(resolvedPath);

            if (results.error) {
                throw new Error(results.error);
            }

            if (results.failures > 0) {
                // Surface the failing test names + first error line so the
                // non-zero exit is diagnosable from the runner output alone.
                const details = (results.failureDetails || []).map(
                    f => `  ✗ ${f.title}: ${f.message}`
                ).join('\n');
                console.error(`${results.failures} failing test(s):\n${details || '  (no details captured)'}`);
                throw new Error(`${results.failures} failing test(s)`);
            }

            fileResults.push({
                file: testFile,
                ...results
            });
        } catch (error) {
            // Collect the per-file failure; the run still exits non-zero.
            fileErrors.push({ file: testFile, error: error.message });
        }
    }

    if (fileResults.length > 0) {
        console.log(JSON.stringify({ files: fileResults }, null, 2));
    }

    if (fileErrors.length > 0) {
        console.error(JSON.stringify({ errors: fileErrors }, null, 2));
        throw new Error(`Test run failed — ${fileErrors.map(e => `${e.file}: ${e.error}`).join(' | ')}`);
    }
}

main();
