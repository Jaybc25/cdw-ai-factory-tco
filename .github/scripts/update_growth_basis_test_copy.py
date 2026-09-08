from pathlib import Path
p=Path('tests/e2e/tco-handoff-ownership.spec.js')
s=p.read_text()
old='await expect(page.getByText(/user-selected higher-growth alternative/)).toBeVisible();'
new='await expect(page.getByText("Higher-growth alternative selected in GPU Sizing", { exact: true })).toBeVisible();'
if old not in s:
    raise SystemExit('stale expectation not found')
p.write_text(s.replace(old,new,1))
