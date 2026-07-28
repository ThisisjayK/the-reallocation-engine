# The Reallocation Engine, Audited · Kappagantula, Jayanth Adithya

INFO 7375 (Computational Skepticism for AI). A working reallocation tool wrapped in the seven
skeptical checks, anchored to Chapter 11 of *The Reallocation Engine*, the Bayesian Role Scorer. It
is one scorer at three altitudes of stakes: my application effort, then a company's interview slots,
then a government's visa slots.

## Deliverables

- `Kappagantula_JayanthAdithya_ReallocationEngine.md`: the validation report (§1 through §7, plus the
  uncertainty section and the AI Use Disclosure). Start here.
- `scripts/allocator-flip.mjs`: my tool. It re-points the Ch.11 composite to reallocate interview
  slots across candidates and runs a fairness audit. Original work.
- `figures/uncertainty-figure.html`: the uncertainty visualization (D3 v7; open it in a browser).
- `FRICTIONAL_JOURNAL.md`: the timestamped before-prediction and the after-reflection.
- `reports/allocator-flip-audit.md`: the generated output of the allocator flip.
- `sample-data/`: fixtures with no personal data. `case-healthtech-pm-opt-{roles,profile}.json`,
  `case-healthtech-candidates.json`, the `-PERTURBED-liveness` variant used in §6, and `…-scores.md`.
- `case-infosys-healthtech-pm-opt.md`, `domain-justification.md`, `worked-run.md`, `RUN_LOG_entry.md`:
  the mode file, the domain justification, the worked run, and the run log.
- `scripts/score/role-scorer.mjs`: the Ch.11 scorer, vendored unmodified (MIT) from
  `nikbearbrown/the-reallocation-engine` so the commands below run from this folder alone. See
  `THIRD_PARTY_NOTICES.md`.
- `scripts/gigo-gate-check.mjs`: my script, reproduces the §2 GIGO-gate statistic (288 of 4,745
  healthcare-sector companies carry an H-1B record) directly from `SEC_DOL_H1b_data_mapped.csv`.
  Unlike the other two commands, this one depends on that CSV, which is **not** vendored here — it
  already lives in the parent course repo this submission is checked out inside
  (`data/80-days-to-stay/data/...`). Run it from that context, or pass the CSV's path explicitly.

## How to run (only Node.js required; no install)

Run from this folder's root.

```bash
# 1) My tool: the allocator flip + fairness audit (regenerates reports/allocator-flip-audit.md)
node scripts/allocator-flip.mjs

# 2) The anchored scorer, baseline (§1): Apply 0 / Consider 2 / Skip 1
node scripts/score/role-scorer.mjs sample-data/case-healthtech-pm-opt-roles.json --profile sample-data/case-healthtech-pm-opt-profile.json --out-dir reports

# 3) The adversarial perturbation (§6): a stale liveness bit flips the dead posting to the top
node scripts/score/role-scorer.mjs sample-data/case-healthtech-pm-opt-roles-PERTURBED-liveness.json --profile sample-data/case-healthtech-pm-opt-profile.json --out-dir reports

# 4) The GIGO-gate stat (§2): reproduces "288 of 4,745 healthcare companies carry an H-1B record"
#    directly from the CSV. Only runs from inside the full course repo (see note below); if you
#    checked out just this folder, pass the CSV's path explicitly as an argument.
node scripts/gigo-gate-check.mjs
```

Open `figures/uncertainty-figure.html` directly in any browser. It loads D3 from a pinned CDN and
carries inline fallback data.

## Not included here

- The explainer video is submitted separately, per the assignment's upload and link instructions.
  This file set does not include a recording.
- Personal data (`private/`, and any real résumé, profile, or tracker) is deliberately not copied
  here. Per the honesty rule, personal data stays local and gitignored. `worked-run.md` explains how
  that layer informed the design without echoing its contents, and all fixtures here are synthetic or
  public.
