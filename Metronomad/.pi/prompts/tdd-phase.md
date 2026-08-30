---
description: Implement a plan phase with build-tdd, then world-review, timeline update, and learnings capture
argument-hint: "<phase number> [plan directory name]"
---
Implement Phase ${1:-no phase specified — ask me which phase and which plan directory} of the plan in `_agent_docs/plans/${2:-no plan directory specified — confirm the plan directory with me}`.

Work hands-off: I am only partially paying attention. Use your best judgment and do not stop to ask me what mattered or what to do next.

Sequence, in order:
1. Implement via /build-tdd — work from the phase file and its "Context to load" list only, not the whole plan.
2. Run a /world-review pass over the phase's changes and address valid findings without waiting for me. Findings that conflict with pinned decisions (D-*/W-*/KB-*) are discussion items — record them in the timeline entry, don't act on them.
3. Append the completed phase to `_agent_docs/project-timeline/project-timeline.md`.
4. Run the capturing-learnings skill.
