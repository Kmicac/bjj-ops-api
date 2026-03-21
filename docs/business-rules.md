---

# `docs/business-rules.md`

# Business Rules

## Purpose
This document defines the current business rules for the BJJ Ops platform.

If a rule is not written here or in `docs/domain-decisions.md`, it must not be invented casually by code changes.

---

## Product scope

The platform supports:
- single academies
- organizations/teams with multiple branches
- centralized organizational communication
- branch-local financial management
- student progression workflows
- class operations
- attendance
- future competitive and analytical layers

The product is not only a management tool.
It is intended to professionalize academy and organization operations.

---

## Core separation of concerns

### Organizational communication
Communication is centralizable and can flow from the top of the structure toward academies, instructors, staff, and in some cases students.

Examples:
- event announcements
- institutional communication
- product/apparel communication
- team-wide notices
- engagement messages across branches

### Finance and payments
Financial visibility is local/internal to each branch or academy.

Rules:
- no cross-branch financial visibility
- one academy must not see the finances of another academy
- economic data must not be centralized in a way that creates resistance or mistrust
- the platform may manage payments, statuses, and branch-level administrative finance, but not expose private branch accounting across the organization

---

## Organization model

### Organization
An `Organization` is the tenant boundary.

Every account exists inside an organization, even if the organization has only one branch.

### Branch
A `Branch` belongs to exactly one `Organization`.

A branch may have:
- internal operational data
- public profile data
- local staff
- local students
- local financial operations

### Public profile
A branch may publish selected public-facing information, but public data must remain separate from internal branch data.

---

## Hierarchy and roles

Current business roles:
- MESTRE
- ORG_ADMIN
- HEAD_COACH
- ACADEMY_MANAGER
- INSTRUCTOR
- STAFF
- STUDENT

### Semantics
#### MESTRE
Highest central authority in the organization.

#### ORG_ADMIN
Organization-wide administrative authority with broad internal powers.

#### HEAD_COACH
Operational and technical leadership role with branch-sensitive meaning.
This is not just a generic title.

#### ACADEMY_MANAGER
Operational and administrative responsible person for an academy.
This role is not merely clerical. It may combine administrative and operational responsibility.

#### INSTRUCTOR
Operational role focused on training execution and local class-level actions.

#### STAFF
Administrative/operational support role with limited permissions.

#### STUDENT
End user/student role with self-service and personal-profile interactions only.

### Important rule
One person may have multiple responsibilities.
The system must not assume a simplistic single-role identity.

---

## Permissions and visibility

### General rule
All permissions are backend-enforced.

### Scope model
Permissions are evaluated using:
- organization
- membership
- assigned roles
- scope type
- branch access
- special branch leadership semantics where applicable

### Data visibility
#### Students
A user must not see students outside allowed branch/organization scope.

#### Finance
Finance must remain isolated within branch-local/internal boundaries.

#### Public branch data
Public branch information may be visible externally, but private branch internals may not be exposed.

---

## Attendance rules

Attendance is a hybrid process.

### Current principle
- a student may indicate attendance intent
- teaching/admin staff have the final say on actual presence
- manual correction must always exist

### Operational expectations
- students should not be able to bulk-mark attendance for an entire month at once
- late attendance self-marking should be restricted after class start
- weekly planning may exist
- teachers/staff must be able to fix attendance mistakes afterward

### Current modeling rule
Attendance is recorded against `ClassSession`, not against `ClassSchedule`.

---

## Classes rules

### Schedule vs session
- `ClassSchedule` = recurring schedule definition
- `ClassSession` = actual concrete class occurrence

### Branch operation rule
In the current version:
- a branch is treated as a single simultaneous operational unit
- overlapping class sessions in the same branch are not allowed

This rule may change in the future if room/mat/area is modeled explicitly.

### Instructor assignment
Classes and sessions must be tied to an instructor through membership-aware identity, not loose unscoped identity.

---

## Promotions rules

### Core principle
Promotions are not automated.

The platform may:
- gather signals
- structure evaluation
- validate consistency
- enforce authorization
- keep history
- generate traceability

The platform must not:
- auto-promote students
- replace human decision making

### Promotion workflow
A promotion must support:
- proposal
- evaluation
- approval
- rejection
- history
- audit trail

### Evaluation
Promotion evaluation must include:
- automatic signals already available in the system
- technical assessment
- attitude/discipline assessment
- coach notes
- recommendation

### Authority
- proposal can begin at local operational levels according to policy
- approval authority depends on promotion type and organizational hierarchy
- central authority remains required for sensitive approvals

### History
Promotion history must never be lost.
Approval updates the student’s current state in the current domain model.

---

## Federation rule reference
Promotion and graduation logic must follow the reference defined in `docs/federation-reference.md`.

No one may invent:
- rank transitions
- equivalences
- belt progressions
- kids/adult transitions
without grounding them in the chosen reference.

---

## Student rules

### Identity
A student is a first-class domain entity.
A student may or may not be linked to a login user.

### Branch membership
A student belongs to an organization and has a primary branch.

### History preservation
When a student changes primary branch:
- the student remains the same entity
- history must be preserved
- context snapshots should preserve historical visibility where needed

### Temporary visits
Cross-branch participation within the same organization may exist in operations, but formal visit modeling may be introduced later.

---

## Communication rules

The platform must support top-down communication across the organization.

Possible recipients:
- academy leaders
- instructors
- staff
- selected student audiences where appropriate

Communication must support:
- general announcements
- events
- institutional notices
- product/apparel communication
- team engagement

---

## Payments and access rules

### Payment infrastructure
The platform may coexist with:
- manual payments
- external payment platforms
- integrated payment flows in the future

### Access control by payment state
A business policy may restrict app usage if a person or academy is not up to date according to the selected billing model.

### Platform charging model
The product must be sustainable as a SaaS.
The platform’s own charging model is separate from internal academy cash handling.

---

## Metrics and professionalization

The platform should help academies and organizations professionalize operations.

Potential metrics:
- student retention
- student churn
- attendance patterns
- beginner drop-off
- class engagement
- branch activity
- operational health

These metrics must not violate financial privacy boundaries between branches.

---

## Adoption and trust rule

Any feature that risks reducing trust between branches or leaders must be treated cautiously.

Examples:
- cross-branch finance exposure
- hidden authority changes
- unclear promotion authority
- opaque attendance overrides

Operational trust is a product requirement.

---

## Roadmap priority rules
When in doubt, prioritize:
1. security and isolation
2. business-rule correctness
3. operational usability
4. maintainability
5. product polish

Do not trade away trust or domain clarity for feature speed.