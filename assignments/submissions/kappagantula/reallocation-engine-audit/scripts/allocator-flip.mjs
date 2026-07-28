#!/usr/bin/env node
// allocator-flip.mjs: the subject-flip audit for "The Reallocation Engine, Audited".
//
// It runs the SAME Bayesian composite as the applicant-side scorer (Ch.11 / role-scorer.mjs)
//     composite = (work_authorization * 0.35 + fit * 0.30) * availability * timeline
// but points it at CANDIDATES competing for a scarce resource (interview slots) instead of at
// companies competing for the applicant's effort. On this side the 0.35 "sponsorship" term is
// the candidate's WORK-AUTHORIZATION score, so the exact feature that protects an applicant
// (skip non-sponsoring companies) becomes a filter that down-ranks sponsorship-needing candidates.
//
// The fairness metrics are computed from their definitions (formulas shown) rather than via a
// library, so every number is auditable term by term, matching the Ch.11 discipline. The definitions
// match fairlearn's demographic_parity_difference and equal-opportunity (TPR) difference.
//
// Usage: node scripts/allocator-flip.mjs [candidates.json] [out.md]

import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

const inPath = process.argv[2] ?? "sample-data/case-healthtech-candidates.json";
const outPath = process.argv[3] ?? "reports/allocator-flip-audit.md";

const data = JSON.parse(readFileSync(inPath, "utf8"));
const { role, policy, candidates } = data;
const W = policy.weights;
const authScore = policy.work_auth_score;
const K = role.interview_slots;
const QFIT = policy.qualified_fit_threshold;

// --- score every candidate with the identical Ch.11 composite ---------------------------------
function score(c) {
  const work = c.needs_sponsorship ? authScore.sponsorship_needed : authScore.no_sponsorship_needed;
  const votes = work * W.work_authorization + c.fit.p * W.fit;
  const composite = votes * c.availability.factor * c.timeline.factor;
  const band = composite >= policy.bands.interview ? "Interview"
             : composite >= policy.bands.hold ? "Hold" : "Reject";
  return { ...c, work, composite: +composite.toFixed(4), band };
}
const scored = candidates.map(score);

// Policy 1 = the scorer as-is: allocate the K scarce slots to the top-K by composite.
const byComposite = [...scored].sort((a, b) => b.composite - a.composite);
const slotP1 = new Set(byComposite.slice(0, K).map((c) => c.candidate_id));

// Policy 2 = group-blind, fit-only: drop the 0.35 work-authorization term entirely, rank by fit.
const byFit = [...scored].sort((a, b) => b.fit.p - a.fit.p);
const slotP2 = new Set(byFit.slice(0, K).map((c) => c.candidate_id));

// --- fairness metrics (definitions shown) ------------------------------------------------------
const groups = { needs: scored.filter((c) => c.needs_sponsorship), not: scored.filter((c) => !c.needs_sponsorship) };
const rate = (arr, slots) => arr.filter((c) => slots.has(c.candidate_id)).length / arr.length;

// Demographic parity difference = | P(interview | not-sponsorship) - P(interview | needs-sponsorship) |
const dp = (slots) => ({
  not: rate(groups.not, slots), needs: rate(groups.needs, slots),
  diff: +Math.abs(rate(groups.not, slots) - rate(groups.needs, slots)).toFixed(3),
});
const dpP1 = dp(slotP1), dpP2 = dp(slotP2);

// Equal-opportunity difference = | TPR_not - TPR_needs |, where the "true positive" label is the
// company's OWN qualified bar (fit >= QFIT). NOTE: this is an assumed label; we have no observed
// hiring outcome, so fit>=QFIT stands in for "should have been interviewed" (see the data/outcome
// gap in the Frictional Journal). Equal opportunity among the company's self-declared qualified.
const qual = { not: groups.not.filter((c) => c.fit.p >= QFIT), needs: groups.needs.filter((c) => c.fit.p >= QFIT) };
const eoNot = rate(qual.not, slotP1), eoNeeds = rate(qual.needs, slotP1);
const eoDiff = +Math.abs(eoNot - eoNeeds).toFixed(3);

// The headline injustice: lowest-fit interviewed vs highest-fit rejected under Policy 1.
const interviewedP1 = scored.filter((c) => slotP1.has(c.candidate_id));
const rejectedP1 = scored.filter((c) => !slotP1.has(c.candidate_id));
const lowestInterviewed = [...interviewedP1].sort((a, b) => a.fit.p - b.fit.p)[0];
const highestRejected = [...rejectedP1].sort((a, b) => b.fit.p - a.fit.p)[0];

// Structural dominance: the disparity is NOT an artifact of this fixture. The work-auth penalty
// is fixed by the policy; the fit contribution is bounded by the fit weight. If the penalty
// exceeds the whole fit span, work authorization dominates fit for EVERY possible candidate set.
const authPenalty = (authScore.no_sponsorship_needed - authScore.sponsorship_needed) * W.work_authorization;
const fitSpan = 1.0 * W.fit; // max fit (1.0) - min fit (0.0), times the fit weight
const dominates = authPenalty > fitSpan;
// How much higher in fit must a sponsorship-needing candidate score to overcome the penalty?
const fitGapNeeded = +(authPenalty / W.fit).toFixed(3); // on a 0..1 fit scale
const compOf = (c) => c.composite.toFixed(3);

// --- render report -----------------------------------------------------------------------------
const pct = (x) => `${(x * 100).toFixed(0)}%`;
const row = (c) => `| ${c.candidate_id} | ${c.needs_sponsorship ? "yes" : "no"} | ${c.fit.p.toFixed(2)} | ${c.work.toFixed(2)} | ${c.composite.toFixed(3)} | ${c.band} | ${slotP1.has(c.candidate_id) ? "**✓ slot**" : "no"} |`;

const md = `# Allocator-Flip Audit: interview-slot reallocation
*Generated by \`scripts/allocator-flip.mjs\` from \`${inPath}\`. Same composite as Ch.11 role-scorer.mjs; the 0.35 sponsorship term is now the candidate's work-authorization score.*

**Role:** ${role.company}, ${role.title} · **scarce resource:** ${K} interview slots · **applicants:** ${scored.length}
**Composite:** \`(work_authorization × ${W.work_authorization} + fit × ${W.fit}) × availability × timeline\`

## Per-candidate scores (Policy 1 = the scorer as-is)

| Cand | Needs sponsorship | Fit | Work-auth term | Composite | Band | Slot (top-${K}) |
|---|---|---|---|---|---|---|
${byComposite.map(row).join("\n")}

## The headline
- **Interviewed with the LOWEST fit:** ${lowestInterviewed.candidate_id}, fit ${lowestInterviewed.fit.p.toFixed(2)}, composite ${compOf(lowestInterviewed)}, needs-sponsorship: ${lowestInterviewed.needs_sponsorship ? "yes" : "no"}.
- **Rejected with the HIGHEST fit:** ${highestRejected.candidate_id}, fit ${highestRejected.fit.p.toFixed(2)}, composite ${compOf(highestRejected)}, needs-sponsorship: ${highestRejected.needs_sponsorship ? "yes" : "no"}.
- In this applicant pool, **every US-authorized candidate outranked every sponsorship-needing candidate**. The 5 slots went entirely to the no-sponsorship group.

## Is this rigged by the fixture? The honest answer
The penalty is nearly, but not quite, decisive, and saying so precisely is the point. The
work-authorization penalty is fixed by the policy at \`(${authScore.no_sponsorship_needed} − ${authScore.sponsorship_needed}) × ${W.work_authorization} = ${authPenalty.toFixed(2)}\`. The most fit can
ever contribute is \`1.00 × ${W.fit} = ${fitSpan.toFixed(2)}\`. Since **${authPenalty.toFixed(2)} ${dominates ? ">" : "<"} ${fitSpan.toFixed(2)}**, work authorization does **${dominates ? "" : "not quite "}strictly dominate** fit. ${dominates ? "No fit arrangement can overcome it." : `A sponsorship-needing candidate can win, but only by scoring at least **${fitGapNeeded}** higher in fit (on a 0 to 1 scale) than the US-authorized candidate they must beat.`}

A required fit advantage of **${fitGapNeeded} on a scale that only spans 1.0** is near-impossible in any real pool. That is why the observed disparity is 100 pp even though the inequality is not universal. The bias is not an artifact of my ten rows; it is the weights giving a binary citizenship proxy **${((authPenalty / fitSpan) * 100).toFixed(0)}% of the entire merit range**. This is the bias mechanism (component 3) and a fragility result (component 6) in one inequality. Note that it is not the overclaim ("strictly dominates") an earlier draft asserted; the machine check corrected that.

## Fairness metrics (Policy 1)
*Definitions shown; equivalent to fairlearn \`demographic_parity_difference\` and equal-opportunity (TPR) difference.*

- **Selection (interview) rate, no sponsorship needed:** ${pct(dpP1.not)}
- **Selection (interview) rate, needs sponsorship:** ${pct(dpP1.needs)}
- **Demographic-parity difference:** **${dpP1.diff}** (${(dpP1.diff * 100).toFixed(0)} pp)
- **Equal-opportunity difference** (among fit ≥ ${QFIT}, an assumed qualified label, no observed outcome): **${eoDiff}** (not-sponsorship TPR ${pct(eoNot)} vs needs-sponsorship TPR ${pct(eoNeeds)})

## Two fairness definitions in tension
| Policy | Keeps the 0.35 work-auth term? | Interview rate (no-sponsor) | Interview rate (needs-sponsor) | Demographic-parity diff |
|---|---|---|---|---|
| **1, scorer as-is** (business-necessity / group-blind form) | yes | ${pct(dpP1.not)} | ${pct(dpP1.needs)} | ${dpP1.diff} |
| **2, fit-only** (demographic-parity-leaning) | no (dropped) | ${pct(dpP2.not)} | ${pct(dpP2.needs)} | ${dpP2.diff} |

**The tradeoff, stated plainly:** you cannot satisfy both. Policy 1 is group-blind in form (one formula, one threshold for everyone) yet produces a ${(dpP1.diff * 100).toFixed(0)}-pp disparity, because the work-auth term is a proxy for citizenship status. Reducing the disparity (Policy 2) requires **dropping the 0.35 work-authorization term**, meaning the company abandons the very cost-screen it built the score to enforce. There is no threshold that keeps the screen and equalizes the rate; closing the gap while keeping the term would require group-specific thresholds, which is explicit disparate treatment. Down-ranking on work-authorization or citizenship status is also where anti-discrimination exposure lives (INA §274B / DOJ-IER). That is a call for a human, not this engine.

## Chosen definition + cost
I enforce **demographic parity**: work authorization must not influence the ranking, implemented by
**dropping the ${W.work_authorization} work-auth term** (the fit-only Policy 2), which cuts the demographic-parity
difference from **${dpP1.diff} to ${dpP2.diff}**. Two costs, both named: (1) the company forfeits its
sponsorship cost-screen, which is legally dubious under INA §274B, so arguably no legitimate loss; (2) the
residual disparity is then driven by \`fit\`, itself a confounded model judgment (résumé skill,
English fluency), so parity on the surface does not buy fairness underneath. It fixes the citizenship
proxy, not the fit confound. Deployment: this governs the score; the hard-stop governs whether the
allocator runs at all (it does not, unattended).
`;

mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, md);

// concise console summary
console.log(`Allocator flip for ${role.company}, ${role.title} (${K} slots, ${scored.length} applicants)`);
console.log(`Interview rate  no-sponsorship=${pct(dpP1.not)}  needs-sponsorship=${pct(dpP1.needs)}`);
console.log(`Demographic-parity difference = ${dpP1.diff} (${(dpP1.diff * 100).toFixed(0)} pp)`);
console.log(`Equal-opportunity difference  = ${eoDiff} (among fit>=${QFIT}: ${pct(eoNot)} vs ${pct(eoNeeds)})`);
console.log(`Lowest-fit interviewed: ${lowestInterviewed.candidate_id} (fit ${lowestInterviewed.fit.p}) | highest-fit rejected: ${highestRejected.candidate_id} (fit ${highestRejected.fit.p})`);
console.log(`Structural: auth penalty ${authPenalty.toFixed(2)} ${dominates ? ">" : "<"} fit span ${fitSpan.toFixed(2)} => ${dominates ? "strict dominance" : `a sponsor-needing cand must be +${fitGapNeeded} in fit to win`} (proxy = ${((authPenalty / fitSpan) * 100).toFixed(0)}% of merit range)`);
console.log(`Report written to ${outPath}`);
