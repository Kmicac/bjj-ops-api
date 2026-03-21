# AGENTS.md

## Scope
This file applies only inside `src/classes/`.

## Mission
Classes must support real academy operations cleanly and safely.

## Non-negotiable rules
- Keep `ClassSchedule` separate from `ClassSession`.
- `ClassSession` is the source of truth for actual attendance-related operations.
- Current domain rule: one branch = one simultaneous operational unit.
- Do not add room/mat/area unless explicitly approved.
- Keep public and internal scheduling concerns separate.

## Authorization
- STAFF+ with branch access may perform operational actions allowed by current policy.
- Sensitive updates must remain restricted per documented role policy.
- No cross-tenant or cross-branch access.

## Architecture
Use:
- controller
- application/use-cases
- domain/policies
- infrastructure/repositories
- dto

Do not push business scheduling rules into repositories.