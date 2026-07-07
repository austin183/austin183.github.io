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
│   ├── Export/             # Export functionality
│   ├── Persistence/        # Settings persistence
│   ├── Saliency/           # Saliency analysis
│   └── Utils/              # Shared utilities
└── MyComponents/           # Test HTML files (Mocha/Chai)
```

## Running

Start the dev server from the workspace root:
```bash
bash start-server.sh
```

Then navigate to: `http://localhost:8000/CollageMaker/index.html`

## Testing

```bash
# Run unit tests (Mocha/Chai, browser-based)
node scripts/run-tests.js

# Run E2E tests (Playwright, requires dev server on :8080)
npx playwright test --config=playwright.config.cjs
```

## Conventions

- ES modules with named exports, `.js` extension in all imports
- Factory functions for creating instances (no classes unless needed)
- Plain objects for data models
- Pure functions for layout math
- Canvas 2D for all rendering with DPR scaling
- Vue 3 Options API with factory decomposition
- No build step, no bundler, no transpilation

## Documentation

- **Plans:** `_agent_docs/plans/` — implementation plans and test plans
- **Learnings:** `_agent_docs/learnings/` — hard-won knowledge from sessions
- **Research:** `_agent_docs/research/` — platform research and analysis
- **Specifications:** `_agent_docs/specifications/` — feature specifications
- **Session summaries:** `_agent_docs/project-timeline/sessions/`

## Working on the Project

- Write session summaries in `_agent_docs/project-timeline/sessions/` using the template from `.opencode/skills/analyzing-opencode-usage/references/session-summary.json`
- Capture learnings in `_agent_docs/learnings/` after significant discoveries using the `capturing-learnings` skill
- Consult the `building-web-apps` skill for Vue 3, Canvas 2D, and ES module patterns
- Git commits must include `Co-Authored-By: LittleLight <noreply@traveler.dstny>`
- Commit all project files — source code, tests (`MyComponents/`, `scripts/`), configs (`playwright.config.cjs`), and skills (`.opencode/skills/`)
