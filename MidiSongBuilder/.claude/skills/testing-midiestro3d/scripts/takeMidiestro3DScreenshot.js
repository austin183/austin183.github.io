/**
 * Script to navigate to Midiestro3D, select a song, play for 2 seconds, and take a screenshot.
 *
 * To run this script:
 * 1. Ensure a local web server is running on http://localhost:8000
 * 2. Run: node takeMidiestro3DScreenshot.js
 * 3. The screenshot will be saved as: midiestro3d-screenshot.png in this directory
 *    (Same directory as this script: /Users/austin/workspace/austin183.github.io/MidiSongBuilder/.claude/skills/testing-midiestro3d/scripts/)
 */

const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({
    headless: false, // Set to true for headless mode
  });

  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // Navigate to the Midiestro3D page
    console.log('Navigating to http://localhost:8000/MidiSongBuilder/Midiestro3D.html');
    await page.goto('http://localhost:8000/MidiSongBuilder/Midiestro3D.html');

    // Wait for the page to load
    await page.waitForTimeout(1000);

    // Select a song from the dropdown (Anonymous - Jingle Bells)
    console.log('Selecting song: Anonymous - Jingle Bells');
    await page.selectOption('#midiSongSelect', 'Anonymous - Jingle Bells');

    // Wait for the song to load and Play button to become enabled
    await page.waitForTimeout(500);

    // Click the Play button
    console.log('Clicking Play button');
    await page.click('#tonePlayToggle');

    // Wait for 2.5 seconds of gameplay
    console.log('Playing for 2.5 seconds...');
    await page.waitForTimeout(2500);

    // Take a screenshot
    const outputPath = __dirname + '/midiestro3d-screenshot.png';
    await page.screenshot({ path: outputPath, type: 'png' });
    console.log(`Screenshot saved to: ${outputPath}`);

    // Keep the browser open for a moment so you can see the result
    await page.waitForTimeout(1000);

    // Stop the game
    await page.click('#tonePlayToggle');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await browser.close();
  }
})();
