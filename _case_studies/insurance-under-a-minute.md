---
# GENERATED from consulting/case-studies/insurance-platform-under-a-minute.md — do not edit
title: "A policy quoted and sold in under a minute"
slug: "insurance-under-a-minute"
tags: [Leadership & judgment, Delivery & turnaround]
capacity: "Employee"
role: "CTO"
summary: "Built an insurance platform that quoted and bound a policy in under a minute, chosen stack and all, as the CTO of an early-stage startup."
draft: true
has_machine: true
machine: |
  A sub-one-minute quote-and-bind flow is, in practice, an orchestration problem:
  the platform is mostly integrations with insurance and data providers
  (LexisNexis, Socotra, and others), so it was engineered around that reality. I
  chose Rails 6.x with Hotwire on the front end deliberately, for build speed and
  low complexity, so a small team could move and new engineers could get productive
  fast. Because everything is external calls and long-running work, it leaned
  heavily on Sidekiq. Build and test ran on GitHub; production deployed through
  Cloud 66 to DigitalOcean or AWS. `[the hardest integration or the data model, your input]`
---
As CTO of an early insurance startup, I built a platform that could quote and
sell a policy in under a minute with almost no input from the customer. I led
development with two contractors on my strategic technical direction, and I chose
the stack for speed and low complexity so we could ship fast and onboard people
easily. In April 2022 the business pivoted away from quoting its own policies to
reselling other companies', and the platform I had built was no longer the
product. `[outcome / any metrics, your input]`
