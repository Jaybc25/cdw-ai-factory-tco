"""
Shared utilities for the Model Advisor sync scripts.

v2 of this module, incorporating the pre-build review's agreed changes:
- schema_version stamped on every snapshot envelope
- schema validation before a snapshot is allowed to replace the last-known-good one
- record-count regression protection (a snapshot that suddenly has far fewer
  records than before is rejected, not silently accepted)
- a confidence-degradation helper: once a snapshot exceeds its staleness
  threshold, the app should stop treating it as current rather than serving
  it indefinitely without saying so

Everything from v1 (atomic writes, fail-loud-don't-overwrite) is unchanged.
"""

import json
import sys
from datetime import datetime, timezone
from pathlib import Path

SCHEMA_VERSION = 1

# How old a snapshot can get before it's flagged as stale. Different per
# registry because the underlying data moves at different speeds.
STALENESS_THRESHOLDS_DAYS = {
    "model_specs.json": 30,
    "model_capability_db.json": 7,
    "nim_compatibility.json": 14,
}

# How far record count is allowed to drop between syncs before a snapshot
# is rejected outright. Protects against pagination bugs or an upstream API
# quietly changing shape and returning a technically-valid but hollow response.
MAX_RECORD_COUNT_DROP_PCT = 30


class SnapshotValidationError(Exception):
    """Raised when a freshly fetched snapshot fails structural validation
    and must not be allowed to replace the last-known-good one."""


def utcnow_iso():
    return datetime.now(timezone.utc).isoformat()


def load_snapshot(path: Path):
    """Load an existing snapshot, or None if it doesn't exist yet."""
    if not path.exists():
        return None
    with open(path, "r") as f:
        return json.load(f)


def validate_snapshot(models: list, required_fields: list, min_records: int = 1):
    """
    Structural validation a fetch result must pass before it's allowed to
    become the new snapshot. A 200 response with a syntactically valid body
    is not the same thing as valid data, this is what actually checks that.
    """
    if not isinstance(models, list):
        raise SnapshotValidationError(f"expected a list of model records, got {type(models).__name__}")

    if len(models) < min_records:
        raise SnapshotValidationError(
            f"only {len(models)} record(s) returned, below the minimum plausible count of {min_records}"
        )

    seen_ids = set()
    for i, model in enumerate(models):
        for field in required_fields:
            if field not in model or model[field] in (None, ""):
                raise SnapshotValidationError(f"record {i} missing required field '{field}': {model}")
        mid = model.get("model_id")
        if mid in seen_ids:
            raise SnapshotValidationError(f"duplicate model_id '{mid}' in fetched records")
        seen_ids.add(mid)


def check_record_count_regression(new_count: int, previous_count, max_drop_pct: int = MAX_RECORD_COUNT_DROP_PCT):
    """
    Reject a snapshot whose record count dropped more than max_drop_pct
    versus the last good snapshot. previous_count is None on a first-ever
    sync, in which case there's nothing to compare against.
    """
    if previous_count is None or previous_count == 0:
        return
    drop_pct = 100 * (previous_count - new_count) / previous_count
    if drop_pct > max_drop_pct:
        raise SnapshotValidationError(
            f"record count dropped {drop_pct:.0f}% ({previous_count} -> {new_count}), "
            f"exceeding the {max_drop_pct}% regression threshold. Likely a pagination bug "
            f"or an upstream API/schema change, not a legitimate data change."
        )


def write_snapshot(path: Path, models: list, source: str, extra_envelope_fields=None):
    """
    Write a snapshot with the standard envelope: schema_version, source,
    synced_at, record_count, plus any registry-specific envelope fields
    (e.g. source_api_tier, intelligence_index_version for the capability
    registry), then the model records themselves.

    extra_envelope_fields may be a dict, or a zero-arg callable returning a
    dict — use a callable when a field (like intelligence_index_version)
    is only known after the fetch has actually run, so it isn't evaluated
    too early and silently frozen at None.
    """
    resolved_extra = extra_envelope_fields() if callable(extra_envelope_fields) else (extra_envelope_fields or {})
    envelope = {
        "schema_version": SCHEMA_VERSION,
        "source": source,
        "synced_at": utcnow_iso(),
        "record_count": len(models),
        **resolved_extra,
        "data": {"models": models},
    }
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp_path = path.with_suffix(".tmp")
    with open(tmp_path, "w") as f:
        json.dump(envelope, f, indent=2)
    tmp_path.replace(path)  # atomic swap, never leaves a half-written file behind
    print(f"[sync] wrote {path} ({envelope['record_count']} records, synced_at={envelope['synced_at']})")


def safe_fetch(
    fetch_fn,
    path: Path,
    source: str,
    required_fields: list,
    min_records: int = 1,
    max_drop_pct: int = MAX_RECORD_COUNT_DROP_PCT,
    extra_envelope_fields=None,
):
    """
    Run fetch_fn() -> list[dict]. Validate the result structurally and
    against record-count regression before writing. On any failure
    (fetch error, validation error, or regression), leave the existing
    snapshot untouched and report loudly, the app keeps serving
    last-known-good data instead of breaking or silently going hollow.
    """
    existing = load_snapshot(path)
    previous_count = existing["record_count"] if existing else None

    try:
        models = fetch_fn()
        validate_snapshot(models, required_fields, min_records)
        check_record_count_regression(len(models), previous_count, max_drop_pct)
        write_snapshot(path, models, source, extra_envelope_fields)
        return True
    except Exception as e:
        age_note = f"existing snapshot from {existing['synced_at']} is still in place" if existing else \
            "NO existing snapshot, the app has nothing to fall back on yet"
        print(
            f"[sync] FAILED to refresh {path.name} from {source}: {e}\n"
            f"[sync] {age_note}. Not overwriting. Fix this before the next scheduled run.",
            file=sys.stderr,
        )
        return False


def check_staleness(output_dir: Path):
    """
    Report which snapshots are past their staleness threshold. Intended to
    run as its own CI/cron step, separate from the sync scripts themselves.
    """
    stale = []
    for filename, max_age_days in STALENESS_THRESHOLDS_DAYS.items():
        path = output_dir / filename
        snapshot = load_snapshot(path)
        if snapshot is None:
            stale.append((filename, "missing entirely"))
            continue
        synced_at = datetime.fromisoformat(snapshot["synced_at"])
        age_days = (datetime.now(timezone.utc) - synced_at).days
        if age_days > max_age_days:
            stale.append((filename, f"{age_days}d old (threshold {max_age_days}d)"))
    return stale


def get_confidence_state(path: Path):
    """
    The app-facing confidence signal for a registry: 'current', 'degraded',
    or 'missing'. This is the contract the app should read rather than
    silently serving an arbitrarily old snapshot as if it were fresh.

    'degraded' means: keep serving the last-known-good data (don't break),
    but the app should visibly flag that rankings may not be current,
    per the agreed staleness-degrades-not-fails behavior.
    """
    filename = path.name
    snapshot = load_snapshot(path)
    if snapshot is None:
        return "missing"
    max_age_days = STALENESS_THRESHOLDS_DAYS.get(filename)
    if max_age_days is None:
        return "current"  # unknown file, no threshold configured
    synced_at = datetime.fromisoformat(snapshot["synced_at"])
    age_days = (datetime.now(timezone.utc) - synced_at).days
    return "current" if age_days <= max_age_days else "degraded"
