#!/usr/bin/env python3
"""Generate PWA icon PNGs from favicon.svg"""
import sys
import os

try:
    import cairosvg
    from PIL import Image
    import io
    import shutil
except ImportError as e:
    print(f"Missing: {e}. Run: pip install cairosvg pillow")
    sys.exit(1)

SRC = os.path.join(os.path.dirname(__file__), "..", "public", "favicon.svg")
OUT = os.path.join(os.path.dirname(__file__), "..", "public")

sizes = [
    ("favicon-16.png", 16, False),
    ("favicon-32.png", 32, False),
    ("favicon-48.png", 48, False),
    ("apple-touch-icon.png", 180, False),
    ("icon-192.png", 192, False),
    ("icon-512.png", 512, False),
    ("icon-512-maskable.png", 512, True),
]

def make_maskable(png_bytes, size):
    """For maskable: add safe-zone padding (10%) so the piece has breathing room."""
    img = Image.open(io.BytesIO(png_bytes)).convert("RGBA")
    canvas = Image.new("RGBA", (size, size), (9, 18, 16, 255))
    pad = int(size * 0.10)
    inner = size - 2 * pad
    img = img.resize((inner, inner), Image.LANCZOS)
    canvas.paste(img, (pad, pad), img)
    buf = io.BytesIO()
    canvas.save(buf, "PNG")
    return buf.getvalue()

for filename, size, maskable in sizes:
    png = cairosvg.svg2png(url=SRC, output_width=size, output_height=size)
    if maskable:
        png = make_maskable(png, size)
    path = os.path.join(OUT, filename)
    with open(path, "wb") as f:
        f.write(png)
    print(f"  {filename} ({size}x{size})")

# Also copy v2 variants (used by manifest)
for src_name, dst_name in [
    ("favicon-16.png", "favicon-16-v2.png"),
    ("favicon-32.png", "favicon-32-v2.png"),
    ("favicon-48.png", "favicon-48-v2.png"),
    ("apple-touch-icon.png", "apple-touch-icon-v2.png"),
    ("icon-192.png", "icon-192-v2.png"),
    ("icon-512.png", "icon-512-v2.png"),
    ("icon-512-maskable.png", "icon-512-maskable-v2.png"),
]:
    shutil.copy(os.path.join(OUT, src_name), os.path.join(OUT, dst_name))
    print(f"  {dst_name} (copy)")

print("Done.")
