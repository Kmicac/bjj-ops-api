# Domain Decisions

## Purpose

This file records explicit decisions already taken for the current version of the product.

If a future change conflicts with one of these decisions, the change must first update this file and explain why.

---

## Governance decisions

### DD-001 — Organization is the tenant boundary

Status: accepted

Reason:
All critical security and visibility decisions depend on tenant isolation.

Implication:
No module may leak data across organizations.

---

### DD-002 — Branch is a subordinate operational scope

Status: accepted

Reason:
The platform serves multisede organizations and single academies alike.

Implication:
Branch-level access is enforced inside an organization.

---

### DD-003 — Public branch data is separate from internal branch data

Status: accepted

Reason:
Public visibility and internal operation have different exposure requirements.

Implication:
Public profile information must be modeled separately from internal operational branch state.

---

## Role and hierarchy decisions

### DD-004 — Official role naming uses HEAD_COACH and ACADEMY_MANAGER

Status: accepted

Reason:
These are the official role names already established in the codebase and product semantics.
Alternative naming ideas discussed externally do not replace the current official domain language.

Implication:
Use `HEAD_COACH` and `ACADEMY_MANAGER` consistently in code, docs, permissions, and product design.

---

### DD-005 — A person may hold multiple functional responsibilities

Status: accepted

Reason:
Real academy operations do not map cleanly to one simplistic role per human.

Implication:
Do not hardcode an overly rigid one-person/one-role mental model.

---

### DD-006 — HEAD_COACH is not a generic freely assignable semantic

Status: accepted

Reason:
HEAD_COACH has specific branch-leadership meaning and broader technical/operational significance.

Implication:
Do not flatten HEAD_COACH into a generic org-level label with no branch semantics.

---

### DD-007 — ACADEMY_MANAGER is an operational and administrative leadership role

Status: accepted

Reason:
The role is intended to represent the responsible leader of an academy, not a merely clerical admin position.

Implication:
ACADEMY_MANAGER may participate in academy operations, administration, and review workflows according to policy.

---

## Communication and finance decisions

### DD-008 — Communication and finance are intentionally separate product domains

Status: accepted

Reason:
Organizational communication benefits from centralized flow across branches.
Financial visibility across branches would reduce trust and adoption.

Implication:
The platform may centralize communication, but financial management must remain local/internal by branch unless a future explicitly designed feature states otherwise.

---

### DD-009 — Communication may flow top-down through the organizational pyramid

Status: accepted

Reason:
The founders explicitly want a pyramid-like communication model:
academy/dojo → branch network → central leadership.

Implication:
The product must support centralized communication flowing downward to:

- head coaches
- academy managers
- instructors
- staff
- selected student audiences where appropriate

---

### DD-010 — Financial visibility remains branch-local by default

Status: accepted

Reason:
Cross-branch financial exposure would create distrust and harm adoption.

Implication:
Future billing and financial modules must preserve branch-local visibility unless a feature is explicitly and safely designed otherwise.

---

## Student decisions

### DD-011 — Student is a core domain entity, not merely a profile

Status: accepted

Reason:
The student is central to classes, attendance, promotions, and future competition history.

Implication:
Student remains a first-class business object even when linked to a user account.

---

### DD-012 — Changing primary branch does not create a new student

Status: accepted

Reason:
The person and their history remain continuous.

Implication:
Branch changes must preserve student identity and history.

---

### DD-013 — Temporary cross-branch participation may exist before formal visit modeling

Status: accepted

Reason:
Real academy/team operation may involve students training temporarily in another branch.

Implication:
The domain may temporarily allow limited cross-branch operational participation while a formal visit model is still pending.

---

## Classes and attendance decisions

### DD-014 — One branch is currently treated as a single simultaneous operational unit

Status: accepted

Reason:
This keeps scheduling, attendance, and future operational logic simple and safe for the current version.

Implication:
Overlapping `ClassSession` entries in the same branch are invalid in the current version.

Future:
If multi-mat or multi-room is needed, introduce an explicit entity such as `BranchRoom`, `TrainingArea`, or equivalent.

---

### DD-015 — Attendance is recorded against ClassSession, not ClassSchedule

Status: accepted

Reason:
Recurring schedule is not the same as actual attendance-bearing class execution.

Implication:
Attendance must always point to a real session instance.

---

### DD-016 — Attendance remains a hybrid validation model

Status: accepted

Reason:
Real academy operation requires flexibility and correction.
A rigid reservation-only model was rejected.

Implication:
Students may express attendance intent, but final attendance validity belongs to authorized staff/instructors, and manual correction must always exist.

---

### DD-017 — Attendance is currently consolidated attendance, not real-time check-in events

Status: accepted

Reason:
The current product need is reliable recorded attendance.
Real-time check-in is a future concern.

Implication:
If real-time check-in is added later, it must be modeled explicitly and not silently overloaded into AttendanceRecord.

---

## Promotions decisions

### DD-018 — Promotions are human-decided workflows

Status: accepted

Reason:
The platform should assist and structure the decision, not replace the instructor/head coach/mestre.

Implication:
Never auto-promote students.

---

### DD-019 — Belt promotions require formal workflow and traceability

Status: accepted

Reason:
Promotions must not remain informal or happen without historical record and authorization trace.

Implication:
Promotion request, evaluation, approval/rejection, and certificate/diploma generation must remain part of the formal domain flow.

---

### DD-020 — Promotion history must remain durable and auditable

Status: accepted

Reason:
Promotions are institutionally meaningful and must not become informal or untraceable.

Implication:
Proposal, evaluation, approval, rejection, and historical snapshots must remain recorded.

---

### DD-021 — Approved promotions update the student’s current state in the same transaction

Status: accepted

Reason:
Separating approved history from current state would create operational inconsistency in the current version.

Implication:
Promotion approval must atomically update workflow history and current student rank/stripe state.

---

### DD-022 — Promotion rules must follow the chosen federation reference

Status: accepted

Reason:
The system must not invent transitions or graduation semantics.

Implication:
Promotion code must follow `docs/federation-reference.md`.

---

### DD-023 — Promotion evaluation must remain assistive, not bureaucratic

Status: accepted

Reason:
The goal is to help professor/head coach/mestre decide better, not create a rigid scoring bureaucracy.

Implication:
Evaluation sheets may structure context and signals, but final promotion remains a human decision.

---

## Billing and platform access decisions

### DD-024 — Billing and student collections are separate concerns from platform charging

Status: accepted

Reason:
The SaaS business model and the academy’s own cash flow are not the same thing.

Implication:
The platform may support branch-local student billing while also supporting separate platform subscription logic for academies/organizations.

---

### DD-025 — Payment status may limit platform functionality according to policy

Status: accepted

Reason:
The founders want the product to support a stricter access policy tied to payment status where appropriate.

Implication:
Future billing policy may limit selected functionality for unpaid students or academies, but this must be implemented explicitly and safely.

---

## Analytics and strategy decisions

### DD-026 — Platform value includes professionalization through analytics

Status: accepted

Reason:
The platform is intended to provide management intelligence, not only record keeping.

Implication:
Retention, attendance, academy health, churn, and operational metrics are first-class product goals, as long as privacy boundaries are preserved.

---

### DD-027 — The product is designed for both single academies and large branch organizations from the start

Status: accepted

Reason:
The platform must serve both isolated academies and large structured teams without rethinking the core model later.

Implication:
Organization, branch, permissions, communication, promotions, classes, billing, and analytics must all be modeled with both use cases in mind.

---

## Architecture decisions

### DD-028 — The repository architecture standard is mandatory

Status: accepted

Reason:
The codebase must remain readable, maintainable, and migration-friendly.

Implication:
Modules must follow:

- controller
- application/use-cases
- domain/policies
- infrastructure/repositories
- dto
- module

---

### DD-029 — Repositories may own transaction boundaries, but not domain-rule ownership

Status: accepted

Reason:
Write integrity often requires transaction and locking logic close to persistence.
Business rules still belong in use cases and policies.

Implication:
Avoid moving domain semantics into repositories under the excuse of persistence.

---

### DD-030 — Do not invent undocumented business rules in code

Status: accepted

Reason:
The project suffered from prompt drift and inferred rules.
The repo must become the source of truth.

Implication:
If a rule is unclear, document uncertainty and stop. Do not guess.

---

### DD-031 — Student financial status in billing is a derived branch-local operational state

Status: accepted

Reason:
Billing phase 2 needs an actionable backend-ready status for overdue handling and operational restrictions without introducing a persisted ledger state machine.

Implication:

- Student financial status remains derived, not persisted.
- The current derived statuses are `CURRENT`, `DUE_SOON`, `OVERDUE`, `RESTRICTED`, and `FROZEN`.
- `DUE_SOON` uses a fixed 5-day operational window in the current version.
- `RESTRICTED` is derived from overdue charges plus active branch billing-policy restriction flags.
- `FROZEN` reflects a frozen membership only when there is no overdue state taking precedence.
- This logic remains branch-local and must not become a cross-branch financial view.

---

### DD-032 — Mercado Pago reconciliation remains minimal, branch-local, and billing-owned

Status: accepted

Reason:
The current product stage needs webhook-driven payment reconciliation without opening a full settlement engine, ledger, refund workflow, or cross-module ownership drift.

Implication:

- `integrations` validates authenticity, fetches provider resources, normalizes payloads, and stores webhook traceability.
- `billing` decides whether a Mercado Pago `payment` creates or updates a `PaymentRecord` and whether it impacts `BillingCharge`.
- Mercado Pago checkout preference links for a `BillingCharge` are treated as single-link records per integration connection; concurrent preference creation must converge on reuse instead of storing multiple internal links for the same charge.
- Internal confirmation is limited to Mercado Pago payments whose top-level status is `approved`, except refund/chargeback-like states that remain only observed until a dedicated reversal flow exists.
- Mercado Pago statuses `pending`, `authorized`, `in_process`, and `in_mediation` are observed internally as pending payment attempts and must not increase `BillingCharge.amountPaid`.
- Mercado Pago statuses `rejected` and `cancelled` are recorded as non-confirmed payment attempts and must not confirm collection.
- Refund and chargeback handling remains intentionally out of scope for this iteration; those states may be traced but must not silently mutate internal settled amounts.
- System-originated `PaymentRecord` entries may exist without a human `recordedByMembershipId`.

---

### DD-033 — Webhook event operations stay inside integrations and use derived recoverability

Status: accepted

Reason:
Operations need a safe way to inspect and retry webhook events without introducing a queue framework, a new operational service, or provider secrets exposure.

Implication:

- Administrative webhook-event listing and detail remain inside `integrations`.
- Recoverability is derived from trusted internal state (`validationStatus`, `processingStatus`, and known processing reasons), not from user input.
- Invalid or untrusted webhook events must never become reprocessable.
- Successfully processed events are not considered operationally recoverable by default.
- Operational responses must expose enough diagnostic context for support work, but must not expose secrets, raw signature headers, or integration configuration.

---

## Future decisions intentionally left open

These are intentionally not closed yet:

- room/mat/area modeling
- real-time attendance check-in model
- formal temporary visits model
- advanced competition record model
- Smoothcomp integration strategy and competition import workflow
- organization-specific configurable graduation variants
- advanced billing integrations
- shop checkout online
- multi-service extraction plan

These should not be implemented casually.
