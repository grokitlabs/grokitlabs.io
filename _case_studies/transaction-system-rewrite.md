---
# GENERATED from consulting/case-studies/transaction-system-rewrite.md — do not edit
title: "The transaction-system rewrite"
slug: "transaction-system-rewrite"
tags: [Leadership & judgment, Reliability & scale, Due diligence & risk]
capacity: "Employee"
role: "Engineering Director"
summary: "Caught a solo rewrite of the revenue path days from shipping and got it shelved without a fight."
draft: true
has_machine: true
machine: |
  The system was the marketplace's order-placement and transaction-processing path.
  The rewrite was about 32,000 lines of Java, built solo and in isolation, with no
  unit or functional tests, no architectural documentation, and a structure you
  couldn't learn anything from by reading it. On the assessment's own axes it
  graded red across the board: architecture (unproven and over-engineered),
  delivery (no process behind it), and key-person risk (unmaintainable by anyone
  but its author). Wider analysis across the engineering org reached the same conclusion, and the code was ultimately abandoned.
---
A public consumer-lending fintech had scaled its engineering org from about 15 to
over 200, without the process to match. The transaction system at the heart of
its marketplace, the path that matches investor capital to borrower loans, was
being rewritten from scratch, because the existing one was too far gone to keep
building on. Most of the company's revenue ran through that system, somewhere
around $500M, and the rewrite was heading toward a ship date.

It was one senior engineer's work, built solo and in private with no peer review.
He was well respected and long tenured, so surfacing the risk clumsily would have
cost real political capital all around. The technical problem and the human
problem were equally important, and both had to be solved at once.

I gained insight into the work through genuine curiosity, then reframed it as a project worth productizing as a team, which honestly required tests and more eyes, and honestly surfaced what was actually there and the gap that had to close before it could ship. Validation proved
unreachable. The rewrite was shelved, the existing system kept running until a new plan could be formulated, and a disaster on the revenue path was averted. The engineer left later, on his own terms, with his dignity intact.
