#!/usr/bin/env node
/**
 * Interactive test script for Midiestro pages
 * Loads each page, selects a random song, plays for 2 seconds, stops, and checks for console errors
 *
 * Usage:
 *   node test-midiestro-interactive.cjs                    # Tests all 5 pages
 *   node test-midiestro-interactive.cjs Midiestro          # Test specific page (uses exact filename)
 *   node test-midiestro-interactive.cjs MidiestroES        # Test specific page (uses exact filename)
 */

const http = require('http');
const { chromium } = require('playwright');

const BASE_DIR = '/Users/austin/workspace/austin183.github.io/MidiSongBuilder';
const SERVER_PORT = 8000;

// All available songs from midiSongList.js
const ALL_SONGS = [
    "Anonymous - For All the Seasons",
    "Anonymous - The First Noel",
    "Anonymous - Jingle Bells",
    "Thoinot Arbeau - Les Bouffons (Mattachins)",
    "Johann Sebastian Bach - 2 Part Inventions",
    "Johann Sebastian Bach - Brandenburg Concerto #2 in F",
    "Johann Sebastian Bach - Brandenburg Concerto #2 in F (III)",
    "Johann Sebastian Bach - Invention 1 c",
    "Johann Sebastian Bach - Gavotte",
    "Johann Sebastian Bach - Prelude 1",
    "Johann Sebastian Bach - The Gigue Fugue",
    "Georg Philipp Telemann - Sonata",
    "Debussy - Golliwog's Cakewalk",
    "Edvard Grieg - Hall of the Mountain King from Peer Gynt Suite No. 1",
    "George Frideric Handel - Music for the Royal Fireworks, HWV 351",
    "George Frideric Handel - Sheba from Judas Maccabeus, HWV 63 (piano arrangement)",
    "Wolfgang Amadeus Mozart - Piano Concerto No. 21 in C major, K. 467 (II. Andante) - Elvira Madigan",
    "Wolfgang Amadeus Mozart - Elvira Madigan from Piano Concerto No. 21 in C major, K. 467",
    "Franz Schubert - Serenade from Schwanengesang, D. 957",
    "Franz Schubert - Symphony No. 5 in B-flat major, D. 485 (I. Allegro)",
    "Robert Schumann - Soldier's March from Album für die Jugend, Op. 68",
    "Johann Strauss II - The Blue Danube Waltz, Op. 314 (II. Trio)",
    "Johann Strauss II - The Blue Danube Waltz, Op. 314 (III. Refrain)",
    "Johann Strauss II - The Blue Danube Waltz, Op. 314 (IV. Finale)",
    "Pyotr Ilyich Tchaikovsky - Swan Lake from Ballet Suite",
    "Pyotr Ilyich Tchaikovsky - Danse russe: Trepak",
    "Antonio Vivaldi - Spring from The Four Seasons, RV 269",
    "Antonio Vivaldi - Winter from The Four Seasons, RV 297",
    "Unknown Composer - The Maidens"
];

// Pages to test (exact filenames as they appear in URL)
const PAGES = [
    'Midiestro.html',
    'Midiestro3D.html',
    'MidiestroES.html',
    'Midiestro3DES.html',
    'MidiestroDifficultyComparisons.html'
];

function getRandomSong() {
    // Pick randomly from first 10 songs for reliability and speed
    const randomIndex = Math.floor(Math.random() * Math.min(10, ALL_SONGS.length));
    return { name: ALL_SONGS[randomIndex], index: randomIndex };
}

async function checkServerRunning() {
    const options = {
        hostname: 'localhost',
        port: SERVER_PORT,
        path: '/MidiSongBuilder/',
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
        play: [],
        stop: []
    };

    let currentPhase = 'load';

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

    // Capture network requests to debug MIDI loading
    const networkRequests = [];
    
    page.on('request', request => {
        if (request.url().includes('midi/')) {
            console.log(`  Network request: ${request.url()}`);
        }
    });

    page.on('response', response => {
        if (response.url().includes('midi/')) {
            console.log(`  Network response: ${response.status()} for ${response.url()}`);
        }
    });

    page.on('console', msg => {
        const text = msg.text();
        
        // Filter out expected warnings
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
        await page.goto(baseUrl + '/MidiSongBuilder/' + pagePath, {
            waitUntil: 'networkidle'
        });

        // Wait for page to fully initialize
        await page.waitForTimeout(2000);

        const pageTitle = await page.title();
        console.log(`  Page title: ${pageTitle}`);
        
        // Check if Vue app is mounted
        const vueMounted = await page.evaluate(() => document.getElementById('app') !== null);
        console.log(`  Vue app mounted: ${vueMounted}`);
        
        // Check if select element exists and has options
        const selectExists = await page.evaluate(() => {
            const sel = document.getElementById('midiSongSelect');
            return sel ? `exists, ${sel.options.length} options` : 'not found';
        });
        console.log(`  Select: ${selectExists}`);
        
        // Wait for Vue to mount and populate select options
        await page.waitForSelector('#app', { state: 'visible' });
        
        // Wait for select options to be available (Vue v-for needs time)
        // Note: use 'attached' not 'visible' since options inside select aren't "visible"
        await page.waitForSelector('#midiSongSelect option', { state: 'attached' });
        
        // Get random song index from within the page context (most reliable)
        const { songIndex: selectedSongIndex, songName: selectedSongName } = await page.evaluate(() => {
            const select = document.getElementById('midiSongSelect');
            const maxIndex = Math.min(9, select.options.length - 1); // First 10 songs (0-9)
            const randomIndex = Math.floor(Math.random() * (maxIndex + 1));
            return {
                songIndex: randomIndex,
                songName: select.options[randomIndex].text
            };
        });
        
        console.log(`  Selected song: ${selectedSongName} (index ${selectedSongIndex})`);
        
        try {
            console.log('  Selecting song from dropdown...');
            
            // Use JavaScript to set value and dispatch change event (most reliable for Vue)
            await page.evaluate((songIndex) => {
                const select = document.getElementById('midiSongSelect');
                select.selectedIndex = songIndex;
                select.dispatchEvent(new Event('change', { bubbles: true }));
            }, selectedSongIndex);
            
            // Check if the v-on:change triggered Vue's handler
            await page.waitForTimeout(500);
            
            // Check if any notes were rendered (indicates song loaded)
            const hasNotes = await page.evaluate(() => {
                const canvas = document.getElementById('notesCanvas');
                return canvas && canvas.getContext ? canvas.getContext('2d') !== null : false;
            });
            console.log(`  Canvas exists: ${hasNotes}`);
            
            // Check button state
            const buttonState = await page.evaluate(() => {
                const btn = document.getElementById('tonePlayToggle');
                return btn ? `disabled=${btn.disabled}, text="${btn.textContent}"` : 'not found';
            });
            console.log(`  Play button: ${buttonState}`);
            
            console.log('  Waiting for Play button to be enabled...');
        } catch (err) {
            console.warn('  Warning: Could not select song - trying Jingle Bells (index 2)');
            await page.evaluate(() => {
                const select = document.getElementById('midiSongSelect');
                select.selectedIndex = 2; // Jingle Bells should be at index 2
                select.dispatchEvent(new Event('change', { bubbles: true }));
            });
        }

        currentPhase = 'play';

        // Wait for Play button to become enabled (indicates MIDI loaded)
        await page.waitForSelector('#tonePlayToggle:not([disabled])', { timeout: 15000 });
        await page.click('#tonePlayToggle');

        // Wait for 2.5 seconds of gameplay
        await page.waitForTimeout(2500);

        currentPhase = 'stop';

        // Click Stop button
        await page.click('#tonePlayToggle');
        
        // Wait for any cleanup errors to surface
        await page.waitForTimeout(1000);

        await browser.close();

        return {
            path: pagePath,
            title: pageTitle,
            selectedSong: selectedSongName,
            loadedSuccessfully: true,
            logs: {
                load: {
                    info: logs.load.filter(l => l.type === 'log'),
                    warnings: logs.load.filter(l => l.type === 'warning'),
                    errors: logs.load.filter(l => l.type === 'error' || l.type === 'uncaught' || l.type === 'network')
                },
                play: {
                    warnings: logs.play.filter(l => l.type === 'warning'),
                    errors: logs.play.filter(l => l.type === 'error' || l.type === 'uncaught' || l.type === 'network')
                },
                stop: {
                    warnings: logs.stop.filter(l => l.type === 'warning'),
                    errors: logs.stop.filter(l => l.type === 'error' || l.type === 'uncaught' || l.type === 'network')
                }
            },
            summary: {
                loadWarningCount: logs.load.filter(l => l.type === 'warning').length,
                loadErrorCount: logs.load.filter(l => l.type === 'error' || l.type === 'uncaught').length,
                playWarningCount: logs.play.filter(l => l.type === 'warning').length,
                playErrorCount: logs.play.filter(l => l.type === 'error' || l.type === 'uncaught').length,
                stopWarningCount: logs.stop.filter(l => l.type === 'warning').length,
                stopErrorCount: logs.stop.filter(l => l.type === 'error' || l.type === 'uncaught').length
            }
        };

    } catch (error) {
        if (browser) await browser.close();
        
        return {
            path: pagePath,
            title: 'N/A',
            selectedSong: 'N/A',
            loadedSuccessfully: false,
            logs: {
                load: { warnings: [], errors: [{type: 'error', text: error.message}] },
                play: { warnings: [], errors: [] },
                stop: { warnings: [], errors: [] }
            },
            summary: {
                loadWarningCount: 0,
                loadErrorCount: 1,
                playWarningCount: 0,
                playErrorCount: 0,
                stopWarningCount: 0,
                stopErrorCount: 0
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
        totalPlayErrors: results.reduce((sum, r) => sum + r.summary.playErrorCount, 0),
        totalStopErrors: results.reduce((sum, r) => sum + r.summary.stopErrorCount, 0),
        allPassed: results.every(r => r.loadedSuccessfully && 
            r.summary.loadErrorCount === 0 && 
            r.summary.playErrorCount === 0 &&
            r.summary.stopErrorCount === 0)
    };

    console.log('\n========== Test Summary ==========');
    results.forEach(r => {
        const status = r.loadedSuccessfully && 
            r.summary.loadErrorCount === 0 && 
            r.summary.playErrorCount === 0 &&
            r.summary.stopErrorCount === 0 ? '✓ PASS' : '✗ FAIL';
        console.log(`${status} ${r.path}`);
        if (r.summary.loadWarningCount > 0 || r.summary.loadErrorCount > 0) {
            console.log(`    Load: ${r.summary.loadWarningCount} warnings, ${r.summary.loadErrorCount} errors`);
        }
        if (r.summary.playWarningCount > 0 || r.summary.playErrorCount > 0) {
            console.log(`    Play: ${r.summary.playWarningCount} warnings, ${r.summary.playErrorCount} errors`);
        }
        if (r.summary.stopWarningCount > 0 || r.summary.stopErrorCount > 0) {
            console.log(`    Stop: ${r.summary.stopWarningCount} warnings, ${r.summary.stopErrorCount} errors`);
        }
    });

    console.log('\n========== Full JSON Output ==========');
    console.log(JSON.stringify(summary, null, 2));

    process.exit(summary.allPassed ? 0 : 1);
}

main();
