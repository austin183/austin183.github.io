#!/usr/bin/env node
/**
 * Interactive test script for CollageMaker pages
 * Loads the page, uploads test images, changes layout, and checks for console errors
 *
 * Usage:
 *   node test-collage-interactive.cjs                    # Tests index.html
 *   node test-collage-interactive.cjs index              # Test specific page
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const BASE_DIR = '/Users/austin/workspace/austin183.github.io/CollageMaker';
const SERVER_PORT = 8000;

// Pages to test
const PAGES = [
    'index.html'
];

function createTestImageBuffer(width, height, color) {
    // Create a minimal valid PNG in memory
    // Using a small 1x1 pixel PNG as a placeholder
    const pngHeader = Buffer.from([
        0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,
        0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52,
        0x00, 0x00, 0x00, 0x10, 0x00, 0x00, 0x00, 0x10,
        0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x91, 0x68,
        0x36, 0x00, 0x00, 0x00, 0x0C, 0x49, 0x44, 0x41,
        0x54, 0x08, 0xD7, 0x63, 0xF8, 0xFF, 0xFF, 0xFF,
        0x00, 0x05, 0xFE, 0x02, 0xFE, 0xDC, 0xCC, 0x59,
        0xE7, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4E,
        0x44, 0xAE, 0x42, 0x60, 0x82
    ]);
    return pngHeader;
}

async function checkServerRunning() {
    const options = {
        hostname: 'localhost',
        port: SERVER_PORT,
        path: '/CollageMaker/',
        method: 'HEAD',
        timeout: 3000
    };

    return new Promise((resolve) => {
        const req = http.request(options, (res) => {
            resolve(res.statusCode === 200);
        });

        req.on('error', () => resolve(false));
        req.on('timeout', () => { req.destroy(); resolve(false); });
        req.end();
    });
}

async function testPage(pagePath) {
    const browser = await chromium.launch({ headless: false }); // Headed for debugging
    const context = await browser.newContext();
    const page = await context.newPage();

    const baseUrl = 'http://localhost:' + SERVER_PORT;
    
    let logs = {
        load: [],
        setup: [],
        interaction: []
    };

    let currentPhase = 'load';

    const expectedWarnings = [
        /Unhandled error during execution of mounted hook/
    ];

    const expectedErrors = [
        /Unhandled error during execution of mounted hook/
    ];

    page.on('console', msg => {
        const text = msg.text();
        
        // Filter out expected warnings
        if (msg.type() === 'warning' && expectedWarnings.some(pattern => pattern.test(text))) {
            return;
        }

        // Filter out expected errors
        if (msg.type() === 'error' && expectedErrors.some(pattern => pattern.test(text))) {
            return;
        }

        const entry = {
            type: msg.type(),
            text: text
        };

        logs[currentPhase].push(entry);
    });

    page.on('pageerror', error => {
        const message = error.message;
        
        if (expectedErrors.some(pattern => pattern.test(message))) {
            return;
        }
        
        logs[currentPhase].push({
            type: 'uncaught',
            text: `Uncaught Error: ${message}`
        });
    });

    page.on('requestfailed', request => {
        const url = request.url();
        const failure = request.failure();
        if (failure) {
            logs[currentPhase].push({
                type: 'network',
                text: `Failed to load resource: ${url} - ${failure.errorText}`
            });
        }
    });

    try {
        console.log(`\nTesting: ${pagePath}`);
        
        // Navigate to page
        await page.goto(baseUrl + '/CollageMaker/' + pagePath, {
            waitUntil: 'networkidle'
        });

        // Wait for page to fully initialize
        await page.waitForTimeout(2000);

        const pageTitle = await page.title();
        console.log(`  Page title: ${pageTitle}`);
        
        // Check if Vue app is mounted
        const vueMounted = await page.evaluate(() => document.getElementById('app') !== null);
        console.log(`  Vue app mounted: ${vueMounted}`);
        
        // Check for expected elements
        const hasToolbar = await page.evaluate(() => document.getElementById('toolbar') !== null);
        const hasCanvas = await page.evaluate(() => document.getElementById('previewCanvas') !== null);
        const hasLayoutSelect = await page.evaluate(() => document.getElementById('layoutStyleSelect') !== null);
        console.log(`  Toolbar: ${hasToolbar}, Canvas: ${hasCanvas}, Layout select: ${hasLayoutSelect}`);

        currentPhase = 'setup';

        // Wait for Vue to mount
        await page.waitForSelector('#app', { state: 'visible' });
        
        // Check initial state - should show placeholder
        const showsPlaceholder = await page.evaluate(() => {
            const placeholder = document.querySelector('.canvas-placeholder');
            return placeholder !== null;
        });
        console.log(`  Shows placeholder: ${showsPlaceholder}`);

        // Create a temporary test image file
        const testImagePath = path.join('/tmp', 'test-collage-image.png');
        fs.writeFileSync(testImagePath, createTestImageBuffer(16, 16, '#ff0000'));

        // Upload test image via file input
        console.log('  Uploading test image...');
        const fileInput = await page.waitForSelector('#fileInput');
        await fileInput.setInputFiles(testImagePath);
        
        // Wait for image to be processed
        await page.waitForTimeout(2000);
        
        // Check if image was loaded
        const imageCount = await page.evaluate(() => {
            const libraryHeader = document.querySelector('#sidebar-left h3');
            return libraryHeader ? libraryHeader.textContent : 'not found';
        });
        console.log(`  Image library: ${imageCount}`);
        
        // Check if canvas is now visible
        const canvasVisible = await page.evaluate(() => {
            const canvas = document.getElementById('previewCanvas');
            return canvas && canvas.offsetParent !== null;
        });
        console.log(`  Canvas visible after upload: ${canvasVisible}`);

        currentPhase = 'interaction';

        // Test layout change
        if (hasLayoutSelect) {
            console.log('  Testing layout change...');
            const layoutOptions = await page.evaluate(() => {
                const select = document.getElementById('layoutStyleSelect');
                return Array.from(select.options).map(o => o.value);
            });
            console.log(`  Available layouts: ${layoutOptions.join(', ')}`);
            
            if (layoutOptions.length > 1) {
                // Change to a different layout
                await page.evaluate((options) => {
                    const select = document.getElementById('layoutStyleSelect');
                    select.value = options[1];
                    select.dispatchEvent(new Event('change', { bubbles: true }));
                }, layoutOptions);
                
                await page.waitForTimeout(1000);
                
                // Check canvas dimensions changed
                const canvasSize = await page.evaluate(() => {
                    const canvas = document.getElementById('previewCanvas');
                    return canvas ? `${canvas.width}x${canvas.height}` : 'not found';
                });
                console.log(`  Canvas size after layout change: ${canvasSize}`);
            }
        }

        // Test gutter slider
        const hasGutterSlider = await page.evaluate(() => document.getElementById('gutterSlider') !== null);
        if (hasGutterSlider) {
            console.log('  Testing gutter slider...');
            await page.evaluate(() => {
                const slider = document.getElementById('gutterSlider');
                slider.value = 10;
                slider.dispatchEvent(new Event('input', { bubbles: true }));
            });
            await page.waitForTimeout(500);
        }

        // Cleanup temp file
        fs.unlinkSync(testImagePath);

        await browser.close();

        return {
            path: pagePath,
            title: pageTitle,
            loadedSuccessfully: true,
            logs: {
                load: {
                    info: logs.load.filter(l => l.type === 'log'),
                    warnings: logs.load.filter(l => l.type === 'warning'),
                    errors: logs.load.filter(l => l.type === 'error' || l.type === 'uncaught' || l.type === 'network')
                },
                setup: {
                    warnings: logs.setup.filter(l => l.type === 'warning'),
                    errors: logs.setup.filter(l => l.type === 'error' || l.type === 'uncaught' || l.type === 'network')
                },
                interaction: {
                    warnings: logs.interaction.filter(l => l.type === 'warning'),
                    errors: logs.interaction.filter(l => l.type === 'error' || l.type === 'uncaught' || l.type === 'network')
                }
            },
            summary: {
                loadWarningCount: logs.load.filter(l => l.type === 'warning').length,
                loadErrorCount: logs.load.filter(l => l.type === 'error' || l.type === 'uncaught').length,
                setupWarningCount: logs.setup.filter(l => l.type === 'warning').length,
                setupErrorCount: logs.setup.filter(l => l.type === 'error' || l.type === 'uncaught').length,
                interactionWarningCount: logs.interaction.filter(l => l.type === 'warning').length,
                interactionErrorCount: logs.interaction.filter(l => l.type === 'error' || l.type === 'uncaught').length
            }
        };

    } catch (error) {
        if (browser) await browser.close();
        
        return {
            path: pagePath,
            title: 'N/A',
            loadedSuccessfully: false,
            logs: {
                load: { warnings: [], errors: [{type: 'error', text: error.message}] },
                setup: { warnings: [], errors: [] },
                interaction: { warnings: [], errors: [] }
            },
            summary: {
                loadWarningCount: 0,
                loadErrorCount: 1,
                setupWarningCount: 0,
                setupErrorCount: 0,
                interactionWarningCount: 0,
                interactionErrorCount: 0
            }
        };
    }
}

async function main() {
    const providedPage = process.argv[2];
    let pagesToTest;

    if (providedPage) {
        // If user provides page name, try to match it
        const matchingPage = PAGES.find(p => p.includes(providedPage));
        if (matchingPage) {
            pagesToTest = [matchingPage];
        } else {
            console.error(`Error: Page '${providedPage}' not found. Available pages:`);
            PAGES.forEach(p => console.error(`  - ${p}`));
            process.exit(1);
        }
    } else {
        pagesToTest = PAGES;
    }

    // Check that server is running
    const serverRunning = await checkServerRunning();
    if (!serverRunning) {
        throw new Error(`Server not running on http://localhost:${SERVER_PORT}. Please start the server first.`);
    }

    const results = [];

    for (const pagePath of pagesToTest) {
        try {
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
        totalLoadErrors: results.reduce((sum, r) => sum + r.summary.loadErrorCount, 0),
        totalSetupErrors: results.reduce((sum, r) => sum + r.summary.setupErrorCount, 0),
        totalInteractionErrors: results.reduce((sum, r) => sum + r.summary.interactionErrorCount, 0),
        allPassed: results.every(r => r.loadedSuccessfully && 
            r.summary.loadErrorCount === 0 && 
            r.summary.setupErrorCount === 0 &&
            r.summary.interactionErrorCount === 0)
    };

    console.log('\n========== Test Summary ==========');
    results.forEach(r => {
        const status = r.loadedSuccessfully && 
            r.summary.loadErrorCount === 0 && 
            r.summary.setupErrorCount === 0 &&
            r.summary.interactionErrorCount === 0 ? '✓ PASS' : '✗ FAIL';
        console.log(`${status} ${r.path}`);
        if (r.summary.loadWarningCount > 0 || r.summary.loadErrorCount > 0) {
            console.log(`    Load: ${r.summary.loadWarningCount} warnings, ${r.summary.loadErrorCount} errors`);
        }
        if (r.summary.setupWarningCount > 0 || r.summary.setupErrorCount > 0) {
            console.log(`    Setup: ${r.summary.setupWarningCount} warnings, ${r.summary.setupErrorCount} errors`);
        }
        if (r.summary.interactionWarningCount > 0 || r.summary.interactionErrorCount > 0) {
            console.log(`    Interaction: ${r.summary.interactionWarningCount} warnings, ${r.summary.interactionErrorCount} errors`);
        }
    });

    console.log('\n========== Full JSON Output ==========');
    console.log(JSON.stringify(summary, null, 2));

    process.exit(summary.allPassed ? 0 : 1);
}

main();
