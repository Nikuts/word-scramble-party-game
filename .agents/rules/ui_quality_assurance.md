---
trigger: always_on
description: Mandatory autonomous visual QA audit for UI components, prototypes, and layout bounds
---

# Visual QA & UI Ergonomics Standards

1. **Mandatory Autonomous Visual Audit:**
   - Never present UI screens, prototypes, or layout updates to the user based solely on automated test pass status.
   - Always actively view and inspect captured screenshots (using `view_file`) before presenting findings, walkthroughs, or diffs.

2. **Visual Inspection Checklist:**
   - **Text Bounds & Truncation:** Verify every button, badge, title, and tooltip in all supported languages (English and Ukrainian) to ensure zero text overflow, awkward line wrapping, or unintentional ellipsis.
   - **Safe-Area & Viewport Bounds:** Verify that sticky headers, LED countdown timers, voting gauges, and docked bottom bars (emoji reactions, action buttons) have comfortable margins and fit 100% inside the visible mobile (390x844 / 375x812) or desktop/TV viewports without accidental scrolling.
   - **Asset & Container Scaling:** Ensure pixel art avatars, icons, and interactive touch targets maximize their containers without excess nested padding or undersized rendering.
   - **String & Icon Redundancy:** Cross-check template strings against localized dictionary values (`ui_text.js`) to guarantee zero duplicate emojis, duplicated labels, or unformatted raw keys.
   - **Touch Target Ergonomics:** Ensure all interactive elements have sufficient tactile surface area and dedicated action buttons where appropriate to prevent accidental taps during mobile scrolling.

3. **Multi-State & Multi-Viewport Verification:**
   - Verify UI components across all supported variations before declaring completeness:
     - Player count extremes (3P, 6P, and 14P Max).
     - Language toggles (`EN` and `UA` / `UK`).
     - State branches (Host vs Player, Voter vs Competitor vs Voted, Winner vs Runner-up).
