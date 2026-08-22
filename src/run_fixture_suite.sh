#!/bin/bash
# run_fixture_suite.sh
# Usage: ./run_fixture_suite.sh
#
# Runs the full Client Summary regression suite: preflight-validates every
# fixture-*.json (plus the older client-data-*.json ones), generates a real
# PPTX from each, and scans the actual rendered text for known bad-output
# patterns ([object Object], undefined, NaN, a stray literal "null"). Exits
# non-zero if any fixture fails to generate or any content issue is found.
#
# Re-run this after any change to generate_client_summary_full_v2.js to
# catch a regression before it reaches a real client deck.

set -e
cd "$(dirname "$0")"
OUT_DIR="/tmp/fixture_suite_output"
mkdir -p "$OUT_DIR"

FAIL=0

echo "=== Preflight validation ==="
for f in fixture-*.json client-data-*.json; do
  [ -f "$f" ] || continue
  if ! node preflight_validate.js "$f" > "$OUT_DIR/${f%.json}.preflight.log" 2>&1; then
    echo "PREFLIGHT ERROR: $f (see $OUT_DIR/${f%.json}.preflight.log)"
    FAIL=1
  fi
done

echo ""
echo "=== Generation ==="
for f in fixture-*.json client-data-*.json; do
  [ -f "$f" ] || continue
  out="$OUT_DIR/${f%.json}.pptx"
  if ! node generate_client_summary_full_v2.js "$f" "$out" > "$OUT_DIR/${f%.json}.gen.log" 2>&1; then
    echo "GENERATION FAILED: $f (see $OUT_DIR/${f%.json}.gen.log)"
    FAIL=1
  fi
done

echo ""
echo "=== Content scan ==="
if python3 - "$OUT_DIR" << 'PYEOF'
import sys, glob, os
from pptx import Presentation

out_dir = sys.argv[1]
BAD_PATTERNS = ["[object Object]", "undefined", "NaN", "null", "N/A%"]
issues = 0
for path in sorted(glob.glob(os.path.join(out_dir, "*.pptx"))):
    try:
        prs = Presentation(path)
    except Exception as e:
        print(f"CANNOT OPEN {path}: {e}")
        issues += 1
        continue
    for i, slide in enumerate(prs.slides):
        for shape in slide.shapes:
            if not shape.has_text_frame:
                continue
            text = shape.text_frame.text
            for pat in BAD_PATTERNS:
                if pat in text:
                    print(f"CONTENT ISSUE in {os.path.basename(path)}, slide {i+1}: found {pat!r} in {text[:80]!r}")
                    issues += 1
if issues:
    print(f"\n{issues} content issue(s) found.")
    sys.exit(1)
else:
    print("Clean -- no bad patterns found in any generated deck.")
PYEOF
then
  :
else
  FAIL=1
fi

echo ""
echo "=== Fixture-specific assertions ==="
# Turns today's manually-found bugs into permanent regression protection --
# a warning at preflight time (exit 0) previously meant fixture-12's whole
# purpose could pass silently even with the bug still present. These assert
# the ACTUAL expected/forbidden text in the generated deck, and, for the
# negative-test fixtures, that the expected warning genuinely still fires.
if python3 - "$OUT_DIR" << 'PYEOF'
import sys, glob, os
from pptx import Presentation

out_dir = sys.argv[1]

def full_text(pptx_path):
    prs = Presentation(pptx_path)
    parts = []
    for slide in prs.slides:
        for shape in slide.shapes:
            if shape.has_text_frame:
                parts.append(shape.text_frame.text)
    return "\n".join(parts)

def log_text(name):
    path = os.path.join(out_dir, f"{name}.preflight.log")
    return open(path).read() if os.path.exists(path) else ""

CHECKS = [
    # (fixture name without .json, deck-text must-contain, deck-text must-NOT-contain, preflight-log must-contain)
    ("fixture-04-negative-roi", ["-$892,400"], ["$-892,400"], []),
    ("fixture-06-huge-roi", ["1840.0%"], [], []),
    ("fixture-12-unexpected-scalar-field", ["1250.0%"], ["12.5"], ["secondaryPctMetric"]),
    ("fixture-11-unexpected-array-field", [], [], ["alternativesConsidered", "rankingBreakdown"]),
    ("fixture-14-inconsistent-field", [], [], ["lowerCostCount"]),
]

issues = 0
for name, must_have, must_not_have, log_must_have in CHECKS:
    pptx_path = os.path.join(out_dir, f"{name}.pptx")
    if not os.path.exists(pptx_path):
        print(f"ASSERTION SKIPPED (no deck found): {name}")
        issues += 1
        continue
    text = full_text(pptx_path)
    for needle in must_have:
        if needle not in text:
            print(f"ASSERTION FAILED: {name} deck should contain {needle!r} but does not")
            issues += 1
    for needle in must_not_have:
        if needle in text:
            print(f"ASSERTION FAILED: {name} deck should NOT contain {needle!r} but does")
            issues += 1
    log = log_text(name)
    for needle in log_must_have:
        if needle not in log:
            print(f"ASSERTION FAILED: {name} preflight log should mention {needle!r} (expected warning) but does not -- the warning logic may have been silently removed")
            issues += 1

if issues:
    print(f"\n{issues} assertion failure(s).")
    sys.exit(1)
else:
    print("All fixture-specific assertions passed.")
PYEOF
then
  :
else
  FAIL=1
fi

echo ""
if [ "$FAIL" -ne 0 ]; then
  echo "SUITE FAILED -- see logs in $OUT_DIR"
  exit 1
else
  echo "SUITE PASSED -- all fixtures preflight-clean (errors), generated successfully, content-scanned clean, and fixture-specific assertions passed."
fi
