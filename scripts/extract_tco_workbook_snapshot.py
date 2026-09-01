#!/usr/bin/env python3
"""Extract a deterministic JSON snapshot from the checked-in TCO XLSX workbook.

This intentionally uses only Python's standard library. The XLSX remains the
source artifact; the generated JSON makes its sheet names, formulas, and cached
values inspectable by CI and repo-connected reviewers without requiring Excel.

It does NOT recalculate formulas. Recalculation belongs to the parity runner;
this extractor is the first deterministic bridge from the binary reference
workbook into the test harness.
"""

from __future__ import annotations

import argparse
import json
import re
import zipfile
from pathlib import Path
from xml.etree import ElementTree as ET

NS_MAIN = "http://schemas.openxmlformats.org/spreadsheetml/2006/main"
NS_REL = "http://schemas.openxmlformats.org/officeDocument/2006/relationships"
NS_PKG_REL = "http://schemas.openxmlformats.org/package/2006/relationships"
NS = {"m": NS_MAIN, "r": NS_REL, "pr": NS_PKG_REL}


def col_to_num(col: str) -> int:
    n = 0
    for ch in col:
        n = n * 26 + (ord(ch.upper()) - 64)
    return n


def cell_sort_key(ref: str):
    m = re.fullmatch(r"([A-Z]+)(\d+)", ref)
    if not m:
        return (10**9, 10**9)
    return (int(m.group(2)), col_to_num(m.group(1)))


def normalize_target(target: str) -> str:
    if target.startswith("/"):
        return target.lstrip("/")
    while target.startswith("../"):
        target = target[3:]
    if target.startswith("xl/"):
        return target
    return "xl/" + target


def read_shared_strings(zf: zipfile.ZipFile) -> list[str]:
    try:
        root = ET.fromstring(zf.read("xl/sharedStrings.xml"))
    except KeyError:
        return []
    strings = []
    for si in root.findall("m:si", NS):
        parts = []
        for t in si.iter(f"{{{NS_MAIN}}}t"):
            parts.append(t.text or "")
        strings.append("".join(parts))
    return strings


def read_sheet_map(zf: zipfile.ZipFile) -> list[tuple[str, str]]:
    workbook = ET.fromstring(zf.read("xl/workbook.xml"))
    rels = ET.fromstring(zf.read("xl/_rels/workbook.xml.rels"))
    rel_map = {
        rel.attrib["Id"]: normalize_target(rel.attrib["Target"])
        for rel in rels.findall("pr:Relationship", NS)
    }
    sheets = []
    for sheet in workbook.find("m:sheets", NS):
        name = sheet.attrib["name"]
        rid = sheet.attrib[f"{{{NS_REL}}}id"]
        sheets.append((name, rel_map[rid]))
    return sheets


def parse_cell(cell: ET.Element, shared: list[str]):
    ref = cell.attrib.get("r")
    typ = cell.attrib.get("t")
    formula_node = cell.find("m:f", NS)
    value_node = cell.find("m:v", NS)
    inline_node = cell.find("m:is", NS)
    formula = formula_node.text if formula_node is not None else None

    raw = value_node.text if value_node is not None else None
    value = None
    if typ == "s" and raw is not None:
        try:
            value = shared[int(raw)]
        except (ValueError, IndexError):
            value = raw
    elif typ == "inlineStr" and inline_node is not None:
        value = "".join(t.text or "" for t in inline_node.iter(f"{{{NS_MAIN}}}t"))
    elif typ == "b" and raw is not None:
        value = raw == "1"
    elif typ in {"str", "e"}:
        value = raw
    elif raw is not None:
        try:
            value = float(raw)
            if value.is_integer():
                value = int(value)
        except ValueError:
            value = raw

    return ref, {"value": value, "formula": formula, "type": typ}


def extract(workbook_path: Path) -> dict:
    with zipfile.ZipFile(workbook_path) as zf:
        shared = read_shared_strings(zf)
        sheet_map = read_sheet_map(zf)
        result = {
            "source": str(workbook_path).replace("\\", "/"),
            "note": "Cached values are extracted from the XLSX package; this snapshot does not recalculate formulas.",
            "sheets": [],
        }
        for name, target in sheet_map:
            root = ET.fromstring(zf.read(target))
            cells = {}
            formulas = 0
            for cell in root.findall(".//m:c", NS):
                ref, parsed = parse_cell(cell, shared)
                if ref:
                    cells[ref] = parsed
                    formulas += parsed["formula"] is not None
            ordered = {k: cells[k] for k in sorted(cells, key=cell_sort_key)}
            result["sheets"].append({
                "name": name,
                "path": target,
                "cell_count": len(ordered),
                "formula_count": formulas,
                "cells": ordered,
            })
        return result


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--workbook", default="docs/reverse-tco-model-v1.xlsx")
    parser.add_argument("--output", default="tests/tco-parity/workbook_snapshot.json")
    args = parser.parse_args()

    workbook = Path(args.workbook)
    output = Path(args.output)
    if not workbook.exists():
        raise SystemExit(f"Workbook not found: {workbook}")

    snapshot = extract(workbook)
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(snapshot, indent=2, sort_keys=False) + "\n", encoding="utf-8")
    print(f"Extracted {len(snapshot['sheets'])} sheets to {output}")
    print("Sheets:", ", ".join(s["name"] for s in snapshot["sheets"]))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
