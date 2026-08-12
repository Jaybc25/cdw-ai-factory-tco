# GitHub Setup — Model Advisor Registry Layer

Corrected from an earlier version of this file, which assumed a brand-new repo.
Having actually looked at cdw-ai-factory-tco, this goes into that SAME repo —
matching the single-project, multi-route architecture you already established
for the TCO calculator and GPU sizing tool. No separate repo needed.

**Confirmed safe**: this repo is Vite + React, and Vite only bundles what
`src/` files import. Adding Python scripts and a `data/` folder at the repo
root does not touch the build — it's inert as far as Vite and Vercel are
concerned. The only file this package changes is `src/LandingPage.jsx`
(flips the reserved "Next tool" bubble to preview "Open-Weight Model
Advisor" as Building, same treatment GPU Sizing got before it went live).

## What's in this package

Everything is laid out to match its exact destination path in the repo:

```
common.py                              → repo root
canonical_registry.py                  → repo root
sync_model_specs.py                    → repo root
sync_capability_scores.py              → repo root
sync_nim_compatibility.py              → repo root
reconcile_registries.py                → repo root
requirements.txt                       → repo root
data/canonical_models.json             → data/ (new folder)
data/model_governance.json             → data/ (new folder)
.github/workflows/*.yml (4 files)      → .github/workflows/ (new folders)
src/LandingPage.jsx                    → OVERWRITES the existing one
```

Nothing else in the repo (App.jsx, TcoCalculator.jsx, GpuSizingCalculator.jsx,
package.json, vite.config.js, vercel.json) is touched.

## Steps

1. **Download and extract this zip.**

2. **Upload to the repo, preserving folder structure.** This is the exact
   thing that broke the very first TCO deploy — dragging files out of a zip
   viewer flattens folders. Two ways to avoid that:
   - **Easiest**: on your computer, extract the zip fully first (double-click
     it, don't drag from inside the compressed view), then drag the
     *extracted* folder's contents into GitHub's "Add file → Upload files."
   - **If a folder still doesn't show up nested** (this most often bites the
     `.github/workflows/` folder): use "Add file → Create new file" instead,
     type the full path in the filename box (e.g.
     `.github/workflows/reconcile.yml`), and paste the file's contents in.
     Repeat for all 4 workflow files and the 2 data files.

3. **Confirm `src/LandingPage.jsx` got overwritten**, not duplicated — check
   the file in GitHub afterward and make sure it's the one with "Open-Weight
   Model Advisor" in the bubbles list, not the old "Next tool" placeholder.

4. **Add the Artificial Analysis API key as a secret.**
   Settings → Secrets and variables → Actions → New repository secret.
   Name: `AA_API_KEY`. Value: your Artificial Analysis **Pro-tier** key (the
   free tier doesn't expose the fields this registry needs).

5. **Enable Actions**, if prompted (Actions tab → enable workflows).

6. **Run the first sync manually, don't wait for the schedule.** In order:
   - Actions → **Sync model specs (Hugging Face)** → Run workflow
   - Actions → **Sync capability scores (Artificial Analysis)** → Run workflow
     — this is the one that tells you whether the two uncertain DeepSeek
     aliases actually resolve
   - Actions → **Reconcile registries** → Run workflow

   **If reconciliation fails (red X)**: that's it working correctly, not a
   bug — click into the run, the log names the exact model and problem. Fix
   the alias in `data/canonical_models.json` and re-run, or exclude that
   model from beta recommendations. Don't force it to pass.

   **Do not run the NIM workflow.** It has no schedule on purpose and will
   very likely fail — the endpoint was investigated and could not be
   confirmed as real. That's the correct beta state.

7. **One side effect worth knowing about**: because this repo auto-deploys
   to Vercel on every push to `main`, and the sync workflows commit updated
   `data/*.json` files back to `main`, every successful sync will trigger a
   new Vercel deployment. That's intentional (keeps the live site's data
   current) and harmless on your plan, just don't be surprised by the deploy
   notifications.

## What's still manual / not yet automated

- **NIM sync**: stays manual-only until someone with NGC / build.nvidia.com
  API access confirms the real endpoint.
- **Governance registry** (`data/model_governance.json`) and **canonical
  registry** (`data/canonical_models.json`): both hand-edited, never synced.
  When a sync run's discovery-candidates file surfaces a new model worth
  tracking, add it here deliberately.

## Beta disclaimer text (for whoever builds the app/matching engine next)

> Beta — model recommendations use periodically refreshed third-party
> benchmark and model metadata. Verify licensing and deployment requirements
> before production use.

And two behavior rules that go with it, per the review: when
`param_count_billion.value` is null in a spec record, the app must say so
explicitly wherever that number feeds the GPU sizing handoff, not silently
present an estimate as confirmed. And until real NIM data exists, the UI must
say "NIM validation data unavailable — integration pending," never
`nim_supported: false` — those are different claims.
