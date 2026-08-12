---
# GENERATED from consulting/case-studies/social-network-integration.md — do not edit
title: "Adding a second network, on time"
slug: "social-network-integration"
tags: [Leadership & judgment, Delivery & turnaround]
capacity: "Employee"
role: "Senior Director, Engineering"
summary: "Added Facebook to a Twitter-only product through a large refactoring, delivered on time while growing the team from 3 to 10."
draft: true
has_machine: true
machine: |
  Adding a second network to a single-network product touches the core model:
  accounts, messages, and workflows had all assumed one network's shape, and Twitter
  and Facebook do not share one. `[the abstraction introduced for multiple networks,
  the stack, what the "large refactoring" concretely changed, your input.]` The
  part that kept both the quality and the date was making that refactor legible
  enough that seven new engineers could work in it without stalling, growing the
  team and shipping the integration were the same problem.
---
A social-media management product had grown up Twitter-only, and the business
needed it to support Facebook. That was not a feature bolt-on. Supporting a
second network meant a large product refactoring, and it had to land on a date.
At the same time the team had to grow from 3 to 10 to carry the work. I led
engineering through both at once, and we shipped Facebook support on time and at
a high quality bar, without the refactoring turning into the usual rewrite that
slips. `[scale / usage numbers, your input]`
