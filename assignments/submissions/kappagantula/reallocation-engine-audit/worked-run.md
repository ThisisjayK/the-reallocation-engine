# Worked Run — `case-infosys-healthtech-pm-opt`

Repo: fresh clone of `nikbearbrown/the-reallocation-engine`, `npm install` completed
2026-07-17. All commands below were run from the repo root unless noted, on the real
tree, against real data. Nothing here is simulated or hand-typed as if it were console
output — every block is a literal paste.

## Inputs used

- `data/80-days-to-stay/data/SEC_DOL_H1b_data_mapped.csv` (30,369 rows, upstream data,
  unmodified) — read-only, filtered to healthcare-industry rows in a one-off `python3`
  check (not committed as a script; see Reflection for why that should change).
- `data/bls/compact/soc_occupation_compact.csv` (upstream data, unmodified) — read-only.
- Three real, currently-operating healthcare companies discovered live via ATS
  detection: **Omada Health**, **Oula Health**, **Modern Health** — the same three
  named in a prior, separate course exercise's `search/gaps.md` (P1/P2/P3), which
  independently corroborates they're real, live-scanned targets and not cherry-picked
  for this run.
- One previously-cited posting URL from that same prior exercise
  (`omadahealth/jobs/7788457`, verified live there on 2026-06-21) — reused here
  specifically to test whether it was still live a month later.
- `data/examples/case-healthtech-pm-opt-roles.json` and
  `case-healthtech-pm-opt-profile.json` — new fixture files I wrote for this run,
  containing only public company data and an **illustrative** authorization string
  (`"F-1 OPT / STEM OPT extension (pre-H-1B, E-Verify employer required)"`), not any
  real student's filing dates. No file under `private/` or `search/` was read,
  copied, or referenced by content in this run.

## Commands run, verbatim, and real output

### 1. Conformance check

```
$ npm run verify
> the-reallocation-engine@1.0.0 verify
> node scripts/conformance.mjs && node scripts/manifest-check.mjs

conformance: 131 files (75 md · 30 py · 23 js · 1 sh · 1 yaml · 1 json)
✓ all conform (machine half of P4). Adequacy is still the human gate.
MANIFEST CHECK — The Reallocation Engine
==========================================

WARN (4):
  W1 ignore path not in .gitignore: output/
  W1 ignore path not in .gitignore: reports/generated/
  W1 ignore path not in .gitignore: archive/
  W2 private path not gitignored (PII/secret risk): private/

✓ manifest check passed (4 warnings)
```

*(The four warnings pre-exist in the upstream tree — not introduced by this run.)*

### 2. ATS provider detection (real network calls, real public companies)

```
$ cd scripts/ats && python3 detect-ats.py "Castle Biosciences, Inc." "Omada Health" "Oula Health"
...
{
  "company_name": "Omada Health",
  "ats_platform": "greenhouse",
  "ats_slug": "omadahealth",
  "ats_api_url": "https://boards-api.greenhouse.io/v1/boards/omadahealth/jobs",
  "open_job_count": 28,
  "detection_status": "found", ...
},
{
  "company_name": "Oula Health",
  "ats_platform": "greenhouse",
  "ats_slug": "oulahealth",
  "ats_api_url": "https://boards-api.greenhouse.io/v1/boards/oulahealth/jobs",
  "open_job_count": 14,
  "detection_status": "found", ...
}

$ python3 detect-ats.py "Castle Biosciences, Inc." "Modern Health"
2026-07-17 19:02:23 | ats_scraper.retry | WARNING | Non-retryable status 404 for https://boards-api.greenhouse.io/v1/boards/castlebiosciences/jobs
2026-07-17 19:02:23 | ats_scraper.retry | WARNING | Non-retryable status 404 for https://api.lever.co/v0/postings/castlebiosciences
[1/2] Castle Biosciences, Inc. -> none (0 jobs)
[2/2] Modern Health -> greenhouse (12 jobs)
```

**Note:** Castle Biosciences is a real, H-1B-sponsoring biotech company (see below) —
`detection_status: not_found` here means the slug-guessing heuristic didn't match its
actual careers-page URL, **not** that the company has no careers page. This is exactly
the kind of ambiguity the mode's "what it cannot verify" section calls out.

### 3. The bug this run found (a deliberate break, and it broke)

I copied `data/ats/portals.example.yml` → `data/ats/portals.yml`, pointed
`tracked_companies` at Omada/Oula/Modern Health using the exact `careers_url` format
`detect-ats.py` had just printed (`https://boards.greenhouse.io/<slug>`), and ran:

```
$ npm run ats:scan -- --dry-run
Scanning 3 companies via providers (0 local parser; 0 skipped — no provider matched)
(dry run — no files will be written)
Companies scanned:     3
Total jobs found:      0
Errors (3):
  ✗ Omada Health: greenhouse: cannot derive API URL for Omada Health
  ✗ Oula Health: greenhouse: cannot derive API URL for Oula Health
  ✗ Modern Health: greenhouse: cannot derive API URL for Modern Health
```

Root cause, found by reading `scripts/ats/providers/greenhouse.mjs`:
`ALLOWED_GREENHOUSE_HOSTS` lists `boards.greenhouse.io` as a trusted host, but
`resolveApiUrl()`'s regex (`/job-boards(?:\.eu)?\.greenhouse\.io\/([^/?#]+)/`) only
matches the `job-boards.greenhouse.io` host format — so a `careers_url` using
`boards.greenhouse.io` (the exact format `detect-ats.py` itself outputs) silently
fails to resolve, even though the host is in the trusted allowlist. **This is a real,
reproducible cross-script inconsistency in the upstream repo, not a mistake in my
config** — `detect-ats.py` and `scan.mjs`'s greenhouse provider disagree on which
Greenhouse URL shape is canonical. I did not fix it upstream (out of scope for this
assignment); I worked around it by switching `careers_url` to the
`job-boards.greenhouse.io` form, which is what `portals.example.yml`'s own Databricks
entry already uses.

### 4. Real ATS scan, after the workaround

```
$ npm run ats:scan -- --dry-run
Scanning 3 companies via providers (0 local parser; 0 skipped — no provider matched)
(dry run — no files will be written)
Companies scanned:     3
Total jobs found:      54
Filtered by title:     45 removed
Filtered by location:  0 removed
Duplicates:            0 skipped
New offers added:      9

New offers:
  + Modern Health | Product Security Engineer | Remote - US
  + Oula Health | Clinical Systems & Product Operations Manager (Full-Time) - Remote  | New York, NY, USA
  + Oula Health | Director of Product | New York, NY, USA
  + Omada Health | Director, Cardiometabolic Health Product Marketing | Remote, USA
  + Omada Health | Director, GLP-1 and Cardiometabolic Health Program Manager | Remote, USA
  + Omada Health | Product Designer, AI Experience | Remote, USA
  + Omada Health | Product Manager, Billing | Remote, USA
  + Omada Health | Senior Product Designer | Remote, USA
  + Omada Health | Senior Product Marketing Manager | Remote, USA
```

Note what is **absent**: no "Associate Product Manager" title is currently live at any
of the three companies — including at Omada and Oula, the exact two companies whose
APM postings were cited as live in the prior course exercise (2026-06-21). That is the
liveness thesis working correctly, not a failure of this scan.

### 5. Liveness gate, tested against a real historical URL

```
$ npm run ats:liveness -- https://job-boards.greenhouse.io/omadahealth/jobs/7958286
Checking 1 URL(s)...
✅ active     https://job-boards.greenhouse.io/omadahealth/jobs/7958286
Results: 1 active  0 expired  0 uncertain

$ npm run ats:liveness -- https://job-boards.greenhouse.io/omadahealth/jobs/7788457
Checking 1 URL(s)...
❌ expired    https://job-boards.greenhouse.io/omadahealth/jobs/7788457
           redirect to https://job-boards.greenhouse.io/omadahealth?error=true
Results: 0 active  1 expired  0 uncertain

$ npm run ats:liveness -- https://job-boards.greenhouse.io/oulahealth/jobs/5239778008
Checking 1 URL(s)...
✅ active     https://job-boards.greenhouse.io/oulahealth/jobs/5239778008
Results: 1 active  0 expired  0 uncertain
```

The second command is the deliberate break attempt: `omadahealth/jobs/7788457` is the
**exact URL** independently verified live on 2026-06-21 in a prior, separate exercise
(cited there as source [P1], "Omada APM Data Governance"). Re-checked here on
2026-07-17 — **26 days later** — it now redirects to an error page. A mode that
trusted a month-old "verified live" note without re-checking would have sent the
student to tailor an application for a dead requisition.

### 6. Composite scoring — the repo's stock fixture (sanity check)

```
$ npm run score data/examples/ch11-roles.json
> node scripts/score/role-scorer.mjs data/examples/ch11-roles.json
✓ scored 5 roles → Apply 2 · Consider 1 · Skip 2 (skip 40%)
  data/examples/role-scores.json  +  data/examples/role-scores.md
```

Reproduces the repo's own documented Ch.11 worked example (confirms the scorer itself
is unmodified and working before I fed it new data).

### 7. Composite scoring — this mode's case fixture

Ran against the three real postings above (two live, one deliberately re-tested as
expired), with sponsorship/role-quality values sourced from the CSVs described in
Verified vs. Inferred below, and a profile file carrying only the illustrative
authorization string:

```
$ node scripts/score/role-scorer.mjs data/examples/case-healthtech-pm-opt-roles.json \
    --profile data/examples/case-healthtech-pm-opt-profile.json \
    --out-dir data/examples --md data/examples/case-healthtech-pm-opt-scores.md
✓ scored 3 roles → Apply 0 · Consider 2 · Skip 1 (skip 33%)
  data/examples/role-scores.json  +  data/examples/case-healthtech-pm-opt-scores.md
```

Key line from the JSON output, `omada-apm-data-governance-EXPIRED`:

```json
{
  "role_id": "omada-apm-data-governance-EXPIRED",
  "composite": 0,
  "recommendation": "Skip",
  "reason": "gated: liveness ≈ 0.000 (a closed gate zeroes the composite regardless of votes)",
  "trace": {
    "votes": [
      { "factor": "sponsorship", "value": 0.6, "weight": 0.35, "contribution": 0.21 },
      { "factor": "fit", "value": 0.75, "weight": 0.3, "contribution": 0.225 }
    ],
    "vote_sum": 0.435,
    "gates": [{ "factor": "liveness", "multiplier": 0 }, { "factor": "timeline", "multiplier": 0.9 }],
    "arithmetic": "(0.6·0.35 + 0.75·0.3 + 0·0) × 0 × 0.9 = 0.000"
  }
}
```

This role has the **highest raw vote sum of the three (0.435)** — on votes alone it
would out-rank both live postings — and the scorer still correctly forces it to Skip
because the liveness gate is multiplicative, not additive. This is the single clearest
piece of evidence in this run that "liveness is a gate, not a vote" is not just prose
in `DOMAIN.md`, it is enforced by the actual arithmetic in `role-scorer.mjs`.

Also worth stating plainly: `profile_needs_sponsorship: true` in this output (visible
in the full JSON) is the exact gap named in the Domain Justification — the scorer has
no field for "needs E-Verify now, needs H-1B only for retention later," so it treats
this OPT/STEM-OPT profile the same as a profile that needs H-1B immediately.

### 8. Repo health after all of the above

```
$ npm run doctor
...
PRIVACY (no personal data committed)
  ✓ no private/PII paths are tracked
RECIPES (43)
  with lifecycle frontmatter: 43   missing: 0
  by status: DRAFT 42, RUNNABLE-SAMPLE 1
```

## Verified vs. inferred

**Verified (machine-checked or read directly from a source file/live network call):**
- Omada Health, Oula Health, Modern Health all resolve to real Greenhouse boards with
  28/14/12 open jobs respectively (`detect-ats.py`, live HTTP 200s).
- 54 total live postings across the three companies as of 2026-07-17; 9 match this
  mode's Product/APM/BA/Program title filter (`ats:scan --dry-run` output).
- `omadahealth/jobs/7958286` ("Product Manager, Billing") and
  `oulahealth/jobs/5239778008` are active right now (`ats:liveness`).
- `omadahealth/jobs/7788457` ("Associate Product Manager, Data Governance"), live on
  2026-06-21 per a prior independent check, now redirects to an error page
  (`ats:liveness`, this run).
- Omada Health Inc. shows 20 H-1B approvals, 100% approval rate, $185,000 median LCA
  salary, for `['Senior Android Software Engineer', 'Senior Data Analyst']` — **not**
  a product-titled role — in `SEC_DOL_H1b_data_mapped.csv`. Latest Form D: Series C,
  2015-07-10.
- Oula Health Inc. has **no** H-1B approval fields populated in the same file (blank,
  not zero).
- Castle Biosciences Inc. shows 2 H-1B approvals, 100% rate, `['IT, Product Owner']`
  — a genuine product-adjacent sponsored title — but its ATS slug could not be
  auto-detected, so its live postings were not checked this run.
- SOC 15-1299.09 (`cognitive_pivot_score` 3.861) and SOC 13-1111.00
  (`cognitive_pivot_score` 4.013, alternate title "Business Analyst") both exist in
  `data/bls/compact/soc_occupation_compact.csv` exactly as cited.
- `role-scorer.mjs`'s `role_quality` weight is `0.0` in the script's own `CONFIG`
  object — read directly from source, not inferred.
- The greenhouse-URL-format bug (§3 above) — reproduced twice, root-caused by reading
  `providers/greenhouse.mjs`.

**Inferred / model-judgment (labeled as such in the fixture and in scorer output):**
- The `fit` score (0.55 / 0.6 / 0.75) for each of the three roles — a bounded judgment
  from the posting title and sector match, not a full JD re-parse.
- The `timeline.factor` value (0.9) — an **illustrative placeholder**, explicitly not
  a real OPT/STEM-OPT date, since real dates belong in `private/` and were not used.
- The sponsorship *tier* labels ("Likely" for company-wide-but-not-role-specific
  history, "Unknown" for no record) — my judgment call about how to translate the raw
  CSV fields into the scorer's tier vocabulary, not something the CSV states directly.

## Verification (how I confirmed the output was real, not fabricated)

- Re-ran `ats:liveness` a second time against both the active and expired URLs after
  writing this document — same results, both times, confirming the output wasn't a
  one-off network fluke.
- Cross-checked the H-1B counts by re-opening
  `SEC_DOL_H1b_data_mapped.csv` with Python's `csv.DictReader` (proper quoted-field
  parsing) after an initial naive `awk -F','` attempt gave wrong column alignment on
  rows with embedded commas in `executive_officers` — caught because the awk output
  didn't match the CSV's own header count, re-parsed properly, and the corrected
  numbers are what's reported above.
- Deliberately tried to break the scan (§3) by using the URL format `detect-ats.py`
  itself had just printed, rather than the "known-good" format from the example file
  — this is what surfaced the real cross-script bug, not a contrived failure.
- Confirmed `npm run doctor`'s privacy check still passes after adding the new example
  fixtures, i.e. nothing personal leaked into a tracked path.
- Reproduced the stock `data/examples/ch11-roles.json` result (§6) before trusting the
  scorer against new data, to confirm the scorer itself was unmodified.

## Attestation

- Recipe: `case-infosys-healthtech-pm-opt` v0.1.0
- By: Jayanth Adithya Kappagantula · 2026-07-17

### Tested

| Ran | Saw | Expected |
|---|---|---|
| `npm run verify` | conformance clean, 4 pre-existing warnings | clean pass |
| `python3 detect-ats.py "Omada Health" "Oula Health" "Modern Health"` | all three found on Greenhouse, real open-job counts | provider + slug detection |
| `npm run ats:scan -- --dry-run` with `careers_url` in `boards.greenhouse.io` form | **failed** — "cannot derive API URL" for all 3 companies | (deliberate break attempt) expected either a working scan or a clear, diagnosable error — got the latter, and root-caused it in `providers/greenhouse.mjs` |
| Same scan, `careers_url` switched to `job-boards.greenhouse.io` form | 54 jobs found, 9 passed the title filter | working scan |
| `npm run ats:liveness` on a fresh live posting | `active` | active |
| `npm run ats:liveness` on a posting verified live 26 days earlier in a prior exercise | `expired`, redirects to an error page | this was the second deliberate break attempt — testing whether "verified live" from three weeks ago still holds. It didn't, which is the point. |
| `node scripts/score/role-scorer.mjs` on the case fixture | Apply 0 · Consider 2 · Skip 1; the highest-vote-sum role (0.435) still Skipped on a closed liveness gate | gate multiplies to zero regardless of votes |
| `npm run doctor` after all file changes | privacy check still passes, no private path tracked | pass |

### Did not test

- The proposed `everify_required` / `h1b_history_weight` two-tier scorer fields —
  these are `[TODO: DEV]`, not implemented; nothing in this run exercises them beyond
  naming the gap.
- The proposed funding-recency caveat script — same, `[TODO: DEV]`, not built.
- `npm run ats:verify` (pipeline integrity) and `npm run resumes:pdf` — not run this
  session; out of scope for this mode's specific claims, but untested by me, so listed
  honestly rather than omitted.
- Whether Castle Biosciences' actual careers page (ATS slug not auto-detected) has a
  live product-titled posting — the sponsorship evidence for that company is real, but
  its liveness was never checked, because the scan couldn't find its board.
- Whether the E-Verify gate's manual-checklist framing actually gets followed in
  practice by a student under time pressure — that's a process risk this recipe names
  but cannot verify by running anything.

### Broke during testing, fixed

- `npm run ats:scan -- --dry-run` failed for all three companies on the first attempt
  because `careers_url` used the `boards.greenhouse.io` host format that
  `detect-ats.py` itself outputs, but `scripts/ats/providers/greenhouse.mjs`'s
  `resolveApiUrl()` regex only matches `job-boards.greenhouse.io`. Fixed locally by
  switching the three `careers_url` values in `data/ats/portals.yml` (gitignored, not
  committed) to the `job-boards.greenhouse.io` form. The underlying regex mismatch in
  the upstream provider file was **not** fixed — it's out of scope for this
  assignment, but it's real and reproducible, and is worth a separate upstream issue.
- My first CSV pass used `awk -F','` and produced misaligned columns on rows with
  commas inside quoted `executive_officers` fields (e.g. "Jory O. Bell, Marc O.
  Foster..."). Caught this because the printed values didn't line up with the known
  header, switched to Python's `csv.DictReader`, and all numbers reported above are
  from the corrected parse.

## Reflection

**What went well:** the ATS layer (`detect-ats.py`, `ats:scan`, `ats:liveness`) is
genuinely solid — it found real companies, real postings, and correctly zeroed a role
that looked strongest on paper because it was dead. The liveness-as-gate design isn't
just documentation; I watched it override a 0.435 vote sum in real output. The 80 Days
CSV has real, specific, useful company-level H-1B and Form D data that made every
claim in the Domain Justification checkable rather than asserted.

**What the mode got wrong or missed:** the two-tier sponsorship model this student's
situation actually needs isn't built — I designed around the gap rather than closing
it, which is the honest thing to do given the time available, but it means today's
`role-scorer.mjs` run genuinely mis-frames the sponsorship constraint (treats
E-Verify-now/H-1B-later as a single "needs sponsorship" flag). I also never got
liveness data for Castle Biosciences, the one company with real product-titled H-1B
history, because its careers board couldn't be auto-detected — so the mode's
best sponsorship evidence and its best liveness evidence currently live at different
companies, which weakens any single worked example. And the role-quality/cognitive-
pivot number, the thing that's supposed to make this the "Cognitive Pivot" layer, is
computed but provably inert in the composite — I'd rather say that plainly than let
the mode imply otherwise.

**Next steps:** (1) close the `everify_required`/`h1b_history_weight` TODO against a
second worked example, so the profile model actually matches this population instead
of just documenting where it doesn't; (2) manually find Castle Biosciences' real
careers URL (the slug guess failed, the company didn't) and get one company with both
sponsorship and liveness evidence in the same row; (3) get a human decision logged on
the `role_quality` weight — right now this mode's central thesis is only half-wired
into its own scorer, and that shouldn't stay quietly true past a first run.
