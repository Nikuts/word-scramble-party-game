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
   - **Host Utility Controls & Overlay Avoidance:** Never place floating fixed buttons in bottom corners where they can overlap player score ribbons, bottom status marquees, reaction emojis, or podium accolades. Integrate host utility controls (`TV Mode`, `Close Lobby`, `End Game`) into the top header or dedicated corner utility bar.

3. **Multi-Device & Viewport Orientation Matrix:**
   - **Landscape TV & Laptop (>= 1024px width, aspect >= 1.2):** Enforce strict `100dvh` / `h-screen` height clamping with `overflow-hidden` so host screens never display accidental window scrollbars or clipped action buttons.
   - **Portrait Tablet & Mobile Phone (390x844, 768x1024, 820x1180):** Mobile and portrait host layouts must support fluid vertical touch scrolling (`overflow-y-auto`) with **zero horizontal spillage** (`scrollWidth <= innerWidth + 2`). Never lock vertical touch scrolling with hard `overflow-hidden` on mobile/portrait devices. Include a subtle, dismissible orientation helper banner on portrait viewports (`🔄 Tip: Rotate device to landscape for full TV display view`).
   - Verify UI components across all supported variations before declaring completeness:
     - Player count extremes (3P, 6P, and 14P Max).
     - Language toggles (`EN` and `UA` / `UK`).
     - State branches (Host vs Player, Voter vs Competitor vs Voted, Winner vs Runner-up).

