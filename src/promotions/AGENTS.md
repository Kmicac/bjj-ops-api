# AGENTS.md

## Scope
This file applies only inside `src/promotions/`.

## Mission
Promotions must remain a human-driven workflow with strong auditability and safe validation.

## Non-negotiable rules
- Never automate final promotion decisions.
- Do not invent graduation transitions.
- Use the federation reference documented in `docs/federation-reference.md`.
- Keep `PromotionRequest` and `PromotionEvaluation` separate.
- Preserve historical snapshots.
- Approval must update the current student state in the same transaction when that is the current domain rule.
- Do not change promotion semantics without updating `docs/business-rules.md` and `docs/domain-decisions.md`.

## Authorization
- INSTRUCTOR+ may propose if branch-safe and allowed by current policy.
- HEAD_COACH and ACADEMY_MANAGER have operational review roles according to documented policy.
- Sensitive approvals must respect current central authority rules.
- No cross-tenant or cross-branch visibility.

## Architecture
Use:
- controller
- application/use-cases
- domain/policies
- infrastructure/repositories
- dto

Do not put promotion decision logic inside repositories.

## Extra caution
Any change to:
- rank catalogs
- track transitions
- kids/adult graduation rules
- approval authority
must be treated as a domain decision, not a coding convenience.