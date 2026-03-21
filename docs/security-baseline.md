# Security Baseline

## Purpose
This document defines the mandatory security baseline for the BJJ Ops backend.

This backend is a multi-tenant SaaS platform with sensitive organizational, student, attendance, promotion, and future billing data.
Security is not optional and must be treated as a product requirement.

This document must be read together with:
- `AGENTS.md`
- `docs/architecture.md`
- `docs/business-rules.md`
- `docs/domain-decisions.md`

---

## Security references
The current security baseline is aligned to:
- OWASP Top 10 (current official released version)
- OWASP API Security Top 10

These references are used as security guardrails for:
- architecture
- API design
- authorization
- data exposure prevention
- validation
- operational hardening

---

## Core security principles

### 1. Backend is the source of truth
Never trust the frontend for:
- authorization
- tenant boundaries
- branch boundaries
- sensitive state transitions
- role escalation checks

All security-sensitive validation must happen in backend.

### 2. Tenant isolation is mandatory
`Organization` is the tenant boundary.

No endpoint, query, mutation, or background job may expose or mutate data across organizations unless the operation is explicitly designed and authorized to do so.

### 3. Branch isolation is mandatory
Within an organization, branch scope must also be enforced where applicable.

A principal may be:
- organization-wide
- branch-scoped
- branch-leadership scoped

The backend must enforce this on every relevant read and write path.

### 4. Least privilege
Every role and scope must only allow the minimum necessary actions.

Do not grant broad visibility or write access “for convenience”.

### 5. Auditability
Critical actions must leave an audit trail.

At minimum, audit:
- membership and role changes
- branch changes
- student changes
- class session writes
- attendance writes
- promotions workflow
- future billing-sensitive actions

### 6. Public/private separation
Public-facing data must remain separated from internal operational data.

Never expose internal notes, financial data, internal evaluations, or private contacts through public endpoints unless explicitly designated as public.

---

## Threat priorities for this product

### A. Broken access control
This is the highest priority class of risk for this platform.

Examples:
- a user seeing students from another organization
- a branch-scoped actor reading organization-wide data
- a user modifying memberships outside their scope
- a user approving promotions they should not control

### B. BOLA / IDOR
Never trust entity IDs alone.

Every resource lookup must be constrained by:
- `organizationId`
- branch scope when relevant
- role/scope rules
- business ownership context

Examples:
- `studentId`
- `promotionId`
- `classSessionId`
- `attendanceRecordId`
- `membershipId`

must never be fetched or mutated by ID only without contextual scoping.

### C. Sensitive data exposure
Treat these as sensitive by default:
- payment/billing information
- internal branch finance
- internal evaluation notes
- internal audit metadata
- private student data
- private contact data
- future competition/internal performance notes

### D. Security misconfiguration
Do not weaken:
- CORS
- headers
- request validation
- auth middleware
- logging redaction
- production env handling
- secrets management

### E. Injection and unsafe query behavior
Use Prisma safely and avoid unsafe raw SQL unless strictly necessary and reviewed.
Validate and normalize all user input before use.

### F. Excessive resource consumption
Use:
- pagination
- constrained filters
- scoped queries
- defensive defaults

Do not expose unbounded list endpoints.

---

## Mandatory security rules by area

## Authentication
- Use secure password hashing.
- Never store raw passwords.
- Never log credentials or secrets.
- Tokens must contain only the minimum necessary claims.
- Sensitive auth semantics must not be changed casually.

## Authorization
Authorization must be explicit and enforced in backend.

Every sensitive flow must validate:
- principal
- organization
- membership
- assigned roles
- effective scope
- branch access
- special domain semantics where applicable

Do not duplicate authorization logic chaotically across modules.
Use policies and reusable access-control logic.

## Input validation
All externally supplied data must be validated at the transport boundary.

Use DTO validation for:
- body
- query params
- route params

Business-state validation that depends on DB/domain history must happen in use cases/policies/repositories as appropriate.

## Data access
Repositories must enforce context-aware reads and writes.

Do not:
- query by raw ID only in sensitive flows
- return broad data sets without scoping
- leak internal fields in response shapes

Prefer explicit `select` fields.

## Transactions and consistency
When write integrity matters, use:
- transactions
- appropriate isolation
- locking where necessary
- durable audit behavior

Examples:
- class session overlap protection
- attendance bulk writes
- promotion approval updating student state
- future billing/inventory-sensitive writes

## Logging
Logs must be useful but not dangerous.

Do not log:
- passwords
- tokens
- secrets
- payment secrets
- sensitive private notes
- personally sensitive fields without need

Log:
- request identifiers
- actor context where appropriate
- security-relevant failures
- audit-worthy actions through audit systems

## Error handling
Errors returned to clients must not leak internal implementation details.

Do not expose:
- stack traces
- raw SQL details
- secrets
- internal env info
- security-sensitive internals

---

## Security rules by business domain

## Organizations / Branches
- Never expose cross-tenant internal state.
- Public branch data must remain isolated from internal branch data.
- Branch leadership semantics must not be flattened casually.

## Memberships
- Role assignment is high sensitivity.
- Scope updates are high sensitivity.
- Prevent privilege escalation.
- Prevent branch-scoped actors from performing org-wide actions unless explicitly allowed.

## Students
- Student visibility must be branch-safe and tenant-safe.
- Branch changes must preserve history without leaking access incorrectly.
- Optional user linkage must not create unauthorized visibility.

## Classes
- Class operations must be branch-safe.
- Overlap enforcement and session mutation must not bypass tenant/scope checks.
- Public schedule exposure must never reuse internal write models blindly.

## Attendance
- Attendance writes must be constrained to the correct session and branch scope.
- Attendance must not be writable across tenant/branch boundaries.
- Future check-in features must not weaken attendance integrity.

## Promotions
- Promotions are sensitive.
- Approval authority must be explicit.
- Federation-backed rules must not be invented.
- Evaluation notes are internal/private by default.
- Approval/rejection must always be auditable.

## Billing
Billing is extremely sensitive.
When implemented:
- branch-local visibility only unless explicitly designed otherwise
- stronger review before merge
- no cross-branch finance exposure
- no convenience shortcuts around authorization

---

## Review checklist for any significant change
Before approving a change, check:

1. Can this expose data across organizations?
2. Can this expose data across branches?
3. Can this create privilege escalation?
4. Can this bypass role/scope checks?
5. Can this leak sensitive fields in responses?
6. Can this create unsafe writes under concurrency?
7. Does it require audit logging?
8. Does it introduce unbounded or expensive queries?
9. Does it weaken CORS, auth, headers, or validation?
10. Does it contradict business-rule docs?

If any answer is “yes” or “maybe”, the change must be reviewed more deeply before merge.

---

## Change control
The following areas are security-sensitive and must not be changed casually:
- auth
- memberships
- promotions
- billing
- `schema.prisma`
- tenant isolation logic
- authorization claims
- public/private data boundaries

Any change here must be justified explicitly.

---

## Final rule
If a rule is unclear:
- do not guess
- do not weaken security for convenience
- document the uncertainty
- choose the minimum safe behavior