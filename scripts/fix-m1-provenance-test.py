from pathlib import Path

p = Path('tests/e2e/gpu-sizing-architecture-aware.spec.js')
s = p.read_text()
old = '''  const gpuSelect = gpuSelectFor(page, "B300");\n  await expect(gpuSelect).toBeVisible();\n  await gpuSelect.selectOption("B300");\n'''
new = '''  const deploymentAssumptions = page.locator("details").filter({ hasText: "Deployment assumptions" });\n  await deploymentAssumptions.locator("summary").click();\n\n  const gpuSelect = gpuSelectFor(page, "B300");\n  await expect(gpuSelect).toBeVisible();\n  await gpuSelect.selectOption("B300");\n'''
if s.count(old) != 1:
    raise SystemExit(f'expected one target block, found {s.count(old)}')
p.write_text(s.replace(old, new, 1))
print('M1 browser test visibility fix applied')
