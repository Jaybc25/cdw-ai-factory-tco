# AI Factory Suite Release Record Template

Use this template when preparing a validated suite release. The primary durable destinations are the GitHub Release notes and the matching `CHANGELOG.md` entry. This template is internal record-keeping infrastructure and is not intended for prominent customer-facing display.

Do not create a stable release merely because code changed. A release represents a deliberately validated baseline.

## 1. Release identity

- **Suite release:** AI Factory Suite YYYY.MM[.N]
- **Git tag:** `vYYYY.MM[.N]`
- **Validated commit:** `<full commit SHA>`
- **Release date:** YYYY-MM-DD
- **Previous stable release:** `<tag>`
- **Comparison range:** `<previous tag>...<release commit>`
- **GitHub Release:** `<release reference>`
- **Release owner/reviewer:** `<name or role>`

### Status classification

- **Source-verified:** YES / NO / PARTIAL
- **Live-verified:** YES / NO / PARTIAL
- **Externally approved:** YES / NO / NOT REQUIRED / PENDING

Do not infer one status from another.

## 2. Release purpose

Summarize why this release exists in a few sentences. State the business, technical, data-maintenance, or assurance objective rather than simply listing commits.

## 3. Meaningful changes by area

Record only material changes. Small implementation-only commits can remain in Git history.

### AI Use Case Explorer

- `<change>`

### Open-Weight Model Advisor

- `<change>`

### GPU Sizing Tool

- `<change>`

### Cloud vs On-Prem TCO Calculator

- `<change>`

### AI Use Case ROI Calculator

- `<change>`

### AI Readiness Checklists

- `<change>`

### Combined Summary / reports

- `<change>`

### Shared platform / auth / state / infrastructure

- `<change>`

### Data pipelines / automation

- `<change>`

### Documentation / maintenance

- `<change>`

## 4. Why material changes were made

For any change that affects methodology, calculations, customer recommendations, routing, pricing, state/provenance, reports, or external integrations, record the reason.

| Change | Reason | Evidence / source |
| --- | --- | --- |
| `<change>` | `<why>` | `<source, audit finding, issue, or requirement>` |

## 5. Data state at release time

Capture the information state the software relied on when the release was validated.

### Pricing

- **NVIDIA / on-prem pricing last verified:** YYYY-MM-DD
- **Cloud GPU pricing last verified:** YYYY-MM-DD
- **Pricing provenance source file:** `src/pricingProvenance.js`
- **Pricing methodology/source changes in this release:** `<none or describe>`
- **Known EST / QUOTE / NODE-NORM items:** `<list or reference>`

### Model data

- **Hugging Face model-spec snapshot date/commit:** `<date / commit>`
- **Artificial Analysis capability snapshot date/commit:** `<date / commit>`
- **Canonical model registry state:** `<count or notable additions/removals>`
- **Discovery candidates reviewed:** YES / NO / NOT REQUIRED
- **NIM compatibility state:** `<manual / validated endpoint status>`

### GPU / performance data

- **Current on-prem purchase candidates:** `<classes>`
- **Performance anchors last reviewed:** YYYY-MM-DD or `<release/reference>`
- **Material provisional/estimated factors:** `<list>`

### Governance / readiness references

- **Primary-source content last materially reviewed:** YYYY-MM-DD or `<reference>`
- **Material standards/policy changes incorporated:** `<none or describe>`

## 6. Validation evidence

### Permanent quality gate

- **Production build:** PASS / FAIL
- **TCO Excel-to-JavaScript parity:** `<count>` PASS / FAIL / NOT APPLICABLE
- **Live Vercel Playwright regression:** `<count>` PASS / FAIL / NOT APPLICABLE
- **Workflow run/reference:** `<GitHub Actions run>`

### Additional source-level validation

- `<test or review and result>`

### Credentialed/manual live checks

Use only when the release scope requires them.

- **Magic-link authentication:** PASS / FAIL / NOT TESTED / NOT AFFECTED
- **Resend delivery:** PASS / FAIL / NOT TESTED / NOT AFFECTED
- **Database download event:** PASS / FAIL / NOT TESTED / NOT AFFECTED
- **Slack notification:** PASS / FAIL / NOT TESTED / NOT AFFECTED
- **Combined Summary authenticated path:** PASS / FAIL / NOT TESTED / NOT AFFECTED
- **Report/PDF visual inspection:** PASS / FAIL / NOT TESTED / NOT AFFECTED
- **Other:** `<result>`

### Validation exceptions

Document anything intentionally not tested and why.

## 7. Defects found and corrected during the release cycle

| Defect | Root cause | Correction | Validation |
| --- | --- | --- | --- |
| `<defect>` | `<root cause>` | `<fix>` | `<proof>` |

If none, state `None identified during this release cycle`.

## 8. Services, dependencies, and configuration changes

Record only changes from the previous stable release.

- **Vercel:** `<change / none>`
- **Supabase:** `<change / none>`
- **Resend:** `<change / none>`
- **Cloudflare/domain:** `<change / none>`
- **Slack:** `<change / none>`
- **Hugging Face:** `<change / none>`
- **Artificial Analysis:** `<change / none>`
- **GitHub Actions:** `<change / none>`
- **npm dependencies:** `<change / none>`
- **Environment/secret names added or removed:** `<names only, never values>`

## 9. Known limitations and open items carried forward

1. `<open item>`
2. `<open item>`

Distinguish a known limitation from a future enhancement.

## 10. External approval / publication state

- **CDW publication approval:** APPROVED / PENDING / NOT REQUESTED / OTHER
- **Branding approval relevant to this release:** `<status>`
- **Domain/publication changes:** `<status>`
- **Other external decisions:** `<status>`

Technical validation does not imply external approval.

## 11. Recovery and comparison record

- **Immutable rollback tag:** `vYYYY.MM[.N]`
- **Validated rollback commit:** `<full SHA>`
- **Previous stable tag:** `<tag>`
- **Recommended comparison command/concept:** compare `<previous tag>` to `<current tag>` for the release delta; compare `<current tag>` to `main` for work performed after the release.

Never move or reuse an existing release tag.

## 12. Suggested future-session recap prompt

> Fetch current `main`, read `AiFactoryProjectBrief.md`, `CHANGELOG.md`, `MaintenanceRunbook.md`, and the latest GitHub Release. Compare the latest stable tag to current `main`. Explain the current AI Factory suite state, what changed since the validated release, why the material changes were made, what remains open, which data/pricing sources are due for refresh, and which claims are source-verified, live-verified, or externally approved.
