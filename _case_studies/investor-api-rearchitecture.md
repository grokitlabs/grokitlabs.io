---
# GENERATED from consulting/case-studies/investor-api-rearchitecture.md — do not edit
title: "The investor-platform rearchitecture"
slug: "investor-api-rearchitecture"
tags: [Leadership & judgment, Delivery & turnaround]
capacity: "Employee"
role: "Engineering Director"
summary: "Rearchitected the investor platform so a secondary market, a mobile app, and a new retail web experience could all launch on it."
draft: true
has_machine: true
machine: |
  The investor API was the integration surface every investor-facing product would
  sit on, so the rearchitecture had to serve three very different consumers at
  once: a trading API, a mobile client, and a web app. The bar was a platform that
  new product teams could build on without routing through mine, which is what let
  the secondary market, the mobile app, and the retail webapp ship independently.
  `[the stack and what "rearchitected" concretely meant, the API style (REST/GraphQL),
  the service boundaries, the data-model changes, the scale, your input, this is
  where an engineer will want the substance.]`
---
At a public consumer-lending fintech, the platform investors used to put money
into loans had to grow up fast. The business wanted three things at once: a
secondary market where investors could trade loans, a native investor mobile
app, and a new retail-investor web experience. The existing investor API
couldn't carry any of them. I led a team of 8 to rearchitect the platform so it
could, and that rearchitecture is what let all three launch on top of it.
`[business impact / scale numbers, your input]`
