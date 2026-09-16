from pathlib import Path
p = Path('tests/e2e/tco-handoff-ownership.spec.js')
s = p.read_text()

old = '''async function openCapacityAndUnitEconomics(page) {\n  const trigger = page.getByRole("button", { name: /Capacity & unit economics/i });\n  await expect(trigger).toBeVisible();\n  if ((await trigger.getAttribute("aria-expanded")) !== "true") await trigger.click();\n  await expect(trigger).toHaveAttribute("aria-expanded", "true");\n}\n'''
new = '''async function openCapacitySection(page) {\n  const trigger = page.getByRole("button", { name: /Capacity & unit economics|Workload capacity basis/i });\n  await expect(trigger).toBeVisible();\n  if ((await trigger.getAttribute("aria-expanded")) !== "true") await trigger.click();\n  await expect(trigger).toHaveAttribute("aria-expanded", "true");\n}\n'''
if old not in s: raise SystemExit('helper target missing')
s = s.replace(old, new, 1)

# Spend-mode migration test should still inspect the standalone capacity controls.
s = s.replace('await openCapacityAndUnitEconomics(page);\n  const modelSelect = page.getByLabel("Model for capacity estimate");', 'await openCapacitySection(page);\n  const modelSelect = page.getByLabel("Model for capacity estimate");', 1)

old_custom = '''  await openCapacityAndUnitEconomics(page);\n  await expect(page.getByLabel("Model for capacity estimate")).toHaveValue("custom");\n  await expect(page.getByLabel("Custom model parameters in billions")).toHaveValue("123.4");\n'''
new_custom = '''  await openCapacitySection(page);\n  await expect(page.getByText(/GPU Sizing is the technical capacity authority for this workload/)).toBeVisible();\n  await expect(page.getByLabel("Model for capacity estimate")).toHaveCount(0);\n  await expect(page.getByLabel("Custom model parameters in billions")).toHaveCount(0);\n'''
if old_custom not in s: raise SystemExit('custom workload expectation target missing')
s = s.replace(old_custom, new_custom, 1)

old_back = '''  await openCapacityAndUnitEconomics(page);\n  const modelSelect = page.getByLabel("Model for capacity estimate");\n  await modelSelect.selectOption("gemma-3-27b");\n  const edited = await waitForTcoSession(page, { modelId: "gemma-3-27b" });\n  expect(edited.modelParamsB).toBe(27);\n  await legacyToggle.uncheck();\n'''
new_back = '''  await openCapacitySection(page);\n  await expect(page.getByText(/GPU Sizing is the technical capacity authority for this workload/)).toBeVisible();\n  await expect(page.getByLabel("Model for capacity estimate")).toHaveCount(0);\n  // Workload-mode capacity controls are intentionally suppressed; verify the\n  // handed-off model context persists across navigation instead of editing it here.\n  const edited = await waitForTcoSession(page, { modelId: "muse-glimmer-30b" });\n  expect(edited.modelParamsB).toBe(29.6);\n  await legacyToggle.uncheck();\n'''
if old_back not in s: raise SystemExit('back-forward workload expectation target missing')
s = s.replace(old_back, new_back, 1)

s = s.replace('let restored = await waitForTcoSession(page, { modelId: "gemma-3-27b" });\n  expect(restored.modelParamsB).toBe(27);', 'let restored = await waitForTcoSession(page, { modelId: "muse-glimmer-30b" });\n  expect(restored.modelParamsB).toBe(29.6);', 1)
s = s.replace('restored = await waitForTcoSession(page, { modelId: "gemma-3-27b" });\n  expect(restored.modelParamsB).toBe(27);', 'restored = await waitForTcoSession(page, { modelId: "muse-glimmer-30b" });\n  expect(restored.modelParamsB).toBe(29.6);', 1)

p.write_text(s)
