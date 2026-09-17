from pathlib import Path

path = Path("tests/e2e/gpu-sizing-architecture-aware.spec.js")
text = path.read_text()
old = '''// The production cards themselves are the TCO-selection controls; there is no\n// duplicate selector lower on the page.\ntest("training audit uses training TFLOPS provenance rather than inference benchmark provenance", async ({ page }) => {\n'''
new = '''test("training audit uses training TFLOPS provenance rather than inference benchmark provenance", async ({ page }) => {\n'''
if text.count(old) != 1:
    raise SystemExit(f"Expected one misplaced M1 comment block, found {text.count(old)}")
path.write_text(text.replace(old, new, 1))
print("M1 test comment cleanup applied")
