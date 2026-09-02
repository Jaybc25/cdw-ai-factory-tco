#!/usr/bin/env python3
from pathlib import Path
import runpy

updater = Path("scripts/update_internal_versioning_docs_once.py")
text = updater.read_text(encoding="utf-8")
# The first staged updater over-escaped literal dots inside raw regex strings.
text = text.replace(r"\\.", r"\.")
updater.write_text(text, encoding="utf-8")
runpy.run_path(str(updater), run_name="__main__")
