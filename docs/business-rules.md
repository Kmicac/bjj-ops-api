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

The platform must be useful both for:
- a standalone academy
- a multi-branch team with centralized governance and local branch autonomy

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
- operational reminders
- campaign and community messages

The platform must support top-down communication across the organizational hierarchy.

### Finance and payments
Financial visibility is local/internal to each branch or academy.

Rules:
- no cross-branch financial visibility
- one academy must not see the finances of another academy
- economic data must not be centralized in a way that creates resistance or mistrust
- the platform may manage payments, statuses, and branch-level administrative finance, but must not expose private branch accounting across the organization

This separation between communication and finance is a product trust requirement.

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
- local classes
- local financial operations
- local billing policies
- local administrative workflows

### Public profile
A branch may publish selected public-facing information, but public data must remain separate from internal branch data.

Public branch profile may include, depending on policy:
- academy identity
- bios of professors
- contact information
- public schedules
- social media
- public location details

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

Typical powers:
- global organizational visibility
- central approval authority for sensitive promotions
- branch oversight
- strategic organizational metrics
- institutional governance

#### ORG_ADMIN
Organization-wide administrative authority with broad internal powers.

Typical powers:
- organization configuration
- branch administration
- internal operational governance
- permissions and administrative control within organization policy

#### HEAD_COACH
Operational and technical leadership role with branch-sensitive meaning.
This is not just a generic title.

Typical powers:
- review of academy operation
- class and training oversight
- promotion review and approval where policy allows
- broad operational visibility according to scope
- no automatic visibility into private finance of unrelated branches

#### ACADEMY_MANAGER
Operational and administrative responsible person for an academy.
This role is not merely clerical. It may combine administrative and operational responsibility.

Typical powers:
- local academy administration
- local operational control
- attendance oversight
- branch-level workflows
- local billing-related actions according to policy
- promotion initiation/review where policy allows

#### INSTRUCTOR
Operational role focused on training execution and local class-level actions.

Typical powers:
- attendance handling
- class execution
- operational tasks
- promotion proposal where policy allows

Typical limitations:
- no broad strategic visibility
- no cross-branch finance visibility
- no authority beyond defined scope

#### STAFF
Administrative/operational support role with limited permissions.

Typical powers:
- selected attendance tasks
- selected billing/admin tasks
- local operational support according to policy

#### STUDENT
End user/student role with self-service and personal-profile interactions only.

Typical powers:
- manage personal profile data where allowed
- express attendance intent
- see own information and allowed public branch/team information
- selected self-service actions

### Important rule
One person may have multiple responsibilities.
The system must not assume a simplistic single-role identity.

The permission model must support:
- one person with multiple functional roles
- scoped access
- branch-specific and organization-wide differences
without collapsing clarity or security

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

#### Operational metrics
Non-financial metrics may be visible more broadly than finance if policy allows, for example:
- student counts
- attendance patterns
- growth
- retention
- class utilization

This is allowed because the founders explicitly consider centralized non-financial insight valuable.

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
- branch coordination

The platform should support selecting relevant audiences rather than broadcasting every message to every role.

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

### Practical attendance modes the product should support
- manual confirmation by instructor
- student self-registration via QR
- student self-registration via code / kiosk / tablet
- hybrid attendance where students self-register and instructor corrects or completes the record

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

### Class types
The platform should support configurable or controlled class types such as:
- BJJ Gi
- BJJ No-Gi
- Fundamentals
- Advanced
- Kids
- Competition
- Open Mat

Future additions should not break the core model.

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
- help the reviewer decide better

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

### Belt promotions vs stripes
The founders explicitly distinguish:
- local or lower-level grade/stripe progression
- formal belt promotion workflow

The system must support formal workflow and traceability for belt promotions.

### Certificates and diplomas
The platform should support:
- promotion request flow
- authorization linkage
- certificate/diploma generation
- historical traceability of the decision

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

The federation reference acts as a consistency baseline, not as an automation engine.

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

### Student profile expectations
The student domain should support:
- personal data
- BJJ start date
- current rank/track/stripes
- promotion history
- attendance history
- technical notes
- future competition history
- billing/membership status
- pause/freeze states
- parent/tutor support for kids where required

---

## Billing, payments, and access rules

### Payment infrastructure
The platform may coexist with:
- manual payments
- external payment platforms
- integrated payment flows in the future

Expected future integrations include:
- Mercado Pago
- Takenos

### Financial separation rule
The app must not become a tool for exposing private branch accounting across the organization.

### Local branch finance
Billing and student payment administration are branch-local/internal concerns by default.

### Platform charging model
The product must be sustainable as a SaaS.
The platform’s own charging model is separate from internal academy cash handling.

The founders explicitly want the platform to support:
- academy-level/platform-level charging
- notifications of overdue payments
- possible restriction or limitation of service when payment policy is violated

### Access control by payment state
A business policy may restrict app usage if a person or academy is not up to date according to the selected billing model.

This may include restricting:
- attendance registration
- active use of selected platform features
- selected operational flows

This must be implemented explicitly, not inferred casually.

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
- growth trends
- class occupancy
- academy health indicators

These metrics must not violate financial privacy boundaries between branches.

### Strategic value
The founders explicitly want the platform to evolve beyond administration and support:
- summaries
- reports
- strategic visibility
- future AI-assisted recommendations and analysis

---

## Benchmark and positioning

The product is intentionally positioned beyond small single-academy tools.

Compared to simpler academy apps, this platform aims to support:
- full academies
- branch networks
- centralized communication
- stronger operational governance
- richer progression and analytics
- future product/store and organizational intelligence layers

The product must remain viable for:
- small academies
- large organizations
- mixed growth stages

---

## Adoption and trust rule

Any feature that risks reducing trust between branches or leaders must be treated cautiously.

Examples:
- cross-branch finance exposure
- hidden authority changes
- unclear promotion authority
- opaque attendance overrides
- brittle workflows that do not match real academy operation

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