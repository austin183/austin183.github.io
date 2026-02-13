# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a personal website containing educational programming projects that run directly in web browsers. The site demonstrates various technologies and concepts through interactive web applications. It's a static HTML/CSS/JavaScript website without a build step - projects run as-is in browsers.

## Tech Stack

- **Vue.js**: Used for interactivity and component-based UI in MidiSongBuilder projects
- **Tone.js**: Music synthesis library for audio generation
- **Plotly**: Data visualization for TaxBracketVisualizer
- **Chart.js**: Charting library for TaxBracketVisualizer
- **PureCSS**: CSS framework for styling across projects
- **MIDI.js**: MIDI file processing for rhythm games

## Project Structure

```
├── index.html                      # Main landing page
├── src/
│   ├── css/
│   │   └── Style.css              # Shared styles (used across all pages)
│   └── js/
│       └── themeSwitcher.js       # Shared theme toggle functionality
├── BlogPosts/
│   └── [YYYYMMDD_description].html  # Development history posts
├── MidiSongBuilder/
│   ├── Keybiano.html              # Keyboard-based piano
│   ├── Midiestro.html             # Rhythm game with MIDI files
│   ├── MidiestroDifficultyComparisons.html
│   ├── Libraries/                 # **DO NOT READ CONTENTS** - Large third-party libs
│   ├── MyComponents/              # Reusable components
│   ├── SongWork/                  # Song data
│   └── CLAUDE.md                  # Contains strict rule: do not read Libraries directory
├── TaxBracketVisualizer/
│   ├── index.html                 # Interactive tax bracket visualizations
│   ├── theTaxCube.html            # 3D tax visualization
│   ├── YearlyTaxes.js             # Tax calculation logic
│   ├── ChartHelper.js             # Chart.js utilities
│   ├── PlotlyHelper.js            # Plotly utilities
│   └── TaxCalculator.js           # Core tax math
└── Other/                         # Supporting files
```

## Key Constraints

### MIDI Song Builder
- **DO NOT read any files in the `MidiSongBuilder/Libraries` directory.**
- This folder contains large third-party libraries (Tone.js, ToneMidi.js, vue.min.js, mocha.js, chai.min.js) that should not be accessed directly.
- All interactions with code in `MidiSongBuilder/Libraries` should be limited to directory operations and never include reading file contents.

## Common Patterns

### Page Structure
All HTML pages follow a consistent structure:
```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="stylesheet" href="https://unpkg.com/purecss@2.0.3/build/pure-min.css" />
    <link rel="stylesheet" href="./src/css/Style.css">
</head>
<body>
    <button class="theme-toggle" onclick="toggleTheme()">Toggle Theme</button>
    <script src="./src/js/themeSwitcher.js"></script>
    <!-- Page-specific content -->
</body>
</html>
```

### Theme Toggle
All pages use a global theme toggle feature:
- Button with class `theme-toggle` and `onclick="toggleTheme()"`
- `themeSwitcher.js` provides the toggle functionality
- `Style.css` contains theme styles

### Blog Posts
Blog posts are chronologically ordered by date in the filename format: `YYYYMMDD_description.html`. They document the development history of the projects on this site.

## Running the Projects

Since this is a static website, no build process is required:
1. Open `index.html` in a modern web browser
2. Navigate to individual project pages via the links on the landing page
3. All projects are self-contained and run immediately

## Development Notes

- This is a learning project website - educational focus on trying new technologies
- Projects use vanilla JavaScript with Vue.js for state management where needed
- Code organization focuses on educational clarity over production-ready patterns