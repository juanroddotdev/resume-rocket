#!/usr/bin/env python3
"""
Hybrid hospital seed: CMS Hospital Compare (spine) + HIFLD (beds / trauma).

See docs/HOSPITAL-DATA.md for merge strategy and runbook.

  pip install -r scripts/requirements-seed.txt

  python scripts/seed_hospitals.py --fetch --dry-run
  python scripts/seed_hospitals.py --fetch
  python scripts/seed_hospitals.py --cms data/Hospital_General_Information.csv --hifld data/hifld.csv
"""

from __future__ import annotations

import argparse
import csv
import io
import os
import re
import sys
from pathlib import Path
from typing import Any

# CMS acute + critical access — travel/staff nursing autocomplete
DEFAULT_HOSPITAL_TYPES = frozenset({
    "Acute Care Hospitals",
    "Critical Access Hospitals",
})

CMS_DATASTORE_URL = (
    "https://data.cms.gov/provider-data/api/1/datastore/query/xubh-q36u/0"
)
# Legacy HIFLD Open FeatureServer (Hp6G80Pky0om7QvQ) returns Invalid URL — discontinued.
# Mirrors HIFLD hospitals schema (NAME, BEDS, TRAUMA, …). Override via HIFLD_QUERY_URL env.
DEFAULT_HIFLD_QUERY_URL = (
    "https://services1.arcgis.com/wQnFk5ouCfPzTlPw/arcgis/rest/services/"
    "Hospitals_Trauma/FeatureServer/0/query"
)
CMS_PAGE_SIZE = 1500
HIFLD_PAGE_SIZE = 2000
BATCH_SIZE = 200


def load_dotenv() -> None:
    try:
        from dotenv import load_dotenv as _load
    except ImportError:
        return
    root = Path(__file__).resolve().parents[1]
    _load(root / ".env")


def normalize_text(value: str | None) -> str:
    if not value:
        return ""
    text = str(value).strip().upper()
    text = re.sub(r"[^A-Z0-9 ]+", " ", text)
    return re.sub(r"\s+", " ", text).strip()


def normalize_state(value: str | None) -> str:
    s = normalize_text(value)
    return s[:2] if len(s) >= 2 else s


def normalize_zip(value: str | None) -> str:
    if value is None:
        return ""
    digits = re.sub(r"\D", "", str(value).strip())
    if not digits:
        return ""
    return digits.zfill(5)[:5]


def key_name_city_state(name: str, city: str | None, state: str | None) -> str:
    return "|".join([normalize_text(name), normalize_text(city), normalize_state(state)])


def key_name_zip(name: str, zip_code: str | None) -> str:
    z = normalize_zip(zip_code)
    if not z:
        return ""
    return f"{normalize_text(name)}|{z}"


def parse_int(value: str | None) -> int | None:
    if value is None or not str(value).strip():
        return None
    digits = re.sub(r"[^\d]", "", str(value))
    if not digits:
        return None
    try:
        return int(digits)
    except ValueError:
        return None


def normalize_trauma(value: str | None) -> str | None:
    if value is None or not str(value).strip():
        return None
    raw = str(value).strip().upper()
    if raw in {"", "NOT AVAILABLE", "N/A", "NA", "NONE"}:
        return None
    roman = re.search(r"\b(III|II|I|IV)\b", raw)
    if roman:
        return roman.group(1)
    digit = re.search(r"\b([1-4])\b", raw)
    if digit:
        return {"1": "I", "2": "II", "3": "III", "4": "IV"}.get(digit.group(1))
    if "LEVEL" in raw:
        tail = raw.replace("LEVEL", "").strip()
        if tail in {"I", "II", "III", "IV"}:
            return tail
    return raw[:32]


def infer_teaching(name: str, ownership: str | None) -> bool:
    upper = name.upper()
    if "UNIVERSITY" in upper:
        return True
    if ownership and "university" in ownership.lower():
        return True
    return False


def pick_column(row: dict[str, Any], *candidates: str) -> str:
    for key in candidates:
        if key in row and row[key] is not None:
            return str(row[key]).strip()
    lower_map = {str(k).lower(): k for k in row}
    for key in candidates:
        found = lower_map.get(key.lower())
        if found is not None and row[found] is not None:
            return str(row[found]).strip()
    return ""


def read_csv_rows(path: Path) -> list[dict[str, str]]:
    with path.open(newline="", encoding="utf-8-sig") as f:
        return list(csv.DictReader(f))


def rows_from_csv_text(text: str) -> list[dict[str, str]]:
    return list(csv.DictReader(io.StringIO(text)))


# --- Fetch -------------------------------------------------------------------


def http_get_json(url: str, params: dict[str, Any]) -> dict[str, Any]:
    import requests

    verify = os.environ.get("SEED_SSL_VERIFY", "true").lower() not in {
        "0",
        "false",
        "no",
    }
    resp = requests.get(url, params=params, timeout=120, verify=verify)
    resp.raise_for_status()
    data = resp.json()
    if "error" in data:
        raise RuntimeError(f"API error: {data['error']}")
    return data


def hifld_query_url() -> str:
    return os.environ.get("HIFLD_QUERY_URL", DEFAULT_HIFLD_QUERY_URL)


def fetch_hifld_from_arcgis(*, verbose: bool = True) -> list[dict[str, Any]]:
    """Paginate hospital metrics layer (HIFLD-style beds/trauma)."""
    all_attrs: list[dict[str, Any]] = []
    offset = 0
    query_url = hifld_query_url()
    while True:
        if verbose:
            print(f"  Hospital metrics (ArcGIS): fetching offset {offset}…")
        data = http_get_json(
            query_url,
            {
                "where": "1=1",
                "outFields": "NAME,ADDRESS,CITY,STATE,ZIP,BEDS,TRAUMA",
                "f": "json",
                "resultOffset": offset,
                "resultRecordCount": HIFLD_PAGE_SIZE,
            },
        )
        features = data.get("features") or []
        if not features:
            break
        for feature in features:
            attrs = feature.get("attributes") or {}
            if attrs.get("NAME"):
                all_attrs.append(attrs)
        if not data.get("exceededTransferLimit"):
            break
        offset += HIFLD_PAGE_SIZE
    if verbose:
        print(f"  Hospital metrics: {len(all_attrs)} features")
    return all_attrs


def fetch_cms_from_api(*, verbose: bool = True) -> list[dict[str, str]]:
    """
    CMS datastore JSON API (paginated). The ?download=true CSV is capped at 1500 rows.
    """
    import requests

    verify = os.environ.get("SEED_SSL_VERIFY", "true").lower() not in {
        "0",
        "false",
        "no",
    }
    if verbose:
        print("  CMS: fetching Hospital General Information (paginated)…")
    all_rows: list[dict[str, str]] = []
    offset = 0
    total: int | None = None
    while True:
        resp = requests.post(
            CMS_DATASTORE_URL,
            json={"limit": CMS_PAGE_SIZE, "offset": offset},
            timeout=120,
            verify=verify,
        )
        resp.raise_for_status()
        payload = resp.json()
        batch = payload.get("results") or []
        if total is None and payload.get("count") is not None:
            total = int(payload["count"])
        for row in batch:
            all_rows.append({str(k): "" if v is None else str(v) for k, v in row.items()})
        if verbose:
            print(f"    offset {offset}: +{len(batch)} rows")
        if len(batch) < CMS_PAGE_SIZE:
            break
        offset += CMS_PAGE_SIZE
    if verbose:
        print(f"  CMS: {len(all_rows)} rows" + (f" (expected {total})" if total else ""))
    if total and len(all_rows) < total:
        print(
            f"  Warning: CMS returned {len(all_rows)} of {total} rows.",
            file=sys.stderr,
        )
    return all_rows


# --- HIFLD index -------------------------------------------------------------


def hifld_metrics(attrs: dict[str, Any]) -> dict[str, Any]:
    return {
        "beds": parse_int(attrs.get("BEDS")),
        "trauma_level": normalize_trauma(attrs.get("TRAUMA")),
    }


def build_hifld_index(hifld_rows: list[dict[str, Any]]) -> tuple[dict[str, dict[str, Any]], dict[str, dict[str, Any]]]:
    """
    Returns (by_name_city_state, by_name_zip).
    On duplicate keys, prefer the entry that has beds populated.
    """
    by_ncs: dict[str, dict[str, Any]] = {}
    by_nz: dict[str, dict[str, Any]] = {}

    def put(target: dict[str, dict[str, Any]], key: str, metrics: dict[str, Any]) -> None:
        if not key:
            return
        prev = target.get(key)
        if prev is None or (metrics.get("beds") is not None and prev.get("beds") is None):
            target[key] = metrics

    for attrs in hifld_rows:
        name = pick_column(attrs, "NAME", "name")
        if not name:
            continue
        city = pick_column(attrs, "CITY", "city") or None
        state = pick_column(attrs, "STATE", "state") or None
        zip_code = pick_column(attrs, "ZIP", "ZIP Code", "zip") or None
        metrics = hifld_metrics(attrs)
        put(by_ncs, key_name_city_state(name, city, state), metrics)
        put(by_nz, key_name_zip(name, zip_code), metrics)

    return by_ncs, by_nz


def lookup_hifld(
    name: str,
    city: str | None,
    state: str | None,
    zip_code: str | None,
    by_ncs: dict[str, dict[str, Any]],
    by_nz: dict[str, dict[str, Any]],
) -> dict[str, Any] | None:
    hit = by_ncs.get(key_name_city_state(name, city, state))
    if hit:
        return hit
    kz = key_name_zip(name, zip_code)
    if kz:
        return by_nz.get(kz)
    return None


# --- CMS → app records -------------------------------------------------------


def cms_rows_to_records(
    cms_rows: list[dict[str, str]],
    *,
    allowed_types: frozenset[str],
    by_ncs: dict[str, dict[str, Any]],
    by_nz: dict[str, dict[str, Any]],
    limit: int | None,
) -> tuple[list[dict[str, Any]], dict[str, int]]:
    records: list[dict[str, Any]] = []
    stats = {
        "cms_total": len(cms_rows),
        "cms_filtered": 0,
        "hifld_primary": 0,
        "hifld_zip_fallback": 0,
        "hifld_unmatched": 0,
    }

    for row in cms_rows:
        facility_id = pick_column(row, "Facility ID", "facility_id")
        name = pick_column(row, "Facility Name", "facility_name", "name")
        if not name or not facility_id:
            continue
        hospital_type = pick_column(row, "Hospital Type", "hospital_type")
        if hospital_type and hospital_type not in allowed_types:
            continue
        stats["cms_filtered"] += 1
        city = pick_column(row, "City/Town", "citytown", "City", "city") or None
        state = pick_column(row, "State", "state") or None
        zip_code = pick_column(row, "ZIP Code", "zip_code", "ZIP", "zip") or None
        ownership = pick_column(
            row, "Hospital Ownership", "hospital_ownership", "ownership",
        ) or None

        ncs_key = key_name_city_state(name, city, state)
        nz_key = key_name_zip(name, zip_code)
        hifld = lookup_hifld(name, city, state, zip_code, by_ncs, by_nz)
        beds = None
        trauma_level = None
        if hifld:
            if ncs_key in by_ncs:
                stats["hifld_primary"] += 1
            elif nz_key and nz_key in by_nz:
                stats["hifld_zip_fallback"] += 1
            beds = hifld.get("beds")
            trauma_level = hifld.get("trauma_level")
        else:
            stats["hifld_unmatched"] += 1

        records.append({
            "source_id": f"cms:{facility_id}",
            "name": name,
            "city": city,
            "state": normalize_state(state) or state,
            "hospital_type": hospital_type or None,
            "beds": beds,
            "trauma_level": trauma_level,
            "teaching_status": infer_teaching(name, ownership),
        })
        if limit and len(records) >= limit:
            break

    return records, stats


def hifld_rows_from_csv(path: Path) -> list[dict[str, Any]]:
    return [dict(row) for row in read_csv_rows(path)]


# --- Supabase ----------------------------------------------------------------


def get_supabase_client():
    try:
        from supabase import create_client
    except ImportError as e:
        print("pip install -r scripts/requirements-seed.txt", file=sys.stderr)
        raise SystemExit(1) from e

    url = os.environ.get("NUXT_PUBLIC_SUPABASE_URL") or os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not key:
        print("Set NUXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env", file=sys.stderr)
        raise SystemExit(1)
    return create_client(url, key)


def to_db_payload(record: dict[str, Any]) -> dict[str, Any]:
    payload: dict[str, Any] = {
        "source_id": record["source_id"],
        "name": record["name"],
        "city": record.get("city"),
        "state": record.get("state"),
        "hospital_type": record.get("hospital_type"),
        "beds": record.get("beds"),
        "trauma_level": record.get("trauma_level"),
    }
    if record.get("teaching_status") is True:
        payload["teaching_status"] = True
    return payload


def upsert_batches(client, rows: list[dict[str, Any]]) -> int:
    written = 0
    for i in range(0, len(rows), BATCH_SIZE):
        chunk = [to_db_payload(r) for r in rows[i : i + BATCH_SIZE]]
        result = client.table("hospitals").upsert(chunk, on_conflict="source_id").execute()
        written += len(result.data) if result.data else len(chunk)
    return written


def write_inspection_csv(path: Path, rows: list[dict[str, Any]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    fieldnames = [
        "source_id",
        "name",
        "city",
        "state",
        "beds",
        "trauma_level",
        "hospital_type",
        "teaching_status",
    ]
    with path.open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames, extrasaction="ignore")
        writer.writeheader()
        for row in rows:
            writer.writerow(row)
    print(f"Wrote inspection CSV: {path}")


def print_stats(stats: dict[str, int], records: list[dict[str, Any]]) -> None:
    with_beds = sum(1 for r in records if r.get("beds") is not None)
    with_trauma = sum(1 for r in records if r.get("trauma_level"))
    with_teaching = sum(1 for r in records if r.get("teaching_status"))
    print(f"CMS rows read: {stats['cms_total']}")
    print(f"CMS rows after type filter: {stats['cms_filtered']}")
    print(f"HIFLD match (name+city+state): {stats['hifld_primary']}")
    print(f"HIFLD match (name+ZIP fallback): {stats['hifld_zip_fallback']}")
    print(f"No HIFLD match (beds/trauma null): {stats['hifld_unmatched']}")
    print(f"Records to upsert: {len(records)}")
    print(f"  with beds: {with_beds}  with trauma: {with_trauma}  teaching heuristic: {with_teaching}")


def main() -> None:
    load_dotenv()
    parser = argparse.ArgumentParser(
        description="Hybrid seed: CMS spine + HIFLD beds/trauma (see docs/HOSPITAL-DATA.md)",
    )
    parser.add_argument(
        "--fetch",
        action="store_true",
        help="Download CMS + HIFLD from live APIs (else use --cms / --hifld files)",
    )
    parser.add_argument("--cms", type=Path, help="Local Hospital_General_Information.csv")
    parser.add_argument("--hifld", type=Path, help="Local HIFLD CSV (NAME, CITY, STATE, ZIP, BEDS, TRAUMA)")
    parser.add_argument("--dry-run", action="store_true", help="Merge and report; do not write Supabase")
    parser.add_argument("--limit", type=int, help="Max CMS records after filter (testing)")
    parser.add_argument(
        "--write-csv",
        type=Path,
        metavar="PATH",
        help="Write merged rows to CSV for inspection",
    )
    parser.add_argument(
        "--include-type",
        action="append",
        dest="include_types",
        help="CMS Hospital Type to include (repeatable)",
    )
    args = parser.parse_args()

    if not args.fetch and not args.cms:
        parser.error("Provide --fetch or --cms PATH")

    # Load CMS
    if args.fetch and not args.cms:
        cms_rows = fetch_cms_from_api()
    else:
        if not args.cms or not args.cms.is_file():
            print(f"CMS file not found: {args.cms}", file=sys.stderr)
            raise SystemExit(1)
        cms_rows = read_csv_rows(args.cms)
        print(f"CMS: {len(cms_rows)} rows from {args.cms}")

    # Load HIFLD
    if args.fetch and not args.hifld:
        print("Fetching hospital metrics from ArcGIS (beds/trauma)…")
        hifld_rows = fetch_hifld_from_arcgis()
    elif args.hifld:
        if not args.hifld.is_file():
            print(f"HIFLD file not found: {args.hifld}", file=sys.stderr)
            raise SystemExit(1)
        hifld_rows = hifld_rows_from_csv(args.hifld)
        print(f"HIFLD: {len(hifld_rows)} rows from {args.hifld}")
    else:
        print("No HIFLD source — beds/trauma will be empty.", file=sys.stderr)
        hifld_rows = []

    allowed_types = frozenset(args.include_types) if args.include_types else DEFAULT_HOSPITAL_TYPES
    by_ncs, by_nz = build_hifld_index(hifld_rows)
    records, stats = cms_rows_to_records(
        cms_rows,
        allowed_types=allowed_types,
        by_ncs=by_ncs,
        by_nz=by_nz,
        limit=args.limit,
    )

    if not records:
        print("No records after filter.", file=sys.stderr)
        raise SystemExit(1)

    print_stats(stats, records)

    if args.write_csv:
        write_inspection_csv(args.write_csv, records)

    if args.dry_run:
        print("Dry run — no Supabase writes.")
        return

    client = get_supabase_client()
    written = upsert_batches(client, records)
    print(f"Upserted {written} rows (on_conflict=source_id)")


if __name__ == "__main__":
    main()
