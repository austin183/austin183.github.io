# CollageMaker Web App

A web-based collage maker that allows users to load images, arrange them in various layouts, and export as JPEG.

## Architecture

- **Framework:** Vue 3 (Options API) loaded from CDN
- **Rendering:** Canvas 2D API
- **Pattern:** Single HTML entry point, ES modules, no build step
- **Structure:** Follows Midiestro3D pattern with `MyESModules/` organization

## Directory Structure

```
CollageMaker/
├── index.html              # Main entry point
├── Style.css               # Project-specific styles
├── AGENTS.md               # This file
├── MyESModules/
│   ├── index.js            # Barrel exports
│   ├── App/                # Vue app assembly
│   ├── Models/             # Data types
│   ├── Layout/             # Layout generation (pure math)
│   ├── Rendering/          # Canvas 2D rendering
│   ├── State/              # State management
│   ├── Interaction/        # User interaction handlers
│   ├── Export/             # Export functionality (future)
│   ├── Persistence/        # Settings persistence (future)
│   ├── Saliency/           # Saliency analysis (future)
│   └── Utils/              # Shared utilities
```

## Running

Start the dev server from the workspace root:
```bash
bash start-server.sh
```

Then navigate to: `http://localhost:8000/CollageMaker/index.html`

## Conventions

- ES modules with named exports
- Factory functions for creating instances (no classes unless needed)
- Plain objects for data models
- Pure functions for layout math
- Canvas 2D for all rendering
- Vue 3 Options API for reactivity
- No build step, no bundler, no transpilation
