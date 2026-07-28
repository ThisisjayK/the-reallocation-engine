#!/usr/bin/env node
// gigo-gate-check.mjs: reproduces the §2 GIGO-gate statistic — the hidden assumption
// that a blank H-1B/LCA "Total Approvals" field means "won't sponsor," when for most
// small/early-stage healthtech companies it means "no record in this dataset."
//
// It reads SEC_DOL_H1b_data_mapped.csv (public SEC Form D + DOL LCA data, unmodified),
// filters to the healthcare-industry slice, and counts how many of those rows carry
// any H-1B approval record at all. This file is NOT vendored into this submission
// folder — it already lives in the parent course repo this submission is checked out
// inside (data/80-days-to-stay/data/...), so this script only runs from within a full
// checkout of that repo, not from a standalone copy of this folder alone.
//
// Usage: node scripts/gigo-gate-check.mjs [path/to/SEC_DOL_H1b_data_mapped.csv]

import { readFileSync, existsSync } from "node:fs";

const DEFAULT_PATH = "../../../../data/80-days-to-stay/data/SEC_DOL_H1b_data_mapped.csv";
const csvPath = process.argv[2] ?? DEFAULT_PATH;

if (!existsSync(csvPath)) {
  console.error(`Could not find the CSV at: ${csvPath}`);
  console.error("");
  console.error("This check reads data/80-days-to-stay/data/SEC_DOL_H1b_data_mapped.csv,");
  console.error("which is part of the full course repo (nikbearbrown/the-reallocation-engine)");
  console.error("this submission is checked out inside — it is not vendored into this");
  console.error("submission folder (see THIRD_PARTY_NOTICES.md). If you copied only this");
  console.error("folder out of the repo, this specific check cannot run standalone; pass");
  console.error("the CSV's path explicitly:");
  console.error("  node scripts/gigo-gate-check.mjs /path/to/SEC_DOL_H1b_data_mapped.csv");
  process.exit(2);
}

// quote-aware CSV line splitter — a naive split(",") misaligns columns on rows with
// embedded commas (e.g. "Jory O. Bell, Marc O. Foster..." in executive_officers).
function parseCSVLine(line) {
  const out = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQuotes) {
      if (c === '"') {
        if (line[i + 1] === '"') { cur += '"'; i++; }
        else inQuotes = false;
      } else cur += c;
    } else {
      if (c === '"') inQuotes = true;
      else if (c === ",") { out.push(cur); cur = ""; }
      else cur += c;
    }
  }
  out.push(cur);
  return out;
}

const HEALTHCARE_INDUSTRIES = [
  "Other Health Care",
  "Biotechnology",
  "Pharmaceuticals",
  "Hospitals and Physicians",
  "Health Insurance",
];
const TARGET = new Set(HEALTHCARE_INDUSTRIES);

const raw = readFileSync(csvPath, "utf8");
const lines = raw.split(/\r?\n/).filter(Boolean);
const header = parseCSVLine(lines[0]);
const idxIndustry = header.indexOf("industry");
const idxApprovals = header.indexOf("Total Approvals");
if (idxIndustry < 0 || idxApprovals < 0) {
  console.error(`Expected columns "industry" and "Total Approvals" not found in ${csvPath}`);
  process.exit(2);
}

const perIndustry = {};
let totalRows = 0;
let totalHealthcare = 0;
let withApprovalRecord = 0;

for (let i = 1; i < lines.length; i++) {
  totalRows++;
  const row = parseCSVLine(lines[i]);
  const industry = row[idxIndustry];
  if (!TARGET.has(industry)) continue;
  totalHealthcare++;
  perIndustry[industry] = (perIndustry[industry] ?? 0) + 1;
  const approvals = row[idxApprovals];
  if (approvals !== undefined && String(approvals).trim() !== "") withApprovalRecord++;
}

const pct = (withApprovalRecord / totalHealthcare) * 100;

console.log(`Rows in ${csvPath}: ${totalRows.toLocaleString()}`);
console.log(`Healthcare-sector rows (${HEALTHCARE_INDUSTRIES.join(", ")}): ${totalHealthcare.toLocaleString()}`);
for (const [industry, n] of Object.entries(perIndustry).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${industry}: ${n}`);
}
console.log(`Of those, rows with ANY "Total Approvals" value: ${withApprovalRecord} (${pct.toFixed(1)}%)`);
console.log("");
console.log(
  `=> ${withApprovalRecord} of ${totalHealthcare} (~${pct.toFixed(0)}%) healthcare-sector companies ` +
  `carry an H-1B approval record. A blank field for the other ~${(100 - pct).toFixed(0)}% means ` +
  `"no LCA record in this dataset," not "won't sponsor" — the GIGO-gate finding in §2.`
);
