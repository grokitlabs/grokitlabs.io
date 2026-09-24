---
# GENERATED from consulting/case-studies/graphql-turnaround.md — do not edit
title: "The GraphQL turnaround"
slug: "graphql-turnaround"
tags: [Leadership & judgment, Delivery & turnaround]
capacity: "Employee"
role: "Senior Engineer"
summary: "Turned a failing, unowned platform into one a fresh team could own, and unblocked the launch."
draft: true
has_machine: true
machine: |
  The platform began as a ruby GraphQL spike for a front-end rewrite and was
  deployed to production as a skunkworks project, until the org tipped into
  committing to GraphQL company-wide without a plan for how or who would own it.
  The code wasn't idiomatic ruby: high complexity, little test coverage,
  experimental code running in production, no schema-change governance, and an
  on-call load that wasn't sustainable. With a team of 2 and no owned artifacts, no
  one could stabilize it or onboard anyone new. The result was poor reliability and delivery, an unstable, unowned shared platform the whole product depended on. The turnaround was as much technical as organizational: performance tooling that made the gains measurable (a >30% improvement across GraphQL), a schema-change governance process so changes stopped breaking downstream teams, and onboarding docs deep enough that a team with zero stack experience could take it over.
---
At a major tech company, a GraphQL platform that had started as a
front-end-rewrite spike had become the thing everyone's work depended on, and it
was failing. The new product's launch rode on it, timed to the company's flagship
conference, but the platform was unstable, unowned, and distrusted by the teams
that had to build on it. The organization had committed to GraphQL without a plan
for how, a skunkworks project had become production with no owner, and the one
engineer who held it couldn't stabilize it. Surfacing that without blame was the
hard part.

I treated it as mostly an organizational turnaround, done from a
principal-engineer role, leadership without the title. I grew the team from 2 to
15 by making the graph everyone's to work on rather than one team's burden, and
repaired the strained relationship with the client teams through clear
communication and boundaries. The new product launched at the flagship
conference, on a platform that was finally stable, governed, and ownable by a
fresh team.
