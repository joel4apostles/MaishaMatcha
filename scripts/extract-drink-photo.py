#!/usr/bin/env python3
"""Extract the recipe-builder drink photograph from the brand identity PDF.

PhotoDrink.tsx static-imports public/images/drink-real.jpg — the build fails
without it. The source of truth is the 736x1308 photo embedded in
"Maisha Proposed Brand Identity.pdf" (identified by dimensions). Re-run this
if the asset is ever lost; it is idempotent.

Usage: /usr/bin/python3 scripts/extract-drink-photo.py
"""

import os
import sys

import fitz  # PyMuPDF

PDF = os.path.expanduser("~/Downloads/Maisha Proposed Brand Identity.pdf")
OUT = os.path.join(os.path.dirname(__file__), "..", "public", "images", "drink-real.jpg")
SIZE = (736, 1308)

doc = fitz.open(PDF)
seen = set()
for page in doc:
    for img in page.get_images(full=True):
        xref = img[0]
        if xref in seen:
            continue
        seen.add(xref)
        info = doc.extract_image(xref)
        if (info["width"], info["height"]) == SIZE:
            with open(os.path.abspath(OUT), "wb") as f:
                f.write(info["image"])
            print(f"saved {os.path.abspath(OUT)} ({info['width']}x{info['height']}, {len(info['image'])} bytes, {info['ext']})")
            sys.exit(0)

sys.exit(f"no {SIZE[0]}x{SIZE[1]} image found in {PDF}")
