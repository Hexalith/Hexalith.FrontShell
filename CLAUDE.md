# Hexalith FrontShell

## Project Overview

Hexalith FrontShell is a modular micro-frontend shell for Hexalith applications. It uses a monorepo architecture with pnpm workspaces and Turborepo.

## Key Conventions

- Testing conventions: see `docs/testing-strategy.md` for test pyramid ratios, quality standards, AC marker convention, and contract testing approach.
- Module boundaries enforced by ESLint — no cross-package imports, no direct Radix imports.
- Design tokens enforced by Stylelint — no hardcoded colors, spacing, or typography.
- CI pipeline in `.github/workflows/ci.yml` — all gates must pass before merge.
