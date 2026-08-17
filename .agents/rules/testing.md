---
trigger: always_on
description: Mandatory Vitest unit and Playwright E2E test coverage and verification
---

# Testing Standards & Verification

1. **Test Coverage Obligation:**
   - Always add or update automated tests for new features, bug fixes, algorithm refactors, and validation schemas whenever possible and sensible.

2. **Dual-Layer Testing Strategy:**
   - **Unit / Service Tests (`vitest`):** Test backend game state, scoring matrices, word bank algorithms, timers, socket schemas, reconnection flows, and prompt loading in isolation. Run with:
     ```bash
     npx vitest run --fileParallelism=false
     ```
   - **End-to-End Tests (`playwright`):** For multi-player socket orchestration (3 to 14 players), UI flows, mobile answering, voting tallying, and Host TV screen rendering, add/update Playwright specs in `e2e/`. Run with:
     ```bash
     npx playwright test
     ```

3. **Green Status Requirement:**
   - Ensure all unit and E2E test suites pass with 100% green status before considering any task complete.
