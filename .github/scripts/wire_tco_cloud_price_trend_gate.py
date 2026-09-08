from pathlib import Path
p=Path('.github/workflows/quality-gate.yml')
s=p.read_text()
path_line='      - "scripts/validate_gpu_selected_budget_and_phase2_cleanup.mjs"\n'
new_path=path_line+'      - "scripts/validate_tco_cloud_unit_price_trend.mjs"\n'
if s.count(path_line) != 2: raise SystemExit(f'expected 2 path anchors, got {s.count(path_line)}')
s=s.replace(path_line,new_path)
step='''      - name: Validate GPU selected-budget and Phase 2 cleanup\n        run: node scripts/validate_gpu_selected_budget_and_phase2_cleanup.mjs\n'''
new_step=step+'''\n      - name: Validate TCO cloud GPU unit-price trend\n        run: node scripts/validate_tco_cloud_unit_price_trend.mjs\n'''
if s.count(step)!=1: raise SystemExit('quality gate step anchor missing')
s=s.replace(step,new_step,1)
p.write_text(s)
