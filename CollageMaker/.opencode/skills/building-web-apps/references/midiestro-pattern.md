# Midiestro3D Pattern

## Overview

The Midiestro3D project (`MidiSongBuilder/`) established the pattern for static web apps on `austin183.github.io`. CollageMaker follows this same pattern.

## Entry Point Pattern

```html
<!-- index.html -->
<!DOCTYPE html>
<html>
<head>
    <!-- CDN libraries -->
    <script src="https://unpkg.com/vue@3/dist/vue.global.js"></script>
    <!-- Shared CSS -->
    <link rel="stylesheet" href="../src/css/variables.css">
    <link rel="stylesheet" href="../src/css/Style.css">
    <link rel="stylesheet" href="Style.css">
</head>
<body>
    <div id="app">
        <!-- Vue template -->
    </div>
    <!-- Shared JS -->
    <script src="../src/js/themeSwitcher.js"></script>
    <!-- App module -->
    <script type="module">
        import { createCollageApp } from './MyESModules/App/createCollageApp.js';
        // ... app initialization
    </script>
</body>
</html>
```

## Reusable Components

| From Midiestro3D | In CollageMaker | Notes |
|---------------|-----------------|-------|
| `FileDropHandler.js` | `FileDropHandler.js` | Adapted for multi-file |
| `ComponentRegistry.js` | `ComponentRegistry.js` | Reused as-is |
| `BrowserUtils.js` | `BrowserUtils.js` | Reused as-is |
| `ThreeJSRenderer.js` | `CanvasRenderer.js` | Lifecycle pattern adapted |
| `createMidiestroApp.js` | `createCollageApp.js` | Factory pattern adapted |

## Shared Infrastructure

- `../src/css/variables.css` — Design tokens (CSS custom properties)
- `../src/css/Style.css` — Shared styles
- `../src/js/themeSwitcher.js` — Dark/light theme toggle
- `../src/js/collapsibleSections.js` — Collapsible panels

## Directory Structure

```
CollageMaker/
├── index.html              # Main entry point
├── Style.css               # Project-specific styles
├── AGENTS.md               # Project conventions
├── MyESModules/
│   ├── index.js            # Barrel exports
│   ├── App/                # Vue app assembly
│   ├── Models/             # Data types
│   ├── Layout/             # Layout generation (pure math)
│   ├── Rendering/          # Canvas 2D rendering
│   ├── State/              # State management
│   ├── Interaction/        # User interaction handlers
│   ├── Export/             # Export functionality
│   ├── Persistence/        # Settings persistence
│   ├── Saliency/           # Saliency analysis
│   └── Utils/              # Shared utilities
└── MyComponents/           # Test HTML files
```
