# AGENTS.md

## Mission
This repository contains the backend for a multi-tenant SaaS platform for Brazilian Jiu Jitsu organizations and academies.

The product must support:
- a single academy
- a team/organization with multiple branches
- future large-scale growth
- an architecture that can evolve toward services later without rewriting the domain model

Every account belongs to an `Organization`, even when that organization has only one branch.

## Product intent
This is not a generic gym CRUD.

This backend exists to support:
1. Daily academy operations
- students
- classes
- attendance
- internal communication
- memberships
- payments
- internal shop

2. Organizational governance
- organizations
- branches
- memberships
- roles
- scopes
- public branch profiles
- promotion approvals
- institutional communication
- auditability

3. Technical and athletic progression
- student progression
- promotion workflow
- attendance signals
- future competitive history
- future athlete intelligence

## Mandatory stack
- Node 22
- TypeScript
- NestJS
- pnpm
- PostgreSQL
- Prisma ORM v7
- prisma.config.ts
- modular monolith

## Architectural target
The current architecture must remain:
- readable
- maintainable
- modular
- migration-friendly toward future service extraction

This repo must not grow into a monolithic monster.

All new and refactored modules must follow this structure unless there is a very strong reason not to:

- controller
- application/use-cases
- domain/policies
- infrastructure/repositories
- dto
- module

Rules:
- Controllers are thin.
- Use cases orchestrate business flows.
- Policies contain reusable domain and authorization rules.
- Repositories encapsulate Prisma and transaction handling.
- Repositories must not become business-rule containers.
- Do not access Prisma directly from controllers.
- Do not create god-services.
- Do not introduce architecture drift between modules.
- Do not create speculative abstractions or empty interfaces.

## Multi-agent workflow
This repo is intended to be worked on with multiple Codex agents.

Preferred agent roles:
- Architect reviewer
- Feature implementer
- Security reviewer
- QA reviewer
- Final change reviewer

All agents must obey this AGENTS.md before following local instructions.

For sensitive modules, check nested `AGENTS.md` files inside module directories.

## Product priorities
The project must stay focused on the core product.
Do not get distracted by over-testing, over-tooling, or speculative platform work.

Priority order:
1. secure domain foundations
2. core business modules
3. operational workflows
4. reporting and product polish
5. deeper automation only when justified

## Non-negotiable rules
- Never expose data across tenants.
- Authorization is always enforced in backend.
- Never trust frontend for security or permissions.
- Every critical action must be auditable.
- Keep public and private data clearly separated.
- Do not introduce deprecated patterns.
- Do not change core domain rules without updating docs.
- If a business rule is unclear, do not invent it.

## Business rules that must not be broken
- One `Organization` is the tenant boundary.
- One `Branch` belongs to one `Organization`.
- A `Student` belongs to one `Organization` and has one primary branch.
- Student history must not be lost when the student changes primary branch.
- `BranchPublicProfile` remains separate from private branch data.
- `HEAD_COACH` is not a generic assignable title with free semantics; it has branch-specific meaning.
- `ACADEMY_MANAGER` is an operational and leadership role, not merely administrative.
- Financial visibility is branch-local/internal. No cross-branch financial visibility.
- Communication can be centralized organizationally, but finance cannot.
- Promotions are never automated.
- Attendance and classes are signals; final promotion decisions remain human.

## Roles and semantics
Roles in this project:
- MESTRE
- ORG_ADMIN
- HEAD_COACH
- ACADEMY_MANAGER
- INSTRUCTOR
- STAFF
- STUDENT

A single person may hold multiple functional responsibilities.
Do not assume one person maps to one simplistic identity in the business domain.

## Communication domain principle
The application must distinguish clearly between:
- organizational communication
- financial management

Communication may flow from central organization to branches and teams.
Finance must remain isolated inside each academy/branch context.

## Attendance domain principle
Attendance is hybrid by design:
- student may express intent to attend
- instructor/staff has final validation of actual presence
- manual correction must always exist

Do not force a rigid reservation-only model unless explicitly requested.

## Promotions domain principle
Promotions must support:
- proposal
- evaluation
- approval
- rejection
- history
- audit trail

The system may help with signals, but it must not auto-promote a student.

When working on promotions:
- follow the chosen federation reference
- do not invent transitions
- do not invent rank equivalences
- if a rule is not confirmed, stop and document the uncertainty instead of guessing

## Federation reference
The current reference base for promotions and graduation logic is IBJJF.
This must be documented in `docs/federation-reference.md`.

Do not implement federation-like rules from memory if not written in repo docs.

## Classes and operations principle
Current domain rule:
- one branch is treated as a single simultaneous operational unit
- therefore overlapping `ClassSession` entries in the same branch are not allowed in the current version

Do not add room/mat/area unless explicitly requested and documented as a domain decision.

## Sensitive modules
These modules/files must not be changed casually:
- auth
- memberships
- promotions
- billing
- prisma/schema.prisma
- tenant isolation model
- branch/public separation
- authorization claim structure

If a task touches these, the change must be justified against repo docs.

## Required validation before considering work done
At minimum, run:
- `pnpm prisma:validate`
- `pnpm prisma:generate`
- `pnpm build`
- `pnpm exec jest --runInBand`

If the change affects critical flows, also run:
- `pnpm test:e2e`

## Working style
- Prefer small, reviewable changes.
- Keep business logic explicit.
- Avoid speculative abstractions.
- Avoid scope creep.
- Do not expand beyond the requested task.
- Do not rewrite stable modules without strong reason.
- Do not silently change domain rules.

## Definition of done
A task is done only if:
- the code compiles
- Prisma remains valid
- required tests still pass
- tenant and branch boundaries remain intact
- the business rule is implemented clearly
- the solution follows the architecture standard
- the solution advances the core product instead of distracting from it

## Final instruction
If the requested change conflicts with documented business rules, architecture rules, or federation rules:
- stop
- explain the conflict
- propose the minimum correct change
- do not improvise