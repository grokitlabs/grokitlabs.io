---
# GENERATED from consulting/case-studies/single-point-of-failure.md — do not edit
title: "Removing the single biggest point of failure"
slug: "single-biggest-point-of-failure"
tags: [Reliability & scale]
capacity: "Employee"
role: "Engineering Director"
summary: "Moved the system of record off an overloaded production database before it could take the business down."
draft: true
has_machine: true
machine: |
  The database was a production Oracle OLTP instance carrying the full company loan history
  while also serving every department's models and analytical workloads. There was
  no separation between the system of record and the transactional hot path:
  operational writes and company-wide analytical load hit the same instance, and it
  grew without bound. A single database acting as both system of record and everyone's data source is an existential availability risk, because when it saturates the business halts. The
  fix separated the two concerns: durable history moved to the the company's Hadoop platform as the new system of record, leaving the OLTP database to serve only the live transactional path.
---
At a public consumer-lending fintech, every department was building its models
and systems on top of one shared production database, and that database had
quietly become the company's single biggest point of failure. It carried the
full history of the business, every paid and charged-off loan, and it absorbed
the load of everything the rest of the org built on top of it. It was growing
without bound, and if it went down the whole business stopped. Moving it was its
own risk, since every department depended on it in production. I led a team of 8
to make the company's big-data platform the system of record and take the
record-keeping load off the transactional database. The load and cost burden
dropped, and the scenario everyone had quietly feared, the production database
growing until it fell over and took the business with it, was defused.
