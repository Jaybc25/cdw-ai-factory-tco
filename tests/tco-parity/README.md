# TCO Excel-to-JavaScript Parity Gate

This folder supports the permanent parity check between the checked-in validated TCO workbook and the production JavaScript TCO engine.

The quality gate performs three steps:

1. `scripts/extract_tco_workbook_snapshot.py` reads `docs/reverse-tco-model-v1.xlsx` directly from the repo checkout and produces a deterministic JSON snapshot of workbook cells, formulas, and cached values.
2. `scripts/run_tco_parity.mjs` reads the canonical `EngineRegression` fixture and expected values from that snapshot, extracts the named production engine constants/functions from `src/TcoCalculator.jsx`, and executes the current production engine in Node.
3. The runner compares the 20 canonical regression outputs using the workbook's `MAX($1, 0.01%)` tolerance for continuous numeric outputs. Discrete system counts must match exactly, and text/crossover outputs must match exactly.

The generated `workbook_snapshot.json` is a CI artifact and is not intended to become a second source of truth. The `.xlsx` workbook remains the auditable reference artifact.

A parity failure should be investigated before changing either implementation. Classify the cause as one of:

- test-harness mapping/instrumentation defect;
- intentional web-only extension outside workbook scope;
- workbook defect or stale fixture;
- JavaScript engine defect.

Do not change production math merely to make a test green without identifying which category applies.

## Release baseline rule

A formal known-good suite release should not be tagged from a TCO-affecting source baseline unless the GitHub quality gate passes the production build, final workbook-structure check, all 20 canonical Excel-to-JavaScript parity comparisons, and the current live Vercel Playwright regression suite. Credentialed auth/email/Slack/report-PDF checks remain a separate release-specific layer when those paths are changed.
