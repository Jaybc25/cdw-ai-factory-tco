from pathlib import Path

p = Path('src/GpuSizingCalculator.jsx')
s = p.read_text()
old = '''  const [tcoSelection, setTcoSelection] = useState("recommended");
  const effectiveTcoSelection = tcoSelection === "higher-growth" && result?.higherGrowth?.class ? "higher-growth" : "recommended";
  const tcoSelectedClass = effectiveTcoSelection === "higher-growth" ? result?.higherGrowth?.class : result?.selectedClass;
  const tcoSelectedCount = effectiveTcoSelection === "higher-growth" ? result?.higherGrowth?.recommended : result?.recommended;
  const modelLabel = mode === "Inference" ? infModel.label : trainModel.label;'''
new = '''  const [tcoSelection, setTcoSelection] = useState("recommended");
  const effectiveTcoSelection = tcoSelection === "higher-growth" && result?.higherGrowth?.class ? "higher-growth" : "recommended";
  const tcoSelectedClass = effectiveTcoSelection === "higher-growth" ? result?.higherGrowth?.class : result?.selectedClass;
  const tcoSelectedCount = effectiveTcoSelection === "higher-growth" ? result?.higherGrowth?.recommended : result?.recommended;
  useEffect(() => {
    setTcoSelection("recommended");
  }, [mode, result?.selectedClass, result?.recommended, result?.higherGrowth?.class, result?.higherGrowth?.recommended]);
  const modelLabel = mode === "Inference" ? infModel.label : trainModel.label;'''
if old not in s:
    raise SystemExit('GPU selection anchor not found')
p.write_text(s.replace(old, new, 1))

p = Path('tests/e2e/gpu-sizing-architecture-aware.spec.js')
s = p.read_text()
addition = '''\n\ntest("higher-growth production design is opt-in for TCO and resets after re-sizing", async ({ page }) => {
  await page.goto("/gpu-sizing", { waitUntil: "domcontentloaded" });
  await chooseInferenceModel(page, "muse-glimmer-30b");

  const recommendedChoice = page.getByRole("button", { name: /Recommended · Selected for TCO/i });
  await expect(recommendedChoice).toBeVisible();
  await expect(recommendedChoice).toHaveAttribute("aria-pressed", "true");

  const higherGrowthChoice = page.getByRole("button", { name: /Higher-growth/i });
  await expect(higherGrowthChoice).toBeVisible();
  await higherGrowthChoice.click();
  await expect(higherGrowthChoice).toHaveAttribute("aria-pressed", "true");

  const tcoLink = page.getByRole("link", { name: "Compare TCO" });
  const selectedHref = await tcoLink.getAttribute("href");
  expect(selectedHref).toContain("sizingBasis=higher-growth");

  await chooseInferenceModel(page, "llama-4-scout");
  await expect(page.getByRole("button", { name: /Recommended · Selected for TCO/i })).toHaveAttribute("aria-pressed", "true");
  const resetHref = await tcoLink.getAttribute("href");
  expect(resetHref).toContain("sizingBasis=recommended");
});
'''
if 'higher-growth production design is opt-in for TCO and resets after re-sizing' not in s:
    p.write_text(s.rstrip() + addition + '\n')
