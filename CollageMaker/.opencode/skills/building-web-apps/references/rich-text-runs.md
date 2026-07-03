# Rich Text Run-Based Architecture

## Data Model

Contiguous stretches of identically-formatted text are grouped into "runs" (`TitleRun` objects). This minimizes storage compared to per-character attributes.

```javascript
{ text: 'Hello ', bold: false, italic: false, underline: false }
{ text: 'World', bold: true, italic: false, underline: false }
```

Adjacent runs with identical formatting are **merged** to keep the array minimal.

## Run Mutation Algorithm

When formatting a range of text (e.g., toggle bold on characters 5-10):

1. Find which runs overlap with the range
2. Split overlapping runs at range boundaries
3. Apply formatting to the inside portion
4. Merge adjacent runs with identical formatting

## Critical: Flag-Based Insertion (Not `break`)

When inserting or splitting in a run-processing loop, **never use `break`** — it silently drops all subsequent runs, causing data loss. Use an `inserted` flag instead:

```javascript
let inserted = false;
for (const run of runs) {
    if (!inserted && index <= runStart) {
        newRuns.push(charRun);
        inserted = true;
    }
    if (!inserted && index < runEnd) {
        // Split in middle of this run
        newRuns.push(beforePart);
        newRuns.push(charRun);
        newRuns.push(afterPart);
        inserted = true;
    } else {
        newRuns.push(cloneTitleRun(run));
    }
}
if (!inserted) {
    newRuns.push(charRun); // Append at end
}
```

## Gotchas

1. **Always merge after mutations** — call `mergeAdjacentRuns()` after any split or format change, or the run count grows unboundedly
2. **Discard empty runs** — after splitting, drop any run with `text.length === 0` to avoid rendering artifacts
3. **Run order is left-to-right** — maintain `charOffset` correctly through the loop
4. **`break` in run loops is a data-loss bug** — every run must be processed; use a flag instead

## Files

| File | Responsibility |
|------|---------------|
| `MyESModules/Models/TitleRun.js` | Run factory and formatting helpers |
| `MyESModules/State/TitleManager.js` | Run manipulation logic |
| `MyESModules/Rendering/TitleRenderer.js` | Run-based canvas rendering |
