# Federation Reference

## Purpose
This document defines the federation rule reference used by the platform for promotions and graduation logic.

This file exists to prevent the codebase from inventing rank transitions, age-track assumptions, or promotion semantics from memory.

---

## Current reference base
The current reference base for promotion and graduation logic is:

- IBJJF Graduation System
- IBJJF Kids Graduation System

This is the official baseline for:
- rank and graduation semantics
- kids graduation structure
- progression-related validation guardrails
- age-sensitive graduation interpretation where applicable

---

## Scope of use in the platform

The platform uses the federation reference to:
- constrain invalid promotion states
- validate rank/track consistency
- avoid invented transitions
- guide the design of promotion catalogs and promotion guardrails

The platform does **not** use the federation reference to:
- auto-promote athletes
- replace professor/head coach/mestre judgment
- force a rigid competition-only interpretation of promotions

The platform is an operational and governance system.
Federation reference acts as a consistency baseline, not an automation engine.

---

## Rules for developers and agents

### Mandatory rule
Do not invent:
- rank transitions
- kids-to-adult transitions
- belt equivalences
- age cutoffs
- stripe semantics
- progression jumps

unless they are:
- explicitly supported by the chosen federation reference, or
- explicitly documented as a conscious product decision in `docs/domain-decisions.md`

### If a rule is unclear
If the federation reference is unclear for a use case:
1. do not guess
2. document the uncertainty
3. implement the minimum safe restriction
4. request explicit product/domain clarification before widening logic

---

## Product interpretation rule
Federation reference is a **baseline constraint**, not a product identity.

That means:
- we follow the official graduation structure as our default rule foundation
- we do not let the code invent alternatives casually
- we may later support organization-level variants, but not before that is explicitly designed

---

## Kids and adult tracks
The platform must be designed with the understanding that:
- kids graduation exists as its own official system
- adult graduation exists as its own official system
- code must not flatten these into one arbitrary free-form string model

If the implementation uses tracks, catalogs, or rank metadata, those structures must be aligned with the reference baseline.

---

## Human authority remains primary
Even when federation-based validation exists:
- promotion proposal is still human
- evaluation is still human
- approval is still human

The platform may:
- reject invalid states
- guide valid options
- provide structured workflows

The platform may not:
- treat federation rules as automatic promotion decisions

---

## Change control
Any change to:
- promotion tracks
- rank catalogs
- age/track validation
- stripe progression assumptions
- kids/adult transition logic

must be reviewed against this document and the source reference before code changes are accepted.

---

## Documentation requirement
Whenever promotion logic is changed, the change must state:
- which federation-based rule it follows
- whether the rule is directly enforced or only used as a guardrail
- whether the change is reference-based or a product-specific decision

If it is a product-specific decision, it must also be recorded in `docs/domain-decisions.md`.