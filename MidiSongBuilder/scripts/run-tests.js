#!/usr/bin/env node
/**
 * Run Mocha tests from HTML files using Playwright
 * Outputs test results in JSON format for CI/automation
 *
 * Usage:
 *   node run-tests.js                    # Runs all Test.html files in MyComponents
 *   node run-tests.js [test-file-path]   # Run a specific test file
 *
 * Default: MidiSongBuilder/MyComponents/*Test.html (all matching files)
 */

const http = require('http');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');

const BASE_DIR = '/Users/austin/workspace/austin183.github.io/MidiSongBuilder';
const MYCOMPONENTS_DIR = path.join(BASE_DIR, 'MyComponents');
const SERVER_PORT = 8000;
const SERVER_ROOT = '/Users/austin/workspace/austin183.github.io';

let serverProcess = null;

function checkServer() {
    return new Promise((resolve) => {
        const options = {
            hostname: 'localhost',
            port: SERVER_PORT,
            path: '/MidiSongBuilder/MyComponents/',
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

function startServer() {
    return new Promise((resolve, reject) => {
        // Check if server is already running first
        checkServer().then(ready => {
            if (ready) {
                resolve(true);
                return;
            }

            // Start new server
            const serverCmd = `cd ${SERVER_ROOT} && python3 -m http.server ${SERVER_PORT}`;
            serverProcess = exec(serverCmd);

            // Give server time to start
            setTimeout(() => {
                checkServer().then(resolve, () => reject(new Error('Failed to verify server started')));
            }, 1000);
        });
    });
}

function cleanupServer() {
    if (serverProcess) {
        try {
            process.kill(serverProcess.pid, 'SIGTERM');
        } catch (e) {
            // Process already terminated
        }
        serverProcess = null;
    }
}

async function runTests(testPath, baseUrl = 'http://localhost:' + SERVER_PORT) {
    const { chromium } = require('playwright');

    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();

    try {
        console.log(baseUrl + '/' + testPath);
        // Navigate to test page
        await page.goto(baseUrl + '/' + testPath, {
            waitUntil: 'networkidle'
        });

        // Wait a bit for tests to run (Mocha runs synchronously on load)
        await page.waitForTimeout(1000);

        // Extract test results by parsing the DOM
        const results = await page.evaluate((basePath) => {
            const mochaEl = document.getElementById('mocha');
            if (!mochaEl) {
                // Try to determine what went wrong
                const bodyText = document.body.innerText || '';
                if (bodyText.includes('404') || bodyText.includes('Not Found')) {
                    return { error: 'Page not found - check the URL path' };
                }
                return { error: 'Could not find #mocha element - the test page did not load correctly' };
            }

            // Try to get Mocha's internal state for pass/fail/pending counts
            let runner;
            if (typeof mocha !== 'undefined' && mocha._runner) {
                runner = mocha._runner;
            } else if (window.Mocha && window.Mocha.runner) {
                runner = window.Mocha.runner;
            }

            // Parse counts from DOM as fallback (works when runner object is not accessible)
            const passesEl = mochaEl.querySelector('.passes em');
            const failuresEl = mochaEl.querySelector('.failures em');
            
            let passes = 0;
            let failures = 0;
            let pendings = [];

            if (runner) {
                passes = runner.passes().length;
                failures = runner.failures().length;
                pendings = runner.pending();
            } else {
                // Fallback: parse from DOM stats elements
                passes = passesEl ? parseInt(passesEl.textContent) || 0 : 0;
                failures = failuresEl ? parseInt(failuresEl.textContent) || 0 : 0;
            }

            // Get failure details from DOM
            const failureDetails = [];
            mochaEl.querySelectorAll('.fail').forEach(fail => {
                const title = fail.querySelector('h2')?.innerText || '';

                // Get all error-related content
                const errorMsg = fail.querySelector('.error')?.innerText || '';

                // Also check for <pre> elements that might contain full error
                const preErrors = fail.querySelectorAll('pre.error');
                let combinedError = errorMsg;
                preErrors.forEach(pre => {
                    if (pre.innerText && !combinedError.includes(pre.innerText)) {
                        combinedError += '\n' + pre.innerText;
                    }
                });

                // Get first line of error (better handling)
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
        .map(file => `MidiSongBuilder/MyComponents/${file}`);
}

// Check if a test file exists on the server
// Always resolves to default path: MidiSongBuilder/MyComponents/<filename>
async function testFileExists(testPath) {
    // Extract just the filename from any provided path
    const fileName = path.basename(testPath);
    
    // Always use the default base path
    const url = 'MidiSongBuilder/MyComponents/' + fileName;
    
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
    // Get test file(s) - either from args or find all Test.html files
    const providedPath = process.argv[2];
    let testFiles;

    if (providedPath) {
        // Single file mode - pass the path as-is, testFileExists will try all possibilities
        testFiles = [providedPath];
    } else {
        // Auto-discover all Test.html files
        testFiles = findTestFiles();
    }

    if (testFiles.length === 0) {
        throw new Error('No test files found');
    }

    // Ensure server is running (auto-starts if needed)
    await startServer();

    const fileResults = [];

    // Run each test file
    for (const testFile of testFiles) {
        try {
            const resolvedPath = await testFileExists(testFile);
            
            if (!resolvedPath) {
                throw new Error(`Test file not found: ${testFile}`);
            }
            
            const results = await runTests(resolvedPath);

            if (results.error) {
                throw new Error("ResultsError: " + results.error);
            }

            fileResults.push({
                file: testFile,
                ...results
            });
        } catch (error) {
            // Log error but continue to next file instead of stopping
            console.error(`Error running ${testFile}: ${error.message}`);
        }
    }

    if (fileResults.length === 0) {
        throw new Error('No test files ran successfully');
    }

    const summary = { files: fileResults };
    console.log(JSON.stringify(summary, null, 2));
}

// Cleanup on exit
process.on('exit', cleanupServer);

main();
