# Architecture

## Purpose
This document defines the architectural standard for the BJJ Ops backend.

This backend is a multi-tenant SaaS platform for:
- a single academy
- a multi-branch organization/team
- future growth into a larger platform without collapsing into a tightly coupled codebase

The architecture must remain:
- readable
- maintainable
- modular
- safe
- migration-friendly toward future service extraction

This repository is **not** allowed to evolve into a giant monolith with business logic scattered across controllers and services.

---

## Architectural style

### Current style
The backend uses a **modular monolith**.

This is the correct current architecture for this stage of the product because:
- the domain is still being consolidated
- business rules are still being formalized
- transactional consistency matters a lot
- we want low operational complexity
- we want strong module boundaries from the start

### Future direction
The codebase must be written so that specific modules can later be extracted into separate services if needed, without rewriting the entire domain model.

This means:
- low coupling between modules
- explicit module boundaries
- no implicit cross-module data access
- no domain rules hidden in random helpers
- no giant service classes that know everything

---

## Standard module structure

Every non-trivial module must follow this structure unless there is a very strong reason not to:

- `controller`
- `application/use-cases`
- `domain/policies`
- `infrastructure/repositories`
- `dto`
- `module`

Example:

~~~text
src/<module>/
  application/
    use-cases/
  domain/
    policies/
  infrastructure/
    repositories/
  dto/
  <module>.controller.ts
  <module>.module.ts
~~~

---

## Responsibilities

### Controllers
Controllers must:
- receive HTTP requests
- validate DTOs
- extract principal/context
- delegate to use cases
- return responses

Controllers must not:
- contain business logic
- query Prisma directly
- decide authorization rules

### Use cases
Use cases orchestrate one business flow.

Examples:
- create organization
- update branch
- approve promotion
- record attendance
- create class session from schedule

Use cases may:
- coordinate repositories
- call policies
- trigger audit logging
- enforce workflow sequencing

Use cases must not:
- become generic service dumps
- duplicate authorization logic across files if a reusable policy exists

### Policies
Policies contain reusable domain and authorization rules.

Examples:
- organization access
- branch visibility
- promotion approval rules
- class overlap rules
- membership target management hierarchy

Policies must:
- be explicit
- be readable
- be close to the domain they govern

Policies must not:
- persist data
- call Prisma directly

### Repositories
Repositories encapsulate persistence and transactional write behavior.

Repositories may:
- read/write through Prisma
- contain selects, includes, filters
- contain transaction boundaries
- contain locking/concurrency handling
- enforce persistence-level integrity behaviors

Repositories must not:
- become business-rule containers
- decide product rules that belong to policies or use cases

### DTOs
DTOs validate API payloads and query shapes.

DTOs must:
- stay small and explicit
- validate only what belongs at the transport boundary

DTOs must not:
- encode business rules that depend on DB state or domain history

---

## Module boundaries

The system must preserve clear feature boundaries.

### Core governance modules
- auth
- organizations
- branches
- public-branches
- memberships
- users
- audit

### Operational modules
- students
- classes
- attendance
- billing
- notifications
- shop

### Progression and athlete modules
- promotions
- competitions
- analytics

### Cross-cutting concerns
- auth
- audit
- request context
- prisma
- config
- logging

Cross-cutting concerns are allowed to be shared.

Business domains are not allowed to dissolve into a generic `common` mess.

---

## Data and tenancy model

### Tenant boundary
`Organization` is the tenant boundary.

Everything sensitive must be constrained by:
- `organizationId`
- branch scope where applicable
- membership scope where applicable

### Branch scope
Branch access is a second-level scope under organization.

A user may:
- have organization-wide access
- have selected-branch access
- have leadership semantics for one branch

All write and read flows must respect:
- tenant isolation
- branch isolation
- role/scope enforcement

---

## Authorization model

Authorization is always backend-enforced.

Authorization decisions must consider:
- principal identity
- organizationId
- membershipId
- assigned roles
- effective scope
- branch access
- role semantics such as `HEAD_COACH` and `ACADEMY_MANAGER`

### Important principle
Do not simplify the domain into “one user = one role = one identity”.

A person may be:
- an academy manager
- also an instructor
- also a student

The model must support multiple responsibilities without collapsing authorization clarity.

---

## Public vs private separation

Public and private data must remain separated.

Examples:
- `Branch` is internal and operational
- `BranchPublicProfile` is public and publishable

Public endpoints must never accidentally expose:
- internal notes
- financial data
- private operational state
- internal evaluation fields
- private contact data unless explicitly marked public

---

## Auditability

Critical actions must be auditable.

At minimum, audit:
- organization changes
- branch changes
- membership role/scope changes
- student changes
- class schedule and class session writes
- attendance writes
- promotion proposal, evaluation, approval, and rejection
- billing-sensitive actions

Audit logs must not be optional for critical flows.

---

## Transaction and consistency strategy

When a business operation requires strong consistency, use:
- repository-level transaction boundaries
- `Serializable` isolation where justified
- explicit locking where justified

This is especially relevant for:
- class session overlap prevention
- attendance bulk upsert by session
- promotion approval updating student state
- future billing and inventory-sensitive flows

### Important constraint
Write integrity should be as strong as possible for writers using this app.

If a future invariant must be global at the database level, prefer a database-native constraint when that becomes necessary.

---

## Current operational domain decisions already assumed

### Classes
- `ClassSchedule` defines recurring class patterns
- `ClassSession` represents real instances
- attendance is recorded against `ClassSession`, never against recurring schedules
- a branch is currently treated as a single simultaneous operational unit
- overlapping class sessions in the same branch are not allowed in the current version
- `room`, `mat`, or `area` is intentionally not modeled yet

### Attendance
- attendance is consolidated attendance per session
- this is not yet a real-time check-in event stream
- future check-in must be modeled explicitly if added

### Promotions
- promotion is a human decision
- evaluation helps but does not auto-promote
- approvals must leave durable history
- approved promotion updates the current student state in the same transaction in the current domain model

---

## Migration-friendly rules

This repository must stay ready for future service extraction.

To support that:
- keep module APIs explicit
- avoid implicit coupling
- keep business logic close to its domain
- centralize cross-cutting concerns
- avoid free-form cross-module imports
- avoid hidden write side effects

When future extraction happens, likely candidates may include:
- notifications
- billing
- analytics
- competitions

This does **not** justify microservices now.

---

## Coding quality rules

All code must be:
- explicit
- boring in a good way
- reviewable
- easy to reason about

Avoid:
- god classes
- clever abstractions
- speculative patterns
- generic repositories for everything
- deep inheritance
- hidden side effects
- duplicated business rules across modules

---

## Validation and completion

A change is not complete unless it:
- follows the module architecture
- preserves tenant and branch safety
- preserves auditability
- compiles
- keeps Prisma valid
- passes required tests
- advances the product instead of creating architectural drift

---

## Architectural review checklist

Before merging a significant change, ask:

1. Does this change preserve module boundaries?
2. Is business logic in use cases and policies, not scattered?
3. Is Prisma encapsulated in repositories?
4. Is authorization backend-enforced and scope-aware?
5. Is tenant isolation preserved?
6. Is branch isolation preserved?
7. Are critical writes auditable?
8. Is the code easier to maintain after this change, not harder?
9. Does this keep the codebase migration-friendly for future service extraction?