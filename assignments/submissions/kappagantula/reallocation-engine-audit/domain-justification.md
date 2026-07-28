# Domain Justification — `case-infosys-healthtech-pm-opt`

## Who, and in what exact situation

An international student finishing a Master's in Information Systems on an F-1 visa,
in the OPT / STEM OPT window (the ~3-year period before H-1B sponsorship becomes
necessary to stay employed), targeting early-career **Product Manager, Associate
Product Manager, Product Owner, Product Operations, or Business Analyst** roles at
**healthcare / health-technology** companies. Not "an international student job
searching" — specifically someone whose authorization does not require H-1B *yet*,
searching for a role family that has no dedicated BLS/O*NET occupation code, in a
sector (healthcare) whose postings add domain-specific screens (HIPAA, EHR/EMR
systems, clinical-stakeholder fluency) on top of the usual PM screens.

## The information asymmetry

Three, stacked:

1. **Sponsorship is not one question, it's two, with different urgencies.** Every
   generic "does this company sponsor visas" tool collapses "needs H-1B sponsorship"
   into a single flag. For this student, during OPT/STEM OPT, the actual immediate
   requirement is that the employer be **E-Verify enrolled** — H-1B history is a
   *retention* signal for year 3+, not an *entry* gate. A company with zero H-1B
   history but E-Verify enrollment is not a skip; a company with strong H-1B history
   but no E-Verify enrollment is. This repo's own composite scorer
   (`scripts/score/role-scorer.mjs`) currently only models the first question — the
   Worked Run below shows the scorer returning `profile_needs_sponsorship: true` for
   this exact profile, which folds a longer-horizon retention concern into an
   immediate binding constraint it isn't.
2. **"Associate Product Manager" is not one tier, and a title-only search can't see
   that.** The Worked Run's own live scan surfaced postings ranging from a genuinely
   entry-level "1–3 years" APM req to enterprise APM titles that are mid-career roles
   wearing a junior title. A student cannot see this without reading each job
   description's actual experience language — the title is not informative on its own,
   and no automated title filter catches it.
3. **Postings expire faster than a student's own notes stay current.** The Worked Run
   re-checked a posting that had been manually verified as live three weeks earlier (in
   a prior exercise) and found it now 302-redirects to an error page. A candidate
   working from a static list — even a carefully sourced one — will silently burn OPT
   hours tailoring an application to a dead req unless liveness is re-checked at the
   moment of use, not at the moment of discovery.

## Connection to engine layers

- **Job-Ops** (ATS detection + liveness): the core mechanism for asymmetry #3.
  `npm run ats:scan -- --dry-run` and `npm run ats:liveness` are the only components
  of this mode that are fully built and were run live against real postings.
- **80 Days to Stay** (SEC Form D + H-1B history): the raw material for asymmetry #1 —
  `data/80-days-to-stay/data/SEC_DOL_H1b_data_mapped.csv` carries the company-level
  H-1B approval/rate/salary/title data this mode reads. The gap is not the data, it's
  that the scorer built on top of it (`role-scorer.mjs`) doesn't yet model the
  two-tier E-Verify/H-1B distinction — a proposed addition in the mode file, not a
  data gap.
- **The Cognitive Pivot** (BLS/O*NET role quality): present but, honestly, inert in
  this mode today. `data/bls/compact/soc_occupation_compact.csv` has a real
  `cognitive_pivot_score` for the two SOC proxies this mode uses (15-1299.09,
  13-1111.00), but `role-scorer.mjs`'s `role_quality` weight defaults to `0.0` — the
  score is computed and shown, not acted on. Naming this honestly, rather than
  implying the Cognitive Pivot layer is load-bearing here, is itself part of the
  domain justification: overclaiming this connection would misrepresent what the
  mode actually does for this student today.

## Failure modes specific to this domain

1. **The shape of the error: treating "no H-1B record" as "no sponsorship," instead
   of "no data."** `data/80-days-to-stay/data/SEC_DOL_H1b_data_mapped.csv` has H-1B
   approval fields blank for the large majority of small/early-stage healthtech
   companies (confirmed: of 4,623 healthcare-industry rows, only 286 have any H-1B
   approval data at all). A student using this mode naively would see a blank
   sponsorship field and read it as "this company won't sponsor," when the correct
   read is "this company has no LCA record in this dataset" — which for a Series
   Seed/A healthtech startup is the median case, not a red flag. **Who would struggle
   hardest to catch this:** exactly the student this mode is built for, because they
   are the one person in the pipeline with the least slack to spend manually
   double-checking a null the tool didn't explain — every hour spent re-verifying a
   tool's own ambiguity is an hour off an OPT clock that is already running. A
   citizen job-seeker using the same tool suffers no comparable cost from the same
   ambiguity.
2. **The shape of the error: an entry-tier student applying to a senior-titled "APM"
   and a genuine entry-tier APM getting scored identically by a title-only filter.**
   Because no PM-specific SOC code exists, and because "Associate Product Manager" is
   not a standardized tier across employers, any automated ranking that trusts the
   title string will silently conflate a 1-3-year entry role with a 5-plus-year,
   advanced-degree-preferred role carrying the same title. **Who would struggle
   hardest to catch this:** a new-grad international student applying for the first
   time in this exact function, with no internal calibration yet for what "Associate"
   means at a given company size/stage — versus a domestic candidate with a wider
   informal network to sanity-check a posting's real level before applying. The
   miscalibration costs the international candidate disproportionately more, because
   each misdirected application is scarcer OPT-clock time they cannot get back.
