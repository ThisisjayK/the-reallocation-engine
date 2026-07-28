---
status: RUNNABLE-SAMPLE
todos_open: 4
last_gate: "sample-run, 2026-07-17, logs/RUN_LOG.md#2026-07-17-case-infosys-healthtech-pm-opt"
attestation: null
recipe_version: 0.1.0
---

# Healthtech APM/PM/BA Search Under a Two-Tier OPT Sponsorship Gate

## Purpose

For an international student on F-1 OPT / STEM OPT targeting early-career **Product
Manager / Associate Product Manager / Product Owner / Product Operations / Business
Analyst** roles at **healthcare and health-technology** companies in the US.

Run this when you have a candidate posting (or a short list from an ATS scan) and need
to decide **Apply / Consider / Skip** before spending OPT-clock hours tailoring an
application — not a generic "is this a good job" check, but one built around a fact
most job-search tooling gets wrong for this population: **during OPT and STEM OPT, the
binding legal constraint is not H-1B sponsorship, it is E-Verify enrollment.** H-1B only
becomes the binding constraint if the student wants to stay with that employer past the
~3-year OPT+STEM-OPT window. Scoring both constraints as one boolean ("needs
sponsorship: yes/no") misprices every company that E-Verifies but does not yet have an
H-1B track record — a large share of Series A/B healthtech startups.

This recipe also carries a second, healthtech-specific correction: **"Associate Product
Manager" is not one tier.** Live postings pulled during this recipe's worked run showed
the same title ranging from a genuinely entry-level, 1–3-year role at one company to a
5-plus-year, advanced-degree-preferred role at another. A mode that lets "APM" stand in
for a single experience bar will misroute a new grad's effort in both directions.

## Source Inventory

| Source | Path / Command | What it gives this mode |
|---|---|---|
| Sponsorship + funding | `data/80-days-to-stay/data/SEC_DOL_H1b_data_mapped.csv` | Per-company H-1B approval count/rate, median LCA salary, `top_job_titles_sponsored`, SEC Form D `total_funding` / `latest_funding_stage` / `latest_funding_date`. Filter `industry` to `Biotechnology`, `Health Insurance`, `Other Health Care`, `Pharmaceuticals` for the healthtech-first slice (4,623 of 30,369 rows in the 2026-07-17 pull). |
| ATS provider + liveness | `scripts/ats/detect-ats.py`, `npm run ats:scan -- --dry-run`, `npm run ats:liveness -- <job-url>` | Confirms a company's careers board exists on a known ATS and that a specific posting is still live. **Liveness is a gate, not a vote** — see Phase Gates. |
| Role-quality / cognitive-pivot | `data/bls/compact/soc_occupation_compact.csv` | Per-SOC `cognitive_pivot_score` and skill/ability levels. No dedicated "Product Manager" SOC/O*NET code exists (confirmed by inspection of the compact file); this mode uses **15-1299.09 Information Technology Project Managers** (`cognitive_pivot_score` 3.861) as the PM/APM proxy and **13-1111.00 Management Analysts** (`cognitive_pivot_score` 4.013, alternate title "Business Analyst" — confirmed in `alternate_titles_sample`) as the Business Analyst proxy. |
| Composite scorer | `npm run score <roles.json> -- --profile <profile.json>` → `scripts/score/role-scorer.mjs` | Combines sponsorship, fit, role-quality votes with liveness/timeline as multiplicative gates into Apply/Consider/Skip, with a full per-term audit trace (record / model-judgment / your-input). Does **not** compute the input votes — those come from the sources above plus bounded model judgment for `fit`. |
| Personal data layer (pattern, not contents) | `search/{resume.json, profile.yml, gaps.md}` per `docs/search-profile-design.md`; real values live in `private/`, never in a tracked file | This mode assumes the three-file personal layer already exists per the design doc: `resume.json` (attested past), `profile.yml` (declared future + constraints, including the two-tier sponsorship fields below), `gaps.md` (the computed delta). This recipe reads that layer locally; it never echoes its contents into a tracked report. |

## Proposed Additions (typed TODOs)

- **[TODO: DEV]** `scripts/score/role-scorer.mjs` `applyProfile()` (currently around the
  `needsSponsor` regex, `citizen|permanent|green|gc|pr\b|no.?sponsor|authorized`) treats
  sponsorship as one binary. It has no way to represent "E-Verify required now, H-1B
  required only for retention past OPT+STEM-OPT," so an F-1/OPT profile is scored
  identically to an H-1B-needed-immediately profile — verified by running the scorer
  against `data/examples/case-healthtech-pm-opt-profile.json` in the Worked Run below
  and inspecting `profile_needs_sponsorship: true` in the output, which is technically
  correct but conflates two different constraints with two different urgencies. Define:
  an `everify_required` boolean (immediate multiplicative gate, parallel to `liveness`
  and `timeline`) and an `h1b_history_weight` field (`"required"` / `"preferred"` /
  `"irrelevant"`) that scales — but does not zero — the existing `sponsorship` vote.
  Closed by: a human confirming the new fields reproduce today's behavior when
  `h1b_history_weight: "required"` (i.e. the current single-boolean model is the special
  case), plus a second worked example showing an E-Verify-only company scoring
  differently under the old vs. new model.
- **[TODO: DEV]** A funding-recency flag for the "80 Days" layer. The Worked Run below
  found `latest_funding_date` values of 2015 (Omada Health, Series C) and 2019 (Castle
  Biosciences, Series A) in the mapped CSV — both companies are plausibly still funded
  through later rounds, debt, or revenue that this dataset does not capture, so "stale
  Form D date" must not be read as "funding-dry" for companies past seed/Series A. Define
  a script that flags `latest_funding_date` older than N years **as a caveat to surface
  to the human**, not as a skip/gate — because for later-stage private companies, silence
  in this dataset is a coverage gap, not a signal. Closed by: a human picking N and
  confirming the caveat text against 5 known-still-operating companies with stale dates.
- **[TODO: DEFINE]** A per-title SOC-proxy lookup table (`data/synonyms/pm-soc-proxies.yml`
  or similar) mapping the five target titles in this mode's Purpose to their closest SOC
  code(s) with one sentence of reasoning each, so proxy selection stops being an ad hoc
  choice made fresh in every run. This recipe's worked run made that choice manually
  (15-1299.09 for PM/APM, 13-1111.00 for BA) — the table would make it reviewable and
  reusable. Closed by: a human approving the mapping and its stated reasoning.
- **[TODO: APPROVE]** The `role_quality` weight in `scripts/score/role-scorer.mjs`
  `CONFIG.weights` is `0.0` and marked `[VERIFY]` — unpinned by book Ch.11 or
  `docs/search-profile-design.md` (confirmed by reading the script's own comments,
  2026-07-17; this matches DOMAIN.md's known-gap #3). Concretely: this mode's Cognitive
  Pivot claim (role-quality/cognitive-pivot score matters for healthtech PM roles) is
  **not currently priced into the Apply/Consider/Skip composite at all** — it is
  computed and shown in the human report, but contributes zero to the number that drives
  the recommendation. This mode must not claim otherwise. Closed by: a named human
  deciding whether to pin a nonzero weight for this mode's use case and logging the
  decision and reasoning in `logs/RUN_LOG.md`.

## Phase Gates

Hard stops. A run does not proceed past a failed gate; "looks fine" is not a pass.

1. **Sector gate.** The company's `industry` value in
   `data/80-days-to-stay/data/SEC_DOL_H1b_data_mapped.csv` is one of `Biotechnology`,
   `Health Insurance`, `Other Health Care`, `Pharmaceuticals`, **or** the human explicitly
   overrides with a one-line reason (e.g. evaluating an adjacent B2B SaaS role per
   `profile.yml`'s secondary sectors). Test: row exists and `industry` matches, or an
   override string is present. Not found in the mapped CSV is logged as "unmatched," never
   silently treated as "not healthcare."
2. **Liveness gate (hard, multiplicative).** `npm run ats:liveness -- <job-url>` returns
   `active`. A `expired` or `uncertain` result **zeroes the role's composite regardless
   of every other vote** — this is enforced by `scripts/score/role-scorer.mjs` itself
   (`gate_zero: 0.05`), not by mode discipline layered on top. Test: the worked run below
   shows a role with the single highest raw vote sum (0.435) still resolve to Skip because
   its liveness factor was 0.
3. **E-Verify gate (hard, today done manually — see proposed addition above).** The
   employer must be E-Verify enrolled for the OPT/STEM-OPT phase; a non-E-Verify employer
   is a skip regardless of sponsorship history, fit, or role quality, because the
   candidate cannot legally start there under the current authorization. Until the typed
   DEV item above (Proposed Additions) closes, this gate is a **human checklist item**,
   not an automated multiplier — the mode must say so plainly rather than imply the
   scorer enforces it.
4. **Visa-timeline gate.** The role's expected start date must fall inside the candidate's
   authorized work window (OPT EAD dates, or STEM OPT extension dates once filed), with
   the book's recommended buffer under the unemployment-day ceiling. Represented today as
   `timeline.factor` (`your-input`, multiplicative) in the roles.json fed to
   `npm run score`. This is a gate, not a vote, by the same mechanism as liveness — a
   `factor` below `gate_zero` zeroes the composite.
5. **Data-shape gate.** `npm run verify` passes (conformance) and any custom roles/profile
   JSON parses with `python3 -m json.tool` before being fed to `role-scorer.mjs`.

## What This Mode Can and Cannot Verify

**Can verify (from the sources above, machine-checkable):**
- Whether a specific posting URL currently resolves to an active listing vs. an
  expired/redirected one (`npm run ats:liveness`).
- Whether a company has H-1B LCA approval history on record, at what approval rate, at
  what median salary, and for which job titles — **at the company level**, not
  necessarily for the specific title being evaluated (the Worked Run below shows this
  distinction matters: Omada Health has strong company-wide sponsorship history but no
  product-titled role in its `top_job_titles_sponsored` list).
- A company's most recent SEC Form D filing date, amount, and stage, where one exists in
  the mapped dataset.
- A SOC-code's cognitive-pivot/skill/ability profile, for whichever proxy code the human
  or the proposed lookup table selects.

**Cannot verify (today):**
- Whether a specific team, not just the company, will sponsor H-1B for a PM/BA-track
  hire — the dataset is company-level, not team- or req-level.
- E-Verify enrollment status — not in this dataset at all; must be checked against
  USCIS's E-Verify employer list or the posting/offer letter directly.
- Whether "Associate Product Manager" at a given company is the entry tier or the
  senior-titled tier — title text alone does not disambiguate; the Worked Run below
  required reading the actual years-of-experience language in each posting.
- Whether role-quality/cognitive-pivot score is actually reflected in the Apply/Consider/
  Skip recommendation — see the APPROVE item above (Proposed Additions). It is not, by
  default.
- Anything about interview loops, team fit, or manager quality. Out of scope for every
  mode in this repo.

## Output Contract

### Agent log
File: `logs/case-infosys-healthtech-pm-opt-[DATE].json`
Fields: `run_id`, `mode` (`sample` | `live`), `companies_checked`, `postings_checked`,
`gate_results` (sector, liveness, e-verify, timeline, data-shape — pass/fail/override per
role), `scorer_output_path`, `todo_items_open`, `sources_used` (exact file paths / commands
run), `generated_at`.

### Human report
File: `reports/generated/case-infosys-healthtech-pm-opt-[DATE].md`
Reader: the student, deciding whether to spend application-writing time on a role.
Decision enabled: Apply / Consider / Skip per role, with the reason and the full
record/model-judgment/your-input trace, plus which gates passed, failed, or were
overridden and why.
Sections: run summary; roles evaluated; per-role gate results; per-role composite with
audit trace; verified vs. inferred split; open TODOs that limited this run; next
actions.

## Stop Conditions

- Stop and do not produce a score if the posting URL is missing or unreachable — liveness
  cannot be a silent "assume active."
- Stop if the company is not found in `data/80-days-to-stay/data/SEC_DOL_H1b_data_mapped.csv`
  and no override reason is given — report "sponsorship: no record," never invent a tier.
- Stop before treating `role_quality` as part of the recommendation until the
  APPROVE weight decision (Proposed Additions) is logged — show the score, label it inert.
- Stop before writing anything from `search/resume.json`, `search/profile.yml`, or
  `private/` into this recipe's own output files, logs, or reports. Category-level
  descriptions only (e.g. "F-1 OPT / STEM OPT"), never dates, names, or filing details.
- Stop before any live network call beyond read-only ATS/liveness checks (no applying, no
  emailing, no account creation) without an explicit human go-ahead.

## RUN_LOG Template

```markdown
## YYYY-MM-DD — case-infosys-healthtech-pm-opt run

- **Recipe:** case-infosys-healthtech-pm-opt v0.1.0
- **Inputs:** <roles.json path>, <profile.json path>, mode (sample|live)
- **Commands:** <exact npm run / python3 commands executed>
- **Outputs:** <logs/*.json>, <reports/generated/*.md>, <data/examples/* if sample>
- **Result:** Apply <n> · Consider <n> · Skip <n> (skip rate <pct>)
- **Gates:** sector <pass/fail/override> · liveness <pass/fail> · e-verify <pass/fail/manual> · timeline <pass/fail>
- **Open issues:** <todo items still open, anything that broke, anything not tested>
```
