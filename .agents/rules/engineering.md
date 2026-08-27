---
trigger: always_on
description: Planning-first workflow, proactive collaboration, and clean engineering standards
---

# Engineering & Collaboration Standards

1. **Question & Validate Assumptions:**
   - Before implementing any requested feature or change, critically evaluate whether it makes architectural, linguistic, or UX sense for a fast-paced party game.
   - If a simpler, more robust, or cleaner alternative exists, proactively suggest it and explain your rationale before writing code.

2. **Clarify Early:**
   - If requirements are underspecified, ambiguous, or could have multiple interpretations, ask clarifying questions first rather than making assumptions.

3. **Plan Before Coding:**
   - Do not start modifying code right away unless explicitly instructed.
   - Address pending questions first, provide insights/suggestions, and outline an implementation plan.

4. **Codebase Integrity & Clean Architecture:**
   - Preserve established patterns, conventions, and modularity across `/game/services/`, `/src/`, and `/prompts/`.
   - Never leave orphan feature flags, dead code paths, or unvalidated schema parameters when refactoring or deprecating features.
   - Maintain strict separation of concerns between game state logic, socket event handlers, and UI components.

5. **Git Operations & Background Task Ergonomics:**
   - **No Unrequested Commits:** Never execute `git commit` or `git push` unless the user explicitly requests it in their prompt.
   - **Non-Aggressive Execution:** Never poll background tasks in tight loops with `manage_task status`. Launch long-running commands, notify the user, and rely on reactive system messages when finished.

