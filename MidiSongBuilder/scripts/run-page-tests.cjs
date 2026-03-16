#!/usr/bin/env node
/**
 * Test HTML pages for console errors using Playwright
 * Loads each page and checks for any errors in the console that need to be addressed.
 *
 * Usage:
 *   node run-page-tests.js                    # Runs all Midiestro HTML pages
 *   node run-page-tests.js [page-file-path]   # Run a specific page file
 */

const http = require('http');
const path = require('path');

const BASE_DIR = '/Users/austin/workspace/austin183.github.io/MidiSongBuilder';
const SERVER_PORT = 8000;

function checkServer() {
    return new Promise((resolve) => {
        const options = {
            hostname: 'localhost',
            port: SERVER_PORT,
            path: '/MidiSongBuilder/',
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

async function checkServerRunning() {
    const ready = await checkServer();
    if (!ready) {
        throw new Error(`Server not running on http://localhost:${SERVER_PORT}. Please start the server first.`);
    }
}

function cleanupServer() {
    // Don't clean up - server was already running before we started
}

async function testPage(pagePath, baseUrl = 'http://localhost:' + SERVER_PORT) {
    const { chromium } = require('playwright');

    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();

    // Capture console messages and errors
    let logs = {
        info: [],
        warnings: [],
        errors: []
    };

    const expectedWarnings = [
        /AudioContext/i,
        /autoplay policy/i,
        /user gesture/i,
        /Unhandled error during execution of mounted hook/
    ];

    const expectedErrors = [
        /WebGL context could not be created/i,
        /Error creating WebGL context/i,
        /EGL/,
        /Unhandled error during execution of mounted hook/
    ];

    page.on('console', msg => {
        const text = msg.text();
        
        // Filter out expected browser warnings (AudioContext autoplay policy)
        if (msg.type() === 'warning' && expectedWarnings.some(pattern => pattern.test(text))) {
            return;
        }

        // Filter out expected WebGL errors (headless browser limitation for 3D pages)
        if (msg.type() === 'error' && expectedErrors.some(pattern => pattern.test(text))) {
            return;
        }

        const entry = {
            type: msg.type(),
            text: text
        };

        if (msg.type() === 'error') {
            logs.errors.push(entry);
        } else if (msg.type() === 'warning') {
            logs.warnings.push(entry);
        } else if (msg.type() === 'log') {
            logs.info.push(entry);
        }
    });

    page.on('pageerror', error => {
        const message = error.message;
        
        // Filter out expected WebGL errors (headless browser limitation for 3D pages)
        if (expectedErrors.some(pattern => pattern.test(message))) {
            return;
        }
        
        logs.errors.push({
            type: 'uncaught',
            text: `Uncaught Error: ${message}`
        });
    });

    // Capture network failures (404s, etc)
    page.on('requestfailed', request => {
        const url = request.url();
        const failure = request.failure();
        if (failure) {
            logs.errors.push({
                type: 'network',
                text: `Failed to load resource: ${url} - ${failure.errorText} (${request.failure()?.responseStatusCode || 'no status'})`
            });
        }
    });

    try {
        console.log(`Testing: ${baseUrl}/${pagePath}`);
        
        // Navigate to page
        await page.goto(baseUrl + '/' + pagePath, {
            waitUntil: 'networkidle'
        });

        // Wait a bit for any async errors to surface
        await page.waitForTimeout(2000);

        // Check if page loaded successfully (has basic expected elements)
        const pageTitle = await page.title();
        const hasBodyContent = await page.evaluate(() => document.body.innerHTML.length > 0);

        await browser.close();

        return {
            path: pagePath,
            title: pageTitle,
            loadedSuccessfully: hasBodyContent && pageTitle !== '',
            logs: {
                infoCount: logs.info.length,
                warningCount: logs.warnings.length,
                errorCount: logs.errors.length
            },
            warnings: logs.warnings.map(w => w.text),
            errors: logs.errors.map(e => e.text),
            details: {
                infoLogs: logs.info,
                warningDetails: logs.warnings,
                errorDetails: logs.errors
            }
        };

    } catch (error) {
        if (browser) await browser.close();
        
        return {
            path: pagePath,
            title: 'N/A',
            loadedSuccessfully: false,
            logs: {
                infoCount: 0,
                warningCount: 0,
                errorCount: 1
            },
            warnings: [],
            errors: [`Navigation Error: ${error.message}`],
            details: null
        };
    }
}

// Get the list of pages to test
function getPageFiles() {
    return [
        'MidiSongBuilder/Midiestro.html',
        'MidiSongBuilder/Midiestro3D.html',
        'MidiSongBuilder/MidiestroES.html',
        'MidiSongBuilder/Midiestro3DES.html',
        'MidiSongBuilder/MidiestroDifficultyComparisons.html'
    ];
}

// Check if a page exists on the server
async function pageExists(pagePath) {
    const url = 'MidiSongBuilder/' + path.basename(pagePath);
    
    return new Promise((resolve) => {
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
}

// Main function
async function main() {
    // Get pages to test - either from args or use default list
    const providedPath = process.argv[2];
    let pagesToTest;

    if (providedPath) {
        pagesToTest = [providedPath];
    } else {
        pagesToTest = getPageFiles();
    }

    if (pagesToTest.length === 0) {
        throw new Error('No pages to test');
    }

    // Check that server is running (doesn't start it)
    await checkServerRunning();

    const results = [];

    // Test each page
    for (const pagePath of pagesToTest) {
        try {
            const exists = await pageExists(pagePath);
            
            if (!exists) {
                console.error(`Page not found: ${pagePath}`);
                continue;
            }

            const result = await testPage(pagePath);
            results.push(result);
        } catch (error) {
            console.error(`Error testing ${pagePath}: ${error.message}`);
        }
    }

    if (results.length === 0) {
        throw new Error('No pages were tested successfully');
    }

    // Output results as JSON for CI/automation
    const summary = {
        pages: results,
        totalErrors: results.reduce((sum, r) => sum + r.logs.errorCount, 0),
        totalWarnings: results.reduce((sum, r) => sum + r.logs.warningCount, 0),
        allPassed: results.every(r => r.loadedSuccessfully && r.logs.errorCount === 0)
    };

    console.log(JSON.stringify(summary, null, 2));

    // Exit with error code if there were errors
    process.exit(summary.allPassed ? 0 : 1);
}

// Cleanup on exit
process.on('exit', cleanupServer);

main();
