# The Reallocation Engine, Audited
### Kappagantula, Jayanth Adithya · INFO 7375, Computational Skepticism for AI

> **Anchor:** Chapter 11, *The Bayesian Role Scorer* (the composite that returns Apply / Consider /
> Skip), with the sponsorship signal from the Chapter 7 sponsorship scorer.
> **What the tool optimizes, in one sentence:** it is built to maximize expected interview-conversion
> per hour of application effort. What it actually computes is a weighted composite of sponsorship and
> fit under liveness and timeline gates, which is a proxy for conversion, not conversion itself.
> **What that objective leaves out** (the load-bearing omission): conversion is never observed in the
> data (see §5), so the engine optimizes a stand-in for its own goal. It also ignores fit quality, the
> state of the market, and how much energy I actually have.

**Thesis: one scorer, three altitudes of stakes.** The same composite reallocates my application
effort across companies, then a company's interview slots across candidates, then a government's visa
slots across applicants. At every level it optimizes a confounded correlation and calls it merit.
Levels 1 and 2 run in this repo; level 3 is a documented case study, precisely specified rather than
built.

---

## 1. The Working Reallocation Tool (12 pts)  ·  *[Mode, runs]*

- The engine: `role-scorer.mjs` run over `case-healthtech-pm-opt-roles.json`.
- Output: Apply / Consider / Skip per role, with the vote-sums attached as its uncertainty.
- Real run result: Apply 0 / Consider 2 / Skip 1 (from `worked-run.md`).
- The objective and what it leaves out are stated in the header.
- Uncertainty communication: the vote-sum spread, plus the skip rate as a humility signal.

## 2. Data Validation & the GIGO Gate (10 pts)  ·  *[Mode primary; H-1B echo]*

- Checkable standard: every record needs a SOC code, a sponsorship field, a liveness signal, and a
  timeline factor.
- **The failure the data hides (Mode).** In `SEC_DOL_H1b_data_mapped.csv` (30,369 rows), I count the
  healthcare-sector companies as the industries *Other Health Care, Biotechnology, Pharmaceuticals,
  Hospitals and Physicians,* and *Health Insurance*. Of those, only 288 of 4,745 (~6%) carry any
  `Total Approvals` H-1B record (re-verified 2026-07-27; a prior 2026-07-17 snapshot read 286 of
  4,623). So a blank sponsorship field means "no data," not "won't sponsor." For a seed or Series-A
  healthtech company, having no LCA record is the median case rather than a red flag. This count is
  not asserted — it is machine-checked: `node scripts/gigo-gate-check.mjs` reads the CSV directly
  (quote-aware parsing, filters to the five industries named above) and reproduces 288/4,745 exactly.
  The script is not vendored in this folder, since the CSV it reads already lives in the parent course
  repo this submission is checked out inside (`data/80-days-to-stay/data/...`); see
  `THIRD_PARTY_NOTICES.md`.
- **Echo (H-1B).** Wage level is set by the employer and the OES survey for a given SOC and metro, so
  it measures employer size and location, not the candidate.

## 3. Bias Audit, data to output (10 pts)  ·  *[Mode allocator-flip = live metric; H-1B = 2nd axis]*

**The flip.** The engine is symmetric. The same Ch.11 composite that reallocates my effort across
companies will, unchanged, reallocate a company's interview slots across candidates. Once you
re-point it, the 0.35 sponsorship term becomes the candidate's work-authorization score. The feature
that protects me as an applicant becomes a filter that starves the candidates who need sponsorship.
Run it with `node scripts/allocator-flip.mjs` (fixture: `sample-data/case-healthtech-candidates.json`,
report: `reports/allocator-flip-audit.md`).

**A quantitative metric, computed rather than asserted.** On one req with 5 interview slots and 10
applicants, allocating the slots top-K by composite:

| Metric (definition shown in the harness; matches fairlearn) | Value |
|---|---|
| Interview rate, no sponsorship needed | **100%** |
| Interview rate, needs sponsorship | **0%** |
| Demographic-parity difference | **1.00 (100 pp)** |
| Equal-opportunity difference (TPR, among fit ≥ 0.5) | **1.00** (100% vs 0%) |

The injustice is concrete. C1 (US-authorized, fit 0.15) gets an interview; C10 (needs sponsorship,
fit 0.95) does not. C9 and C10 even land in the *Interview* band and still get no slot, because the
five US-authorized applicants fill every slot first.

**This is not an artifact of my fixture. It is structural.** The work-auth penalty is
`(1.0 − 0.2) × 0.35 = 0.28`, while the entire fit contribution spans only `1.0 × 0.30 = 0.30`. So a
sponsorship-needing candidate has to score 0.933 higher on fit, on a scale that only reaches 1.0,
just to break even. The binary citizenship proxy is worth 93% of the whole merit range, which is why
the disparity is 100 pp for any realistic pool. (An earlier draft of mine claimed the term "strictly
dominates" fit; a machine check showed 0.28 < 0.30 and I corrected it. That is logged in the
Frictional Journal reflection.)

**Two fairness definitions in tension, and you cannot satisfy both.**
- *Demographic parity*: equal interview rate across groups. The only way to get it is to drop the
  0.35 work-auth term (the fit-only policy, which gives 40% vs 60%, DP diff 0.20). The cost is that
  the company abandons the sponsorship cost-screen it built the score to enforce.
- *Business necessity, or the group-blind form*: one formula, one threshold for everyone. The scorer
  already is this, and it still produces the 100-pp disparity, because the term is a citizenship
  proxy. Closing the gap while keeping the term would require group-specific thresholds, i.e.
  explicit disparate treatment. And down-ranking on work authorization is where anti-discrimination
  exposure lives (INA §274B / DOJ-IER). That is a human's call, not the engine's.

Bias enters through the **objective** here (a work-auth cost-screen encoded as a 0.35 vote), not
through the sampling or the labels. The highest-leverage place to intervene is the work-authorization
term itself: removing or capping it is the one change that actually moves the disparity, which is
precisely why it belongs to a human behind the hard-stop gate (§7).

**Second axis (H-1B case study).** The same mechanism shows up at the highest stakes, where a
wage-level-ranked lottery starves new grads (wage level I–II) and low-cost metros. See §5.

**The definition I enforce, and its cost.** I enforce demographic parity: work authorization must
not influence the ranking. I implement it by dropping the 0.35 work-auth term (the fit-only Policy
2), which cuts the demographic-parity difference from 1.00 to 0.20. Two costs come with that, and I
will name both. First, the company forfeits its sponsorship cost-screen, which is legally dubious
under INA §274B anyway, so arguably no legitimate loss. Second, the residual disparity is now driven
by `fit`, itself a confounded model judgment (résumé-writing skill, English fluency; see §5 Rung 2),
so parity on the surface does not buy fairness underneath. It fixes the citizenship proxy but leaves
the fit confound intact. One deployment note: this fairness choice governs the score, while §7's
hard-stop governs whether the allocator runs at all, which unattended it does not.

## 4. Explainability & Its Critique (10 pts)  ·  *[Mode]*

**Method, and why it is exactly faithful.** The composite is a linear-additive model,
`Σ(value·weight) × gates`, so I do not need SHAP's sampling approximation. For an additive model the
Shapley attribution of each term coincides exactly with its per-term contribution `value·weight`
(against a zero baseline). The scorer already emits that as its `trace` block: value, weight,
contribution, source, and the full arithmetic. So the explanation is provably faithful to the model,
which is the Ch.11 auditability guarantee. That sets up the real problem below. Faithful is not the
same as adequate.

**Worked explanation (Omada Health, Product Manager, Billing; composite 0.338 → Consider):**

| Term | Value | Weight | Contribution | Source |
|---|---|---|---|---|
| sponsorship | 0.60 | 0.35 | 0.210 | record |
| fit | 0.55 | 0.30 | 0.165 | **model-judgment** |
| role_quality | 0.00 | 0.00 | 0.000 | record |
| × liveness 1.0 × timeline 0.9 | | | ×0.9 | |
| **composite** | | | **0.338** | |

The explanation is correct to the arithmetic. Here is where it still misleads.

**Case 1: the shown-but-inert feature.** The human report surfaces a role-quality signal. For SOC
15-1299.09 the BLS `cognitive_pivot_score` is 3.861 (verified in `soc_occupation_compact.csv`;
13-1111.00 is 4.013). A reader who sees a role-quality number in the report reasonably assumes it
informed the recommendation. It did not. Its weight is 0.0, so its contribution is exactly 0.000. The
explanation is technically accurate, since the number is real and really displayed, and it is
practically misleading, since it implies an influence that is zero. What the explanation shows, a
role-quality score, and what the recommendation used, nothing, come apart.

**Case 2: false precision that flattens record against judgment.** `fit` contributes 0.165 with the
same typographic authority as sponsorship's 0.210. But sponsorship is a record and fit is a model
judgment, a keyword CV-vs-JD comparison. Ch.11 (§"What the machine could not know") names exactly
this: the fit score "undersells you because your one unusual project is exactly what this team needs
and no keyword in the job description captured it." The explanation attaches a two-decimal number to
a quantity whose input is unreliable for exactly the non-standard candidate this tool serves. Domain
knowledge says treat fit as soft; the decomposition renders it hard. The `trace` labels the source,
which mitigates this, but any downstream view that shows only the numbers (a ranked table, a UI)
loses the record-versus-judgment seam that Ch.11 says is the whole point.

**Allocator inversion (the flip, §3).** For candidate C10's rejection, the faithful explanation reads
"work-authorization contributed 0.07 versus a US-authorized candidate's 0.35, the decisive term." The
explanation works perfectly, and its working perfectly is what exposes the discrimination. Usually we
want an explanation to be faithful. Here faithfulness is the indictment: a technically flawless
account of an unlawful basis for the move.

**Uncertainty note (woven, per the rubric).** The explanation shows point contributions with no error
bars, so it cannot express that the fit input is a judgment carrying wide uncertainty. I would not
trust it on any recommendation whose decisive term is `fit` for a non-standard profile. The
decomposition looks just as crisp as one driven by a record, and that crispness is false comfort.

## 5. Causal & Counterfactual Reasoning: Pearl's Three Rungs (15 pts)  ·  *[H-1B Rungs 1–2; Mode Rung 3]*

**A reallocation is a causal claim.** Every "move Q from A to B" asserts that moving it will produce
a better outcome. At each altitude that claim reads:
- *Mode:* reallocating my two hours from company A to company B produces a better job-search outcome.
- *Allocator flip:* reallocating an interview slot from candidate A to candidate B produces a better hire.
- *H-1B:* reallocating a visa slot to the higher-wage petition produces a better labor-market outcome.

As the book's themes section puts it (*The Fundamental Themes*, §"Edge orientation"), a correlation
between a signal X and outcome Y "is equally consistent with X causing Y, Y causing X, or a common
cause Z producing both. Choosing the right structure requires knowledge the data does not contain."
The three rungs test which one my engine actually earns.

### Rung 1: Observation (what correlates with a good outcome)
- *H-1B (the reform's asserted correlation).* Higher OES wage level correlates with the presumed
  good outcome, meaning greater "economic contribution" and less program abuse. This is the policy
  rationale's claim, not a figure I computed; verifying it would require the DOL LCA petition data
  (public source cited in §Provenance, not ingested, since this engine is specified rather than built).
- *Mode.* The engine assumes stronger sponsorship history and higher fit correlate with the presumed
  good outcome, a response or an offer. But my worked run observed no outcome at all. It recorded
  Apply 0 / Consider 2 / Skip 1 with zero responses logged, so the correlation is asserted by the
  engine's design, not measured in my data. (Ch.15 reports tier predictiveness as an illustrative
  example; that is the book's figure, not mine.) This missing outcome is the Rung 3 gap below.

### Rung 2: Intervention (would reallocating actually produce the outcome?)
This is where the engine's confounders live, and naming them is the point.

*H-1B.* Would forcing selection toward high-wage petitions produce more contribution? The wage-level
signal is confounded by several things:
- **Metro cost-of-living.** A Level-II wage in San Francisco exceeds a Level-IV wage in Omaha, so
  "rank by wage" silently ranks by location, not merit.
- **Employer size and deep pockets.** Large firms pay more for the identical role, so the signal
  tracks employer balance sheets, not candidate value.
- **SOC, industry, and career stage.** Senior and high-wage-industry petitions dominate regardless
  of individual contribution.
- **A feedback loop that dissolves the signal under intervention.** Once selection depends on wage
  level, employers reclassify the same job upward to win slots, a costless and documented gaming
  move. The correlation that held under observation evaporates the moment you intervene on it, which
  is the textbook reason an observational quantity is not an interventional one.

So under intervention you do not buy more contribution. You buy more big-employer, high-metro, senior
hires. You have selected on the confounders, not the cause.

*Mode and allocator.* The `fit` term (weight 0.30) is a language model comparing a CV to a JD, which
Ch.11 labels a model judgment, not a record. It is confounded by keyword-legibility, résumé-writing
skill, and English fluency, all proxies for pedigree, class, and national origin. The company
believes it reallocates interview slots on fit; it reallocates on those confounds. And
`P(sponsorship)` is drawn from LCA/H-1B history that lags reality. A company that "just began
sponsoring last month" (Ch.11) still reads as a non-sponsor, so even the record term is an
observational snapshot, not the interventional truth about whether they will sponsor me now.

### Rung 3: Counterfactual (one specific past case)
The case is real. The posting `omada-apm-data-governance` was verified live on 2026-06-21 and scored
a strong fit of 0.75. By 2026-07-17 it had expired, so the engine gave it composite 0.000 and Skip.
The counterfactual question: had the engine surfaced it in time and I had applied, what would have
happened?

The answer is that it is unidentifiable, and that is the finding. I never observe the outcome of a
role I did not apply to. I only ever see the factual branch, the roles I pursued, never the
counterfactual one, the roles I skipped. Estimating what would have happened means assuming the
outcome is a stable function of the observed factors (sponsorship, fit, liveness, timeline) and that
nothing unobserved moved it: not the hiring manager's priorities, not an internal referral, not a
hiring freeze. Those are exactly the things Ch.11's "what the machine could not know" says the score
cannot see. This is the data/outcome gap I predicted in the Frictional Journal as the hardest
failure. There is no observed outcome variable anywhere in my data, so no Rung 3 counterfactual is
identified. Substituting a proxy outcome like H-1B approval rate or offered wage would only correlate
an input with an input.

The higher-stakes twin is on the allocator side. Candidate C10 (fit 0.95, needs sponsorship) was
rejected. Had the work-auth penalty not applied, C10 gets interviewed. Would the hire have been
better? Unobservable for the same reason, except here the unobserved counterfactual is someone's job.

### Honest verdict
The engine reallocates on correlation dressed as causation. The record terms (sponsorship history)
carry a thin but genuinely interventional core: a company that files LCAs really is more likely to
sponsor. The load-bearing terms, fit and, in the H-1B case study, wage level, are confounder-
dominated, and the whole apparatus optimizes a presumed outcome it never observes. My pre-build
prediction was ~35% causally valid; after naming the confounders and finding the missing-outcome
gap, my post-build estimate is still ~35%. I read that prediction as well-calibrated. I anticipated a
correlation-dominated engine with only a thin causal core, and the build bore it out rather than
surprising me in either direction. Per the assignment, stating this plainly scores higher than
defending a causal claim the data cannot support, and it is the honest answer.

## 6. Adversarial Robustness & Fragility (8 pts)  ·  *[Mode: run empirically; allocator: reasoned; H-1B: specified]*

### Perturbation 1: a stale liveness signal (run, empirical)
The perturbation is small and realistic: flip one bit, the expired posting's liveness, from its true
`0.0` to `1.0`, modelling a detector that fails to notice a posting has gone dead. This is not
hypothetical. The worked run attests (2026-07-17) that this exact posting was verified live on
2026-06-21 and 302-redirected to an error page three weeks later. Liveness signals genuinely drift,
so a detector lagging that drift is the realistic failure.

**Reproduce:**
```
node scripts/score/role-scorer.mjs sample-data/case-healthtech-pm-opt-roles.json --profile sample-data/case-healthtech-pm-opt-profile.json          # baseline
node scripts/score/role-scorer.mjs sample-data/case-healthtech-pm-opt-roles-PERTURBED-liveness.json --profile sample-data/case-healthtech-pm-opt-profile.json  # perturbed
```

**Result: the recommendation flips.**

| Liveness | Composite | Recommendation | Rank among the 3 roles |
|---|---|---|---|
| true `0.0` (dead) | 0.000 | **Skip** (gated) | last |
| stale `1.0` | **0.392** | **Consider** | **#1, above both genuinely-live roles** |

A single wrong bit reallocates my scarce effort onto a fiction and ranks it above the two real
openings. This is the failure a human would not catch: the perturbed row looks entirely plausible,
with strong sponsorship, good fit, and a "live" flag, and nothing in the number betrays that the
posting is gone.

### Why this is the whole architecture, not a corner case
This is exactly why liveness is a gate (a multiplier), not a vote. The dead role's vote-sum is 0.435
(`0.6·0.35 + 0.75·0.30`), the highest of any role in the set. Only the `×0` gate holds it down.
Ch.16's documented build bug is the same failure seen from the code side, "a role past your OPT
window scoring Consider" (line 244), a gate silently acting as a weighted vote. So the fragility and
the §7 hard-stop are the same concern: the gate has to be verified to actually zero the composite,
not merely to be present. A gate that has quietly degraded into a vote fails silently and
confidently. (Related: a Greenhouse URL-resolution bug, `boards.` versus `job-boards.`, which I
worked around locally rather than fixing upstream.)

### Perturbation 2: fit noise on the allocator flip (reasoned, two-sided)
`fit` is a model judgment, and a realistic ±0.10 of noise sits well within its error. The effect
splits in two.
- **The injustice is robust.** Which group gets starved does not move. The work-auth term dominates
  fit by 93% of the merit range (§3), so no fit perturbation within [0,1] lets a sponsorship-needing
  candidate overtake a US-authorized one (the structural proof lives in `allocator-flip.mjs`).
- **The individual ranking is fragile.** Which candidate takes the last slot flips easily under
  ±0.10 fit noise, because the within-group composites sit within a tenth of each other. The tool
  presents a confident, precise ranking over quantities that are noise at the individual level. That
  is the specific fragility a resource-mover has to disclose.

### Perturbation 3: the H-1B gaming loop (specified)
Bump one petition's wage level from II to III, which is costless on paper and a documented employer
behavior. The wage-ranked selection set flips toward the reclassified petition, while the random
lottery has nothing to game. This is the feedback loop from §5 Rung 2: intervening on the signal
destroys it.

### Honest limits: what I did not test
One profile, three real roles, ten synthetic candidates. I did not fuzz the SEC/DOL name-join, did
not test at scale, and did not adversarially probe the fit model itself, only its downstream weight.
The liveness result is empirical; Perturbations 2 and 3 are reasoned or specified, not run live.

## 7. Delegation Map + the Hard-Stop Gate (10 pts)  ·  *[Mode implemented; allocator + H-1B specified]*

### Delegation map (per component: tool decides · human decides · override point)

| Component | Tool decides | Human decides | Explicit override / handoff |
|---|---|---|---|
| Data ingest (SEC/DOL/BLS/ATS) | fetch, parse, join | whether the data clears the GIGO gate (§2) | human clears/rejects the gate; only ingest scripts touch the network |
| Sponsorship term | computes `P` from records | reads Unknown-vs-Avoid ambiguity | **override with a logged reason** when holding private info the record lags |
| Fit term | proposes a model judgment | verifies vs the real JD / the unusual project | human downgrades a fit the keywords missed (§4 Case 2) |
| Liveness gate (Ch.8) | live/ghost/`investigate` | resolves every `investigate` | human check before any effort is spent |
| Timeline gate (Ch.10) | computes factor ∈ [0,1] | n/a | **immigration-law calls go to the DSO/attorney; the engine never asserts STEM eligibility** |
| Composite recommendation | ranks Apply/Consider/Skip | whether to act at all | the Override, below |
| **The move** (submit / interview / grant) | **nothing; no execution path exists** | **executes, or not** | **the hard stop, below** |

### The Override is enforced in code, not just documented
The scorer accepts a human override but ignores any override that lacks a documented reason.
`role-scorer.mjs` (lines 114–120) attaches a `_warning` and falls back to the machine recommendation
when `override.reason` is empty. Ch.11's rule, that "an override without a documented reason is just
ignoring the math because you like the company," is a runtime control here, not a suggestion. This is
the one place where the human's judgment has to be legible before it counts.

### The hard-stop gate: which move, and why it is non-negotiable
The assignment names three triggers: spends money, commits a resource, or changes a person's access.
This engine's move hits the last two, and the stakes climb across the three altitudes.

| Altitude | The move | Trigger it hits | Status | Response · who resolves |
|---|---|---|---|---|
| **Mode (applicant)** | submit an application (commits my hours; puts my name forward) | commits a resource | **implemented** | The tool emits a recommendation only and has no submit capability (blocked by construction). I write and send. |
| **Allocator (company)** | interview / hold / reject a candidate | **changes a person's access** (to a job) | **specified** | **Block auto-reject.** Every Reject/Hold on a real candidate requires a human, and the work-authorization basis is **flagged for legal review** (INA §274B / DOJ-IER) before any action. |
| **H-1B (government)** | grant a visa slot | **changes a person's access to the country** | **specified** | Engine may **rank** (advisory only); a named USCIS adjudicator clears any **grant**. No autonomous grant path exists. |

**Why the gate is non-negotiable.** The failure it prevents is the one where "it ran unattended and
moved the resource": an auto-rejected candidate, or an auto-granted slot, with no human in the loop.
At the allocator and government altitudes the move changes a person's access, and the deciding term
is a citizenship-status proxy (§3) whose faithful explanation (§4) describes an unlawful basis. So
unattended execution is not merely risky here; it is the specific harm. Ch.16's ethics gate states
the rule the same way: "if a run would breach either gate, you don't run it." And §6's gate-as-vote
bug shows the concrete way a hard stop silently degrades into a mere vote, which is why the gate has
to be verified to actually stop, not just to be present.

**What is genuinely built versus specified.** The Mode's hard stop is structural: there is no
execution path in `role-scorer.mjs`, and the override control is enforced. The allocator and H-1B
hard stops are precisely specified, not implemented. I ran the allocator audit, never a live
rejection pipeline, and I built no visa system. The assignment permits specifying an out-of-scope
gate, and naming what I did not build is itself part of the honesty (see the AI Use Disclosure).

---

## Uncertainty communication (woven through §1, §4, and the video)

**The visualization that shows the uncertainty:** [`figures/uncertainty-figure.html`](figures/uncertainty-figure.html)
(D3 v7, follows `brutalist/DESIGN.md`; open it in a browser). It is a per-role decomposed composite
bar. Each bar is stacked by term and colored by source: sponsorship (a record) solid, `fit` (a model
judgment) hatched red with a ±0.10 error bar, and `role_quality` flagged in the legend as weight 0,
computed but never counted. The expired posting is drawn collapsed to zero and labelled GATE CLOSED,
with a dashed ghost rising to 0.392 to show what a stale liveness bit would wrongly score (§6). One
picture carries three facts the point score hides: how much of the recommendation rests on a guess
(the hatched `fit` slice is often most of the bar, and for Oula the majority), that a term is
displayed yet inert, and that a single gate can zero the whole bar. The companion reading is the
skip-rate dial (Ch.15): the recommendation is trustworthy as a filter only when the run skips at
least 50%.

**The plain sentence a non-specialist should trust:** "This tool tells you where not to waste your
limited hours. It does not tell you that you'll get the job. Its most confident-looking number leans
on a guess about how well you fit that it cannot verify, and it is worthless until a live check
confirms the posting is even real."

**Where I would not trust this tool.**
- When `fit` is the swing term for a non-standard profile (§4). The decomposition looks just as crisp
  as a record-driven one, and that crispness is false comfort.
- When a sponsorship field is blank (§2). That is no data, not "won't sponsor." About 94% of
  healthcare companies read blank, so treating it as a signal inverts the correct read.
- For the individual ranking on the allocator side (§6). Which candidate takes the last slot flips
  under ±0.10 fit noise; only the group-level disparity is robust.
- Any composite where the gate has not been verified to actually zero (§6). A gate silently behaving
  as a vote fails confidently and invisibly, which is the highest-stakes failure in the system.

---

## AI Use Disclosure

**Tools used:** Claude (Claude Opus), via Claude Code.

**Portions assisted:** the allocator-flip tool (`allocator-flip.mjs`), the synthetic candidate
fixture, the fairness-metric computations, the liveness perturbation, the D3 uncertainty figure, and
the first-pass drafting of all seven report sections.

**How used:** I used Claude to draft the tool, the first-pass validation, and the figure. I directed
the work. I chose the domain (people and time, first application effort and then the interview-slot
flip) and the Chapter 11 anchor, and I made the judgment calls the tool cannot make: the
demographic-parity fairness choice and its cost (§3), the roughly 35% causal verdict (§5), the
objective framing (§1), and the timestamped hardest-failure prediction (Frictional Journal).

**What I changed:** I ordered two verification passes over the AI's draft, and they surfaced five
load-bearing errors the model had stated confidently. Each was corrected under my direction:
1. a false claim that work authorization "strictly dominates" fit (the arithmetic showed 0.28 < 0.30,
   so it does not; replaced with the precise "+0.933 fit-gap needed");
2. a misquoted Chapter 11 line ("no keyword captured it," corrected to the verbatim "no keyword in
   the job description captured it");
3. a stale data count (286 of 4,623, corrected to the reproducible 288 of 4,745 with the filter
   documented);
4. an invented empirical claim ("the tiers looked predictive in the worked run," when my run logged
   no outcomes at all);
5. a mis-styled citation ("Ch.97," corrected to the section *The Fundamental Themes*).

Finding these was the point of the assignment. The fluent draft was confidently wrong in five places,
and only supervision caught them.

**What the AI could not do:** The model treated the scorer's `fit` term as authoritative and let it
keep a near-zero-sponsorship role above threshold. I know `fit` is a keyword CV-vs-JD comparison that
cannot see my one unusual project, and from being in this OPT pipeline I know that "no H-1B record"
for a seed-stage healthtech company is the median case, not a red flag. The correlation it optimized
would not survive the intervention.

---

## Provenance & data sources
- `SEC_DOL_H1b_data_mapped.csv` (SEC Form D, DOL LCA, USCIS H-1B): public government record.
- `soc_occupation_compact.csv` (BLS/O*NET): public.
- `case-healthtech-pm-opt-{roles,profile}.json`: synthetic fixtures, no personal data.
- H-1B case study, the DOL LCA disclosure files (public; DOL Office of Foreign Labor Certification,
  petition-level, with wage level, SOC, and worksite). This is the source the wage-level analysis in
  §5 through §7 would draw on. It was not ingested for this submission, because the H-1B engine is
  specified rather than built (§5 Rung 2, §7), so no petition-level data was fetched. Citing the
  source without running the ETL keeps the case study honest about what is analysis and what is
  implemented.
- No outcome variable is observed anywhere; see the Frictional Journal prediction and §5 Rung 3.
