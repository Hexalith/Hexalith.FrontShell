# Scenario: Visual Regression Baseline

## Target
Add screenshot-based visual regression tests to the design system to catch unintended visual changes.

## Current State
- 30 Playwright CT spec files exist but only test accessibility (axe-core)
- No `toHaveScreenshot()` calls anywhere
- Playwright CT infrastructure is fully configured
- Light and dark theme test helpers exist

## Desired State
Key components have visual regression screenshots in both light and dark themes, establishing a baseline that CI can compare against on every PR.

## Success Criteria
1. Visual snapshot tests added to representative components across all categories
2. Both light and dark themes covered
3. Playwright config updated with snapshot settings
4. CI can detect visual regressions

## Scope
- Pages affected: None
- Components touched: Existing spec files updated (no component changes)
- Data changes: None
- Risk level: Low — additive tests only
