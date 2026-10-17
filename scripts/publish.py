#!/usr/bin/env python3
"""Thêm một bản tin vào kho: python3 scripts/publish.py <file.md> "<tóm tắt một câu>"

Tên file nguồn có dạng "YYYY-MM-DD ...md"; file được chép vào notes/ với tên
"YYYY-MM-DD - Bản tin sáng.md" và index.json được cập nhật (mới nhất đứng đầu).
"""
import json, re, shutil, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
src, summary = Path(sys.argv[1]), sys.argv[2]
date = re.match(r"(\d{4})-(\d{2})-(\d{2})", src.name)
if not date:
    sys.exit("Tên file phải bắt đầu bằng YYYY-MM-DD")
y, m, d = date.groups()
name = f"{y}-{m}-{d} - Bản tin sáng.md"
(ROOT / "notes").mkdir(exist_ok=True)
shutil.copyfile(src, ROOT / "notes" / name)

idx_path = ROOT / "index.json"
idx = json.loads(idx_path.read_text(encoding="utf-8")) if idx_path.exists() else {"items": []}
items = [i for i in idx["items"] if i["file"] != name]
items.append({"date": f"{y}-{m}-{d}", "file": name, "label": f"{d}/{m}/{y}", "summary": summary})
items.sort(key=lambda i: i["date"], reverse=True)
idx["items"] = items[:60]
idx_path.write_text(json.dumps(idx, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print("published", name)
