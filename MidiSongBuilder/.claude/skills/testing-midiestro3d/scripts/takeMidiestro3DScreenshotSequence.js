/**
 * Script to capture screenshots from Midiestro3D.html testing camera presets
 * This script:
 * 1. Starts the game and takes screenshots
 * 2. Stops the game and cycles through each camera preset
 * 3. For each preset: takes a screenshot, then restarts the game
 * 4. Takes a sequence of screenshots during gameplay for each preset
 *
 * Camera presets tested:
 * - topDown: Top-Down View (looks straight down from above)
 * - roadView: Road View/Default (side view, typical gameplay)
 * - isometric: 3/4 Isometric View (angled 3D view)
 *
 * To run this script:
 * 1. Ensure a local web server is running on http://localhost:8000
 * 2. Run: node takeMidiestro3DScreenshotSequence.js
 * 3. Screenshots will be saved with timestamps in this directory:
 *    /Users/austin/workspace/austin183.github.io/MidiSongBuilder/.claude/skills/testing-midiestro3d/scripts/
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

// Configuration
const CONFIG = {
  baseUrl: 'http://localhost:8000/MidiSongBuilder/Midiestro3D.html',
  songName: 'Anonymous - Jingle Bells',
  // Camera presets to test
  cameraPresets: ['topDown', 'roadView', 'isometric'],
  // Number of screenshots to capture per preset during gameplay
  numScreenshotsPerPreset: 5,
  // Interval between screenshots (ms)
  interval: 500,
};

// Create output directory if it doesn't exist
const scriptDir = __dirname;
const outputDir = scriptDir;

/**
 * Take a sequence of screenshots while the game is running
 * @param {Object} page - Playwright page object
 * @param {string} phase - Phase identifier for filename (e.g., 'preset-roadView')
 * @returns {Promise<Array<string>>} - List of captured file paths
 */
async function takeScreenshotSequence(page, phase) {
  console.log('');
  console.log(`  Capturing screenshot sequence for ${phase}...`);

  const startTimestamp = Date.now();
  const capturedFiles = [];

  for (let i = 0; i < CONFIG.numScreenshotsPerPreset; i++) {
    // Calculate timestamp for filename
    const timestamp = Date.now();
    const timeOffset = timestamp - startTimestamp;
    const filename = `midiestro3d-${phase}-${timeOffset}ms.png`;
    const outputPath = path.join(outputDir, filename);

    // Take screenshot
    await page.screenshot({ path: outputPath, type: 'png' });
    console.log(`    [${i + 1}/${CONFIG.numScreenshotsPerPreset}] ${filename}`);
    capturedFiles.push(filename);

    // Wait for next screenshot (except after the last one)
    if (i < CONFIG.numScreenshotsPerPreset - 1) {
      await page.waitForTimeout(CONFIG.interval);
    }
  }

  return capturedFiles;
}

/**
 * Wait for a specific element to be visible
 * @param {Object} page - Playwright page object
 * @param {string} selector - CSS selector
 * @param {number} timeout - Timeout in ms
 * @returns {Promise<void>}
 */
async function waitForElement(page, selector, timeout = 5000) {
  await page.waitForSelector(selector, { state: 'visible', timeout });
}

/**
 * Wait for a specific element to be detached (hidden/disappear)
 * @param {Object} page - Playwright page object
 * @param {string} selector - CSS selector
 * @param {number} timeout - Timeout in ms
 * @returns {Promise<void>}
 */
async function waitForElementToHide(page, selector, timeout = 5000) {
  await page.waitForSelector(selector, { state: 'hidden', timeout });
}

(async () => {
  const browser = await chromium.launch({
    headless: false, // Set to true for headless mode
  });

  const context = await browser.newContext();
  const page = await context.newPage();

  // Set browser window size for consistent screenshots
  await page.setViewportSize({ width: 1600, height: 1200 });

  try {
    console.log('=== Midiestro3D Camera Preset Test ===');
    console.log(`Base URL: ${CONFIG.baseUrl}`);
    console.log(`Song: ${CONFIG.songName}`);
    console.log(`Camera presets to test: ${CONFIG.cameraPresets.join(', ')}`);
    console.log(`Screenshots per preset: ${CONFIG.numScreenshotsPerPreset}`);
    console.log(`Interval: ${CONFIG.interval}ms`);
    console.log('');

    // Navigate to the Midiestro3D page
    console.log('1. Navigating to page...');
    await page.goto(CONFIG.baseUrl);
    await page.waitForTimeout(1000);

    // Select a song from the dropdown
    console.log('2. Selecting song...');
    await page.selectOption('#midiSongSelect', CONFIG.songName);
    await page.waitForTimeout(500);

    const allCapturedFiles = [];

    // For each camera preset, we will:
    // 1. Start game -> take screenshots -> stop game
    // 2. Change preset -> take preset screenshot
    // 3. Restart game -> take more screenshots

    for (const preset of CONFIG.cameraPresets) {
      console.log('');
      console.log(`========== TESTING PRESET: ${preset} ==========`);

      // Get preset name from the preset definition
      const presetName = preset.replace(/^[a-z]/, (c) => c.toUpperCase());

      // ========== PART 1: Start game with current preset, take screenshots =========
      console.log('');
      console.log(`   Part 1: Starting game with ${presetName} preset...`);

      // Start the game
      await page.click('#tonePlayToggle');
      console.log('   Game started');

      // Wait for notes to spawn and start moving
      await page.waitForTimeout(1000);

      // Take screenshots during gameplay
      const gameFiles = await takeScreenshotSequence(page, `preset-${preset}-game`);
      allCapturedFiles.push(...gameFiles);

      // Stop the game - camera controls remain active after stop
      console.log('');
      console.log('   Stopping game...');
      await page.click('#tonePlayToggle');
      console.log('   Game stopped - camera controls now active');

      // Wait for camera controls to be ready
      await page.waitForTimeout(500);

      // ========== PART 2: Apply camera preset, take screenshot =========
      console.log('');
      console.log(`   Part 2: Applying ${presetName} preset and taking screenshot...`);

      // Select the preset from the dropdown
      await page.selectOption('#cameraPresetSelect', preset);
      await page.waitForTimeout(300); // Allow camera to settle

      // Take screenshot of the preset view
      const timestamp = Date.now();
      const presetFilename = `midiestro3d-${preset}-preset.png`;
      const presetPath = path.join(outputDir, presetFilename);
      await page.screenshot({ path: presetPath, type: 'png' });
      console.log(`    Captured: ${presetFilename}`);
      allCapturedFiles.push(presetFilename);

      // ========== PART 3: Restart game with preset active =========
      console.log('');
      console.log(`   Part 3: Restarting game with ${presetName} preset...`);

      // Click restart button
      await page.click('#tonePlayToggle');
      console.log('   Game restarted');

      // Wait for notes to spawn
      await page.waitForTimeout(1000);

      // Take screenshots during second gameplay
      const restartFiles = await takeScreenshotSequence(page, `preset-${preset}-restart`);
      allCapturedFiles.push(...restartFiles);

      // Stop the game again to prepare for next preset
      await page.click('#tonePlayToggle');
      await page.waitForTimeout(500);

      console.log('');
      console.log(`   Completed testing ${presetName} preset`);
    }

    // ========== SUMMARY ========
    console.log('');
    console.log('========== Screenshot Analysis Checklist ==========');
    console.log('');
    console.log('Per-Preset Analysis (for each preset: topDown, roadView, isometric):');
    console.log('  - Preset screenshot: Verify camera angle matches expectations');
    console.log('  - Game screenshots: Notes visible and readable from preset angle');
    console.log('  - Restart screenshots: Notes maintain position after restart');
    console.log('');
    console.log('Camera Preset Observations:');
    console.log('  - topDown: Should see top of notes, grid pattern visible');
    console.log('  - roadView: Should see notes approaching from distance');
    console.log('  - isometric: Should see 3D perspective with depth');
    console.log('');
    console.log('Note Visibility from Each Angle:');
    console.log('  - Notes should be readable (letter facing camera)');
    console.log('  - Shadow direction consistent with lighting');
    console.log('');

    // List captured files sorted by timestamp
    const allFiles = fs.readdirSync(outputDir)
      .filter(f => f.startsWith('midiestro3d-') && f.endsWith('.png'))
      .sort();

    console.log('');
    console.log('Captured files:');
    allFiles.forEach(f => console.log(`   - ${f}`));

    console.log('');
    console.log('=== Done! ===');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await browser.close();
  }
})();
