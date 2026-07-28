# Frictional Journal · The Reallocation Engine, Audited

## Prediction (written BEFORE building)

**Timestamp:** 2026-07-27 14:31:22 EDT

**What I am building.** One scorer at three altitudes of stakes. First, my healthtech-PM job-search
mode, which is the running tool, anchored to Ch. 11, *The Bayesian Role Scorer*. Second, the same
scorer flipped to the allocator's side, where a company reallocates interview slots across
candidates. Third, the H-1B lottery as a worked case study, where a government reallocates a fixed
cap of visa slots across applicants. The claim I expect to end up interrogating is that the engine
optimizes a confounded correlation and calls it merit at every level.

**My prediction of the hardest failure.** The data/outcome gap. Every dataset I have describes inputs
(does a company sponsor, is a role live, what wage level a petition carries), and none of it records
an outcome (did an application get a response, did a hire succeed, did a visa recipient contribute).
I expect the hardest part will be that I cannot ground the causal and fairness claims in an observed
outcome, because I only ever see outcomes for the roles I applied to and never the counterfactual for
the ones I skipped. I predict I will be tempted to substitute a proxy outcome like H-1B approval rate
or offered wage, and I will have to resist it, because the proxy is itself an input. That would just
be correlating an input with an input and calling it validation.

**My predicted causal validity of the engine: about 35%.** I expect to conclude the engine is mostly
correlation with only a thin interventional core. Some of the sponsorship signal is probably
genuinely predictive, but the fit term and the wage-level term are dominated by confounders like
keyword-legibility, résumé skill, metro cost-of-living, and employer size. I do not expect to defend
a majority-causal claim honestly.

**Confidence in this prediction.** I will put it at the 35% figure above. I have moderate confidence
in the direction (correlation-dominated) and lower confidence in the exact number.

---

## Build log: raw material for the reflection (facts, timestamped as they happen)

- **2026-07-27, overclaim caught by the machine.** In the allocator-flip audit I first wrote that the
  work-authorization term "strictly dominates" fit. The structural check computed `0.28 < 0.30`
  (penalty below fit span), so the claim was false and dominance is not universal. I corrected it to
  the true statement: a sponsorship-needing candidate must score +0.933 higher in fit (93% of the
  merit range) to overcome the penalty. Calibration note for the reflection: I reached for a clean
  absolute before checking the arithmetic, which is the fluency trap the book names in Ch. 1.

## Reflection (written AFTER building)

**Timestamp:** 2026-07-27 15:49:30 EDT

**What actually happened.** The data/outcome gap I predicted as the hardest failure did materialize,
and it landed exactly where I expected, in the causal section. There is no observed outcome anywhere
in my data, so the Rung 3 counterfactual (what if the engine had reallocated differently?) is
unidentified. I resisted the temptation I had flagged, substituting a proxy outcome like offered
wage, and named the gap instead. My causal-validity estimate came out at about 35%, essentially the
number I wrote before building. The record-based sponsorship term carries a thin interventional core,
and the load-bearing terms (fit, wage level) are confounder-dominated.

**Where my prediction was wrong, or at least incomplete.** I was well-calibrated on the thing I know,
the data's limits and the causal verdict. But I under-predicted where the real difficulty would come
from. The hardest and most surprising work was not wrestling the thin data, which I saw coming. It
was catching the AI's confident errors. Two verification passes over the fluent draft surfaced five
load-bearing mistakes the model had stated with total confidence: a false "strictly dominates" claim
that the arithmetic contradicted, a misquoted chapter line, a stale statistic (286/4,623 instead of
the reproducible 288/4,745), an invented empirical claim about my own run, and a mis-styled citation.
I predicted the data would be treacherous. I did not predict that the tool describing the data would
be the bigger trap. A second, smaller surprise: the allocator-flip disparity turned out to be
structural, a provable inequality where the citizenship proxy is worth 93% of the entire merit range,
rather than an artifact of the numbers I happened to pick. That was a cleaner result than I expected.

**What this says about my calibration.** My instinct correctly distrusted the data. It should have
distrusted the fluent draft just as much. I braced for a messy dataset and was well-calibrated there,
but I over-trusted the model's own output until I forced it to check itself, which is exactly the
fluency trap the book names in Chapter 1, this time experienced firsthand. The lesson I am taking
forward is that the confidence of an output tells you nothing about its correctness, and the
verification pass is not cleanup at the end. It is the work. Next time I will schedule the skeptical
pass first, instead of reaching for it once the draft already looks finished.
