from pathlib import Path


def replace_once(path, old, new):
    p = Path(path)
    text = p.read_text(encoding="utf-8")
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{path}: expected exactly one match, found {count}")
    p.write_text(text.replace(old, new, 1), encoding="utf-8")


# Generator: validate client logo before PptxGenJS sees the file.
replace_once(
    "src/generate_client_summary_full.cjs",
    'const pptxgen = require("pptxgenjs");\nconst fs = require("fs");\n',
    'const pptxgen = require("pptxgenjs");\nconst fs = require("fs");\nconst { validateSafeImagePath } = require("./SafeImageInput.cjs");\n',
)
replace_once(
    "src/generate_client_summary_full.cjs",
    'const data = JSON.parse(fs.readFileSync(dataPath, "utf8"));\n\nconst pres = new pptxgen();\n',
    'const data = JSON.parse(fs.readFileSync(dataPath, "utf8"));\nconst safeClientLogoPath = validateSafeImagePath(data.clientLogoPath, { label: "clientLogoPath" });\n\nconst pres = new pptxgen();\n',
)
replace_once(
    "src/generate_client_summary_full.cjs",
    'if (data.clientLogoPath) {\n  cover.addImage({ path: data.clientLogoPath, x: PAGE_W - MX - 2.0, y: 0.6, w: 2.0, h: 0.55, sizing: { type: "contain", w: 2.0, h: 0.55 } });\n',
    'if (safeClientLogoPath) {\n  cover.addImage({ path: safeClientLogoPath, x: PAGE_W - MX - 2.0, y: 0.6, w: 2.0, h: 0.55, sizing: { type: "contain", w: 2.0, h: 0.55 } });\n',
)

# Preflight: fail early on unsafe/mislabeled client-logo files.
replace_once(
    "src/preflight_validate.cjs",
    'const fs = require("fs");\n',
    'const fs = require("fs");\nconst { validateSafeImagePath } = require("./SafeImageInput.cjs");\n',
)
replace_once(
    "src/preflight_validate.cjs",
    'if (data.clientLogoPath !== null && data.clientLogoPath !== undefined && typeof data.clientLogoPath !== "string") {\n  err("clientLogoPath must be null or a string path");\n}\n\nconst KNOWN_TOOLS',
    'if (data.clientLogoPath !== null && data.clientLogoPath !== undefined && typeof data.clientLogoPath !== "string") {\n  err("clientLogoPath must be null or a string path");\n} else if (typeof data.clientLogoPath === "string" && data.clientLogoPath) {\n  try {\n    validateSafeImagePath(data.clientLogoPath, { label: "clientLogoPath" });\n  } catch (error) {\n    err(error.message);\n  }\n}\n\nconst KNOWN_TOOLS',
)

# Permanent regression: valid repo PNG must pass, renamed unsafe payload must fail both preflight and generator.
fixture_anchor = '''echo ""\nif [ "$FAIL" -ne 0 ]; then\n  echo "SUITE FAILED -- see logs in $OUT_DIR"\n'''
fixture_insert = '''echo ""\necho "=== Client-logo security assertions ==="\nSEC_DIR="$OUT_DIR/client-logo-security"\nmkdir -p "$SEC_DIR"\nif ! node - <<'NODEEOF'\nconst { validateSafeImagePath } = require("./SafeImageInput.cjs");\nvalidateSafeImagePath("cdw-logo.png", { label: "known-good CDW logo" });\nconsole.log("Known-good PNG signature accepted.");\nNODEEOF\nthen\n  echo "SECURITY ASSERTION FAILED: known-good PNG was rejected"\n  FAIL=1\nfi\n\npython3 - "$SEC_DIR" <<'PYEOF'\nimport json, pathlib, sys\nsec = pathlib.Path(sys.argv[1])\nbad = sec / "renamed-unsafe.jpg"\nbad.write_bytes(b"\\x00\\x00\\x00\\x18ftypheic" + b"X" * 32)\nbase = json.loads(pathlib.Path("fixture-01-three-tools.json").read_text())\nbase["clientLogoPath"] = str(bad)\n(sec / "unsafe-logo-fixture.json").write_text(json.dumps(base))\nPYEOF\n\nif node preflight_validate.cjs "$SEC_DIR/unsafe-logo-fixture.json" > "$SEC_DIR/preflight.log" 2>&1; then\n  echo "SECURITY ASSERTION FAILED: preflight accepted a renamed non-JPEG payload"\n  FAIL=1\nelse\n  echo "Preflight correctly rejected renamed non-JPEG payload."\nfi\nif node generate_client_summary_full.cjs "$SEC_DIR/unsafe-logo-fixture.json" "$SEC_DIR/unsafe-output.pptx" > "$SEC_DIR/generator.log" 2>&1; then\n  echo "SECURITY ASSERTION FAILED: generator accepted a renamed non-JPEG payload"\n  FAIL=1\nelse\n  echo "Generator correctly rejected renamed non-JPEG payload before PptxGenJS image parsing."\nfi\n\necho ""\nif [ "$FAIL" -ne 0 ]; then\n  echo "SUITE FAILED -- see logs in $OUT_DIR"\n'''
replace_once("src/run_fixture_suite.sh", fixture_anchor, fixture_insert)

# Changelog: record review and mitigation, and remove the old 'unreviewed' wording.
changelog_anchor = '''### Current maintenance state\n'''
changelog_section = '''### Dependency Security Review #1 - 2026-09-02\n\n- Reviewed the six current `npm audit` package-level findings individually: 3 moderate, 3 high, 0 critical. No dependency was force-upgraded.\n- Vite/esbuild findings are development-server exposures rather than evidence of an exploitable defect in the compiled Vercel production application. A controlled Vite major-version upgrade remains planned and must pass the permanent quality gate.\n- React Router's SSR constructor-injection advisory does not apply to the current declarative `BrowserRouter`/`Routes` architecture. The separate open-redirect advisory has low current exposure because application routing uses fixed internal destinations; a controlled React Router upgrade remains planned.\n- PptxGenJS inherits high-severity denial-of-service advisories from `image-size`. The known client-controlled image path is the offline Client Summary `clientLogoPath`, so the generator now allows only PNG/JPG/JPEG files, enforces a 10 MiB ceiling, and verifies the actual PNG/JPEG file signature before PptxGenJS sees the image.\n- Added permanent Client Summary regression assertions proving a valid PNG is accepted while a non-JPEG payload renamed `.jpg` is rejected by both preflight and generation.\n\n### Current maintenance state\n'''
replace_once("CHANGELOG.md", changelog_anchor, changelog_section)
replace_once(
    "CHANGELOG.md",
    '- Dependency-security review for the six npm audit findings surfaced by the new CI environment (3 moderate, 3 high); do not apply force upgrades without reviewing advisories and breaking-change risk.\n',
    '- Controlled Vite/esbuild and React Router dependency upgrades remain planned; treat them as regression-tested migrations rather than `npm audit fix --force` changes.\n- PptxGenJS/image-size remains an upstream dependency concern; the current Client Summary client-logo input path is hardened while a clean upstream dependency resolution is monitored.\n',
)

# Runbook: persist the disposition so this does not revert to an unexplained count.
runbook_anchor = '''Use `npm outdated` or equivalent dependency review tooling when appropriate, but do not upgrade production dependencies solely because a newer version exists. Review release notes and regression-test meaningful upgrades.\n\n## 9. Event-driven maintenance triggers\n'''
runbook_section = '''Use `npm outdated` or equivalent dependency review tooling when appropriate, but do not upgrade production dependencies solely because a newer version exists. Review release notes and regression-test meaningful upgrades.\n\n### Dependency-security disposition baseline\n\nThe first advisory-level review was completed September 2, 2026. The current `npm audit` result is 6 package-level findings: 3 moderate, 3 high, and 0 critical. Do not summarize this merely as an unresolved count; preserve the disposition:\n\n- **Vite / esbuild:** current findings concern development-server behavior. The deployed Vercel application is a compiled build, so these are not treated as evidence of an active production exploit path. Upgrade Vite deliberately on an isolated change and run the permanent quality gate rather than using a force upgrade.\n- **React Router:** the SSR constructor-injection advisory is not applicable to the current declarative `BrowserRouter`/`Routes` architecture. The open-redirect advisory remains relevant to affected versions, but current source uses fixed internal routing destinations. Plan a controlled upgrade and regression pass.\n- **PptxGenJS / image-size:** current high-severity advisories concern malformed ICNS/JXL/HEIF image parsing and denial of service. The offline Client Summary path now validates `clientLogoPath` before PptxGenJS sees it: only PNG/JPG/JPEG are accepted, files are capped at 10 MiB, and PNG/JPEG magic bytes must match the extension. Keep this mitigation covered by `src/run_fixture_suite.sh` while monitoring upstream dependency resolution.\n\nRe-run `npm audit --json` during dependency reviews and update this section only when the advisory set or disposition materially changes.\n\n## 9. Event-driven maintenance triggers\n'''
replace_once("MaintenanceRunbook.md", runbook_anchor, runbook_section)
replace_once(
    "MaintenanceRunbook.md",
    '5. Review the npm audit findings surfaced by CI before deciding whether dependency upgrades are warranted; do not use force upgrades without advisory and regression review.\n',
    '5. Execute the planned controlled Vite/esbuild and React Router upgrades when scheduled, with full regression validation; continue monitoring the PptxGenJS/image-size upstream path while retaining the client-logo input mitigation.\n',
)

# Project writing convention guard for changed documentation.
for path in ["CHANGELOG.md", "MaintenanceRunbook.md"]:
    text = Path(path).read_text(encoding="utf-8")
    if "—" in text or "–" in text:
        raise SystemExit(f"{path}: prohibited dash character found")

print("Applied Client Summary image hardening and security-review documentation updates.")
