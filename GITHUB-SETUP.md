# GitHub Setup — Model Advisor Registry Layer (Beta)

Follow these steps in order. This mirrors the same GitHub → repo pattern used
for the TCO calculator and GPU sizing tool, but this repo is data
infrastructure (the sync scripts + registries), not a deployed web app yet —
there's no Vercel step here.

## 1. Create the repo

1. Go to github.com, click **New repository**.
2. Name it something like `model-advisor-registry` (private).
3. Do **not** initialize with a README — you're uploading one.
4. Create the repo.

## 2. Upload the files

1. Unzip the delivered package on your computer.
2. On the new repo's page, click **uploading an existing file**.
3. Drag in everything **except** the `data/` folder's contents for now — drag
   the whole project folder's contents (common.py, canonical_registry.py, the
   four sync_*.py files, reconcile_registries.py, README.md, and the
   `.github/workflows/` folder) plus `data/canonical_models.json` and
   `data/model_governance.json` specifically.
4. Commit directly to `main`.

**Important**: make sure the `.github/workflows/` folder actually lands at the
repo root as `.github/workflows/*.yml` — GitHub only recognizes workflow files
in that exact path. If the drag-and-drop flattens folders, use "Add file →
Create new file" and type the path `.github/workflows/reconcile.yml` etc.
directly, pasting in the contents.

## 3. Add the Artificial Analysis API key as a secret

1. In the repo, go to **Settings → Secrets and variables → Actions**.
2. Click **New repository secret**.
3. Name: `AA_API_KEY`. Value: your Artificial Analysis **Pro-tier** key (the
   free tier will not work — see README.md's commercial dependency note).
4. Save.

Never put this key directly in any file you commit. The workflow reads it from
this secret at `${{ secrets.AA_API_KEY }}`.

## 4. Enable Actions

1. Go to the **Actions** tab.
2. If prompted, click **I understand my workflows, go ahead and enable them**.
3. You should see four workflows listed: sync-model-specs, sync-capability-scores,
   sync-nim-compatibility-MANUAL-ONLY, and reconcile.

## 5. Run the first sync manually — do this before trusting anything

Don't wait for the schedules. Run these once by hand to bootstrap real data
and catch problems immediately, in this order:

1. Actions tab → **Sync model specs (Hugging Face)** → **Run workflow** →
   confirm. Wait for it to finish (green check).
2. Actions tab → **Sync capability scores (Artificial Analysis)** →
   **Run workflow** → confirm. This is the one that will tell you whether the
   two uncertain DeepSeek aliases actually resolve.
3. Actions tab → **Reconcile registries** → **Run workflow** → confirm.

**If reconciliation fails (red X)**: click into the run and read the log. It
will tell you exactly which model has a coverage gap or an unresolved alias —
that's the system working correctly, not a bug. Per ChatGPT's beta condition,
do not bypass this to force all 10 models to display; either fix the alias in
`data/canonical_models.json` and re-run, or exclude that model from beta
recommendations until it's fixed.

**Do NOT run the NIM workflow yet.** It's manual-only and will very likely fail
— the endpoint is unconfirmed. That's expected and correct for beta.

## 6. Verify

After step 5, open `data/model_specs.json` and `data/model_capability_db.json`
in the repo — you should see real data with today's `synced_at` timestamp, not
the placeholder examples from earlier zips. If `data/aa_discovery_candidates.json`
appears, that's normal — it lists open-weight models Artificial Analysis
reports that aren't in your canonical registry yet, for you to review later,
not an error.

## 7. What's still manual / not yet automated

- **NIM sync**: stays manual-only (no schedule) until someone with NGC /
  build.nvidia.com API access confirms the real endpoint. See the big comment
  at the top of `sync-nim-compatibility-MANUAL-ONLY.yml`.
- **Governance registry** (`data/model_governance.json`): no sync exists or
  should exist — it's reviewed and edited by hand when a new model is added
  or a `developer_country` entry needs re-verification.
- **Canonical registry** (`data/canonical_models.json`): also hand-edited.
  When `aa_discovery_candidates.json` surfaces a new model worth tracking,
  add it here deliberately — never auto-import.

## Beta disclaimer text (for whoever builds the app/matching engine next)

Per the review, the app should surface something like this near the
recommendations, not bury it in fine print:

> Beta — model recommendations use periodically refreshed third-party
> benchmark and model metadata. Verify licensing and deployment requirements
> before production use.

And per the same review: when `param_count_billion.value` is `null` in a
model's spec record (meaning it fell back to a size-class estimate), the app
should say so explicitly wherever that number flows into the GPU sizing
handoff — the provenance object already carries this signal
(`verification_method: "unverified"`), the app just needs to surface it
rather than silently treat an estimate as a confirmed figure.

And for NIM specifically: until real data exists, the UI should say
**"NIM validation data unavailable — integration pending"**, never
`nim_supported: false`. Absence of data is not the same claim as absence of
support, and showing `false` would misrepresent nine unconfirmed models as
nine confirmed non-supported ones.
