# AGENTS.md

## Scope

This file applies only inside `src/billing/`.

## Mission

Billing must remain branch-local/private and must not leak financial data across academies.

## Current phase 1 limitation

- Student-centric billing endpoints currently resolve against the student's current `primaryBranch`.
- If a student changes `primaryBranch`, prior branch financial history remains stored but is not exposed as a historical cross-branch student billing view through the current student endpoints.
- Do not silently expand this behavior into cross-branch financial visibility without an explicit domain decision.

## Non-negotiable rules

- No cross-branch financial visibility.
- Do not mix branch accounting with central communications.
- Keep billing isolated from generalized org-wide views unless explicitly designed that way.
- Financial data is sensitive by default.

## Architecture

Use:

- controller
- application/use-cases
- domain/policies
- infrastructure/repositories
- dto

## Security

Treat all billing changes as high sensitivity.
