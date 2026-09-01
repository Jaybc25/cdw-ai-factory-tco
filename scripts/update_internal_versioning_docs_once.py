#!/usr/bin/env python3
from pathlib import Path
import re


def replace_once(path, old, new):
    p = Path(path)
    text = p.read_text(encoding="utf-8")
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{path}: expected exactly one literal match, found {count}")
    p.write_text(text.replace(old, new, 1), encoding="utf-8")


def regex_once(path, pattern, replacement, flags=0):
    p = Path(path)
    text = p.read_text(encoding="utf-8")
    updated, count = re.subn(pattern, replacement, text, count=1, flags=flags)
    if count != 1:
        raise SystemExit(f"{path}: expected exactly one regex match, found {count}: {pattern[:100]!r}")
    p.write_text(updated, encoding="utf-8")


# README: add internal release/versioning policy after the document pointers.
readme_anchor = "For a human-readable history of meaningful milestones and current open items, read `CHANGELOG.md`.\n"
readme_versioning = '''For a human-readable history of meaningful milestones and current open items, read `CHANGELOG.md`.

## Internal release and version record

Versioning is an internal engineering, audit, maintenance, and recovery mechanism. It is not intended to be displayed prominently in the customer-facing application unless a business reason is established later.

**Current validated baseline:** AI Factory Suite 2026.09 (`v2026.09`), validated commit `31fdb2ff2a321f6101bfa72d3c45b4c31aa3a0eb`, released September 1, 2026.

The suite uses calendar versioning for validated releases:

- First validated release in a month: `AI Factory Suite YYYY.MM`, Git tag `vYYYY.MM`.
- Additional validated release in the same month: append `.1`, `.2`, and so on.
- Changes between validated releases stay under `Unreleased` in `CHANGELOG.md` and do not receive a release identifier merely because code was committed.
- Git tags and GitHub Releases are the authoritative release identity. Existing release tags are immutable and must never be moved or reused.
- Individual tools do not maintain authoritative independent release versions. Their changes are documented inside the suite release record.
- `package.json` still carries the legacy `2.8.0` value. Do not rewrite the already validated `v2026.09` baseline. Starting with the next stable release, mirror the suite release in SemVer-safe package metadata, for example human release `2026.10` maps to package version `2026.10.0`.

Use `ReleaseRecordTemplate.md` when preparing each future validated release. The release record captures code changes, rationale, data/pricing state, validation evidence, service/dependency changes, known limitations, and external approval status.
'''
replace_once("README.md", readme_anchor, readme_versioning)

# README: replace stale assurance priorities with the current state.
readme_assurance = '''## Known assurance and maintenance priorities

The permanent GitHub quality gate, TCO Excel-to-JavaScript parity suite, live Vercel regression suite, and first formal known-good release are now in place. The main remaining technical maintenance priorities are:

1. Run credentialed/manual live checks when a release changes auth, report, download-event, Slack notification, or PDF behavior.
2. Centralize cloud and on-prem pricing into one shared data source so TCO and GPU Sizing cannot drift.
3. Keep NIM compatibility manual until the NVIDIA endpoint is production-validated.
4. Review dependency-security findings at the advisory level before deciding on upgrades; do not use force upgrades without regression review.

See `AiFactoryProjectBrief.md` for the detailed defect history, current source-level remediation status, prior validation record, and current validated baseline.
'''
regex_once(
    "README.md",
    r"## Known assurance and maintenance priorities\n.*?(?=## Publication and branding status)",
    readme_assurance + "\n",
    re.S,
)

# PROJECT BRIEF: add current validated baseline and internal release identity to Suite Overview.
brief_anchor = "- **Live URL:** https://cdw-ai-factory-tco.vercel.app\n"
brief_baseline = '''- **Live URL:** https://cdw-ai-factory-tco.vercel.app
- **Current validated source baseline:** AI Factory Suite 2026.09 (`v2026.09`), validated commit `31fdb2ff2a321f6101bfa72d3c45b4c31aa3a0eb`, released September 1, 2026 after the permanent quality gate passed the production build, 20/20 canonical TCO Excel-to-JavaScript parity, and 13/13 live Vercel browser tests for the automated scope.
- **Internal release identity:** suite releases use calendar versioning and exist for engineering history, auditability, comparison, and recovery. They are not intended as prominent customer-facing labels. Git tags/GitHub Releases are authoritative; individual tool version labels and the legacy package version are not.
'''
replace_once("AiFactoryProjectBrief.md", brief_anchor, brief_baseline)

# PROJECT BRIEF: add a standing convention for versioning and release records.
brief_rule_anchor = "11. **Jay's working style:** bulk up multiple build changes before doing live verification passes, rather than testing after every individual change.\n"
brief_rule = '''11. **Jay's working style:** bulk up multiple build changes before doing live verification passes, rather than testing after every individual change.
12. **Internal versioning and release record:** validated suite releases use calendar versioning. The first validated release in a month is `AI Factory Suite YYYY.MM` / `vYYYY.MM`; additional same-month validated releases append `.1`, `.2`, and so on. Between releases, work remains `Unreleased` in `CHANGELOG.md`. Git tags and GitHub Releases are authoritative and immutable. Individual tools do not maintain authoritative independent release versions. Use `ReleaseRecordTemplate.md` to capture the release's code changes, rationale, data state, validation evidence, service/dependency changes, open items, and external approval status. Do not expose suite versioning prominently in the customer-facing UI unless a later business requirement calls for it.
'''
replace_once("AiFactoryProjectBrief.md", brief_rule_anchor, brief_rule)

# PROJECT BRIEF: clarify the legacy package version.
regex_once(
    "AiFactoryProjectBrief.md",
    r"The repo package is version 2\.8\.0, but that package version is not a reliable per-tool semantic version\. Exact live-deployed per-tool version labels were not independently proven in this export\.",
    "`package.json` still carries legacy version `2.8.0`; it is not the authoritative suite release identity and should not be interpreted as a current per-tool semantic version. The authoritative validated baseline is the immutable Git tag/GitHub Release `v2026.09`. Starting with the next stable release, package metadata should mirror the calendar release using SemVer-safe formatting while the human-facing internal record continues to use `YYYY.MM[.patch]`.",
)

# MAINTENANCE RUNBOOK: replace Section 10 with the complete internal release policy and closeout process.
runbook_section10 = '''## 10. Internal versioning and release closeout

Versioning exists for internal engineering history, auditability, maintenance, and recovery. Do not add suite version labels prominently to the customer-facing site unless a business reason is established later.

### 10.1 Release naming policy

Use calendar versioning for validated suite releases:

- First validated release in a month: `AI Factory Suite YYYY.MM` with Git tag `vYYYY.MM`.
- Additional validated releases in the same month: append `.1`, `.2`, and so on.
- Example: the first October 2026 release is `AI Factory Suite 2026.10` / `v2026.10`; a second validated October release is `AI Factory Suite 2026.10.1` / `v2026.10.1`.
- Git tags and GitHub Releases are authoritative and immutable. Never move, overwrite, or reuse an existing release tag.
- Individual tools do not maintain authoritative independent versions. Tool-specific changes are recorded within the suite release record.

The first formal known-good baseline is `AI Factory Suite 2026.09` / `v2026.09`, validated commit `31fdb2ff2a321f6101bfa72d3c45b4c31aa3a0eb`.

### 10.2 Between releases

Do not create a new release identifier for every commit.

- Normal development continues on `main`.
- Meaningful unreleased work is recorded under `Unreleased` in `CHANGELOG.md`.
- At any point, compare the latest stable tag to current `main` to determine exactly what has changed since the validated baseline.
- A future session should be able to answer "what changed since `vYYYY.MM`?" from Git history rather than from AI memory.

### 10.3 Package metadata transition

`package.json` currently contains the legacy version `2.8.0`. Because `v2026.09` is already an immutable validated baseline, do not rewrite that tagged commit merely to align metadata.

Starting with the next stable release:

- Mirror the internal suite release in `package.json` using SemVer-safe numeric formatting.
- Human release `2026.10` maps to package version `2026.10.0`.
- Human release `2026.10.1` maps to package version `2026.10.1`.
- The Git tag/GitHub Release remains authoritative if package metadata ever disagrees.
- The package is private and is not being versioned for npm publication; the field is an additional internal consistency marker only.

### 10.4 Required release record

Use `ReleaseRecordTemplate.md` as the checklist and drafting structure for every validated release. The release record should capture:

- release name, tag, exact commit, date, previous release, and comparison range;
- meaningful changes by tool and shared platform area;
- why material changes were made;
- data state at release time, including NVIDIA/on-prem pricing verification, cloud pricing verification, Hugging Face snapshot, Artificial Analysis snapshot, and other material reference data;
- validation performed and exact pass/fail evidence;
- defects found and corrected during the release cycle;
- services, dependencies, secrets/configuration names, or infrastructure that changed;
- known limitations and open items carried forward;
- source-verified, live-verified, and externally approved status kept separate;
- rollback/recovery target and immutable tag identity.

The detailed release record belongs primarily in GitHub Release notes plus the corresponding `CHANGELOG.md` entry. `AiFactoryProjectBrief.md` should be updated only when the release creates durable architecture, methodology, validation-history, data-source, or roadmap knowledge.

### 10.5 Release closeout procedure

For a meaningful stable release:

1. Identify the intended release scope and keep all incomplete work under `Unreleased`.
2. Confirm all intended source changes are committed to `main`.
3. Review the comparison from the previous stable tag to current `main`.
4. Prepare the release record using `ReleaseRecordTemplate.md`.
5. Record the data/pricing state that the release relies on.
6. Update `CHANGELOG.md` with the release-level changes and move the appropriate items out of `Unreleased`.
7. Update package metadata beginning with the next release after `v2026.09`.
8. Run the permanent quality gate and all relevant source-level tests.
9. Verify the deployed application for the release scope.
10. Run credentialed/manual checks when the release affects auth, reports, database events, Slack notifications, or PDF presentation.
11. Classify status accurately as source-verified, live-verified, and externally approved where applicable.
12. Update `AiFactoryProjectBrief.md` only for durable architecture, validation, rationale, data-source, or roadmap changes.
13. Update this runbook or `ServiceInventory.md` if maintenance responsibilities, services, tiers, credential locations, dependencies, or failure modes changed.
14. Only after the required validation passes, create the immutable Git tag and GitHub Release for the exact validated commit.
15. Confirm the release record names the exact tag and commit and that `main` may subsequently move ahead without changing the frozen release.

'''
regex_once(
    "MaintenanceRunbook.md",
    r"## 10\. Release closeout procedure\n.*?(?=## 11\. Current assurance baseline)",
    runbook_section10,
    re.S,
)

# CHANGELOG: record this documentation/version-governance change under Unreleased -> Added.
changelog_anchor = "- Refreshed root `README.md` to describe the current six-tool suite, current platform services, automated data maintenance, manual refresh responsibilities, status language, and remaining assurance priorities.\n"
changelog_add = '''- Refreshed root `README.md` to describe the current six-tool suite, current platform services, automated data maintenance, manual refresh responsibilities, status language, and remaining assurance priorities.
- Formalized internal suite calendar versioning: `AI Factory Suite YYYY.MM` / `vYYYY.MM`, with `.1`, `.2`, and so on for additional validated releases in the same month.
- Added `ReleaseRecordTemplate.md` as the standard release-history checklist covering code, rationale, data state, validation, dependencies, open items, approval status, and recovery identity.
- Updated `README.md`, `MaintenanceRunbook.md`, and `AiFactoryProjectBrief.md` so Git tags/GitHub Releases are the authoritative internal release identity and individual tool versions are not independently authoritative.
- Recorded that legacy `package.json` version `2.8.0` will remain untouched for the already validated `v2026.09` baseline and will transition to calendar-aligned SemVer metadata beginning with the next stable release.
'''
replace_once("CHANGELOG.md", changelog_anchor, changelog_add)

# Create the reusable release-record template.
template = '''# AI Factory Suite Release Record Template

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
'''
Path("ReleaseRecordTemplate.md").write_text(template, encoding="utf-8")

# Guard project writing convention.
for path in ["README.md", "AiFactoryProjectBrief.md", "MaintenanceRunbook.md", "CHANGELOG.md", "ReleaseRecordTemplate.md"]:
    text = Path(path).read_text(encoding="utf-8")
    if "—" in text or "–" in text:
        raise SystemExit(f"{path}: prohibited dash character found")

print("Updated internal versioning documentation and created ReleaseRecordTemplate.md")
