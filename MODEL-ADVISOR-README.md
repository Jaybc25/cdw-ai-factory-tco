# Model Advisor — Registry Sync Architecture (Final, All Review Rounds Applied)

Four rounds of pre-build/deployment review, all agreed items incorporated,
including one real bug caught only by reading the actual code against a
live-data scenario: see "Discovery vs. production filtering" below.

| Item | Status |
|---|---|
| Canonical identity architecture | 🟢 Built and tested |
| Governance registry structure/provenance | 🟢 Built, `developer_country` precision fix applied |
| License/param-count field-level provenance | 🟢 Implemented in `sync_model_specs.py` |
| Script-relative `data/` paths | 🟢 Fixed |
| Discovery-vs-production filtering (AA + NIM) | 🟢 Fixed — see below. This was a real bug: the original code would have rejected the entire capability snapshot on the first live sync |
| Artificial Analysis aliases | 🟡 5 of 10 confirmed against real pages/citations, 3 pattern-matched (unconfirmed), 2 flagged UNCERTAIN (DeepSeek's dated-release naming) |
| NVIDIA NIM aliases | 🔴 All null — no live NIM data has ever been synced |
| NVIDIA NIM catalog endpoint | 🔴 Investigated, could not confirm a real bulk catalog-wide endpoint exists |

## Discovery vs. production filtering (AA + NIM)

Both `sync_capability_scores.py` and `sync_nim_compatibility.py` pull from a
catalog far larger than our 10-model canonical registry. The canonical resolver
correctly returns `canonical_model_id: None` for anything not explicitly mapped
— but `safe_fetch()`'s schema validation requires `canonical_model_id` to be
non-null on every record, and rejects the WHOLE snapshot if any record fails
validation.

Putting the full resolved list (mapped + unmapped) into the production snapshot
meant the first real Artificial Analysis sync would have returned far more than
10 open-weight models, hit at least one unmapped one, and rejected the entire
capability registry on day one. Confirmed by reproducing it directly against
the validation logic before fixing it.

**The fix**: both scripts now split resolved records into `tracked_models`
(canonical_model_id present — these go into the production snapshot) and
unresolved candidates (written to `data/aa_discovery_candidates.json` /
`data/nim_discovery_candidates.json`, informational only, never fed into
validation). New models enter the advisor only when someone deliberately adds
them to `canonical_models.json` — an upstream API returning a model we haven't
reviewed is a discovery event, not something that should silently expand (or
silently break) the customer-facing registry.

Reconciliation's coverage-gap check is unaffected by this and remains the
correct mechanism for the inverse question: of the 10 models we DO track, did
all 10 get capability data back.

## Registries

| Registry | File | Source | Cadence | Primary use |
|---|---|---|---|---|
| 1. Model specs | `model_specs.json` | Hugging Face Hub API | Monthly | Primary source for license, context length, architecture, modality |
| 2. Capability scores | `model_capability_db.json` | Artificial Analysis API (free tier) | Weekly | Capability/benchmark indices, performance, pricing |
| 3. NIM compatibility | `nim_compatibility.json` | NVIDIA NIM catalog | Every 2 weeks | Validated GPU deployment paths (filter/flag, not a score) |
| Governance (manual) | `data/model_governance.json` | No public API — manually maintained | Reviewed on demand | Origin country, approved-vendor-family, hard-filter inputs |
| Canonical identity (manual) | `data/canonical_models.json` | Manually maintained | Reviewed on demand | Maps each source's own ID scheme to one canonical_model_id |

## Why a canonical identity layer

Hugging Face, Artificial Analysis, and NVIDIA's NIM catalog each use a different
identifier for the same model (`meta-llama/Llama-3.1-70B` vs a slug vs a NIM
profile ID). Without an explicit mapping, cross-registry reconciliation only works
by coincidence. `canonical_registry.py` resolves each source's ID into one
`canonical_model_id` via exact-match lookup against `data/canonical_models.json`
— **never fuzzy matching at runtime**. An ID with no match is not guessed at; it's
flagged (`needs_alias_mapping: true`) and surfaced by the reconciliation script so
a human decides whether it's a new model to add or a data-quality issue upstream.

## No paid subscription required — read this before assuming otherwise

**An earlier version of this registry required a paid Artificial Analysis Pro
subscription ($417/mo). That's no longer true**, and this section documents
why so nobody re-adds the dependency without re-deriving the reasoning.

The fields the earlier script pulled from Pro — `parameters`, `modalities`,
`licensing`, `context_window_tokens`, `huggingface_url` — were never actually
*used* anywhere. Hugging Face (Registry 1) was already the deliberate primary
source for license, modality, and parameter count. Artificial Analysis's job
was always just capability scores, speed, and pricing — every one of which
**is present on the free tier**. `sync_capability_scores.py` now targets
`/api/v2/language/models/free` and only requires a free AA account + API key
(sign up at artificialanalysis.ai, no payment needed).

The one thing that changed in the rewrite: the old script filtered on
`licensing.is_open_weights`, a Pro-only field. That filter was redundant —
this registry only ever keeps models that resolve against the 10-model
canonical registry, and those were only added there because HF already
confirmed them open-weight. Canonical-registry membership does the
open-weight filtering; AA's own flag was never load-bearing once that
architecture existed.

**If this changes later**: Pro would only be worth paying for if the
matching/scoring engine (not yet built) wants Artificial Analysis's
per-benchmark granularity (GPQA, HLE, SciCode, etc., not just the 3
composite indices) or wants to cross-validate license/modality against HF
rather than trusting HF alone. Neither is a current requirement.

## Source responsibility (deliberately not consolidated onto one API)

Hugging Face stays the **primary** source for license, modality, and
parameter count in Registry 1. Artificial Analysis is used only for
capability scores, performance, and pricing. This was always the design —
Registry 2 losing access to AA's own license/modality/parameter fields (by
moving to free tier) changes nothing, because this registry never depended
on them being accurate or present.

## Hardened sync behavior (this round's additions)

- **Schema validation before replacement** — a fetch result is checked for
  required fields and minimum record count before it's allowed to become the new
  snapshot. A syntactically valid 200 response with hollow or malformed data is
  rejected, not written.
- **Record-count regression protection** — a snapshot whose record count drops
  more than 30% versus the last good one is rejected outright (see
  `MAX_RECORD_COUNT_DROP_PCT` in `common.py`). Catches pagination bugs and silent
  upstream schema changes.
- **Schema versioning** — every snapshot envelope carries `schema_version`, so
  the app (or the matching engine) knows which registry contract it's reading
  against rather than assuming forward compatibility forever.
- **Confidence degradation, not silent failure** — `get_confidence_state()`
  returns `current`, `degraded`, or `missing` per registry. A `degraded` registry
  keeps serving its last-known-good data (per the original fail-loud/don't-overwrite
  design), but the app is expected to visibly reduce its confidence claim rather
  than presenting aged rankings as current indefinitely.
- **Bidirectional coverage reconciliation** — `reconcile_registries.py` now
  flags a spec model with no capability score (can't be meaningfully ranked, a
  real gap) but deliberately does NOT flag a spec model with no NIM entry (a
  legitimate model characteristic, not a data problem).

## Governance registry

Formalized as its own file, `data/model_governance.json`, rather than folded into
Registry 1. Each entry carries `developer_country`, `approved_vendor_family`,
`source`, `verified_at`, and `verification_method`.

**`developer_country` precision note** (added after deployment review): this is
the developing organization's headquarters country, derived from published model
cards and org HQ — a company-domicile proxy, not a claim about where actual
development or training took place. A "developer-organization country only"
governance requirement should be defined against this field explicitly, since
customers may read "U.S.-developed" more strongly than the metadata supports.

No public API tracks this data — it's manually reviewed, and `verified_at` should
be updated on re-review, not just at creation.

## Scoped field-level provenance

Per the second review round, detailed provenance (`value` / `source` /
`verified_at` / `verification_method`) is tracked for **license, governance, and
parameter count** — the fields where an error has material consequences (wrongly
excluding a valid model, admitting an invalid one, or corrupting the
infrastructure handoff).

This is now actually implemented, not just documented — a deployment-readiness
review caught that an earlier version of this README claimed provenance for
license/param count while `sync_model_specs.py` still emitted plain values.
`sync_model_specs.py` now emits `license` and `param_count_billion` as full
provenance objects, matching the governance registry's shape. Everything else
relies on registry-level provenance (the envelope's `source` + `synced_at`),
which is sufficient since the source is unambiguous from the snapshot itself.

## Settled Phase 1 inputs (10, not 9)

Added `optimization_priority` (best capability / balanced / infrastructure
efficiency) per the review — without it, "best overall fit" is entirely
determined by internal scoring weights the customer never sees or influences.

## Settled hard-filter behavior

License and governance requirements are **hard filters when the customer states
them**, not warnings on a non-matching result. A third state, "requires
verification," exists for insufficient metadata — distinct from both "passes" and
"excluded."

## Running the sync scripts

```

pip install requests

export AA_API_KEY=your_free_tier_key

python3 sync_model_specs.py

python3 sync_capability_scores.py

python3 sync_nim_compatibility.py

python3 reconcile_registries.py

```

None of these were run against live data in this build — `huggingface.co`,

`artificialanalysis.ai`, and `build.nvidia.com` aren't reachable from this

sandbox. All logic (schema validation, record-count regression, canonical

resolution, confidence degradation, bidirectional reconciliation) was verified

offline with mocked fetch functions; see the test output from this session for

what was actually exercised.

The NVIDIA NIM catalog endpoint in `sync_nim_compatibility.py` is still a

placeholder — unlike the Artificial Analysis endpoint, it was not independently

verified against live docs and needs confirming before a real run.

## Beta status — GO, with conditions

Cleared for beta build after four review rounds. Conditions from the final

review, all adopted:

- **NVIDIA NIM is disabled in beta, not just incomplete.** No schedule exists

  for that sync (see `.github/workflows/sync-nim-compatibility-MANUAL-ONLY.yml`).

  The UI must say "NIM validation data unavailable — integration pending," never

  `nim_supported: false` — absence of data isn't the same claim as absence of

  support.

- **Artificial Analysis capability data goes live only after the first

  successful authenticated sync + a clean reconciliation run.** Don't trust

  the aliases until that's happened at least once — see `GITHUB-SETUP.md` step 5.

- **If a tracked model fails to get capability coverage, exclude it from

  recommendations or flag an explicit data-quality state.** Do not bypass

  reconciliation to force all 10 models to display.

- **Beta disclaimer**, surfaced in the app, not buried: "Beta — model

  recommendations use periodically refreshed third-party benchmark and model

  metadata. Verify licensing and deployment requirements before production use."

- **GPU-sizing handoff stays explicit about estimated param counts** — when

  `param_count_billion.value` is null (size-class fallback), the app should say

  so wherever that number is used, not silently treat it as confirmed.

See `GITHUB-SETUP.md` for the actual deployment steps and first-sync checklist.

## What's next

The data/registry layer is now closed for Phase 1. The next piece of work — and

the next thing that should go through its own review — is the matching/scoring

logic that turns the 10 customer inputs into the three-model shortlist output.

That was intentionally kept out of scope for both review rounds so it gets

focused attention on its own.
