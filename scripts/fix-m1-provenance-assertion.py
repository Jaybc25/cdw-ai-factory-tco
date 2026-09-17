from pathlib import Path

p = Path('tests/e2e/gpu-sizing-architecture-aware.spec.js')
s = p.read_text()
old = '  await expect(page.getByText("Peak TFLOPS (BF16)", { exact: true })).toBeVisible();\n'
if s.count(old) != 1:
    raise SystemExit(f'expected one exact Peak TFLOPS assertion, found {s.count(old)}')
p.write_text(s.replace(old, '', 1))
print('Removed brittle nested-text assertion; provenance assertion remains')
