"""K5 export-file validation and operator sample package.

Generates labelled Keychain exports through the real service, writes the SVG
and PNG files, then validates the written files themselves (not response
metadata): XML, physical mm canvas, measured cut-contour size, actual ring
hole diameter, winding, layer groups, curve commands, absence of preview hit
paths, separate-file alignment, recipe round-trip and PNG transparency.

Usage (repository root):
    .venv313\\Scripts\\python.exe scripts\\keychain_validate_exports.py --out docs/qa/keychain-k5-evidence/samples
"""
from __future__ import annotations

import argparse
import base64
import io
import json
import re
import sys
import xml.etree.ElementTree as ET
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))

from PIL import Image  # noqa: E402

from app.font_loader import FontCatalog  # noqa: E402
from app.keychain_engine import KeychainService  # noqa: E402
from app.models import KeychainRequest  # noqa: E402

NS = {"svg": "http://www.w3.org/2000/svg"}
FONTS = {
    "script": "Anton,League_Spartan,Lora,Quicksand,Satisfy/Satisfy/Satisfy-Regular.ttf",
    "display": "Anton,League_Spartan,Lora,Quicksand,Satisfy/Anton/Anton-Regular.ttf",
}
CASES = [
    ("01-engraved-default-60mm", "script", dict(text="Sarah")),
    ("02-mini-charm-40mm", "script", dict(text="Ali", size={"mode": "width", "target_mm": 40},
                                          ring={"outer_diameter_mm": 10, "hole_diameter_mm": 4})),
    ("03-bag-tag-90mm", "display", dict(text="Maximilian", size={"mode": "width", "target_mm": 90},
                                        backing={"offset_mm": 4, "fill_counters": True, "smoothing_mm": .5},
                                        ring={"outer_diameter_mm": 15, "hole_diameter_mm": 6})),
    ("04-layered-combined-custom-colours", "display", dict(text="Jo", style="layered",
                                                           colors={"backing": "#1E3A8A", "text": "#F59E0B"})),
    ("05-layered-separate-60mm", "script", dict(text="Sarah", style="layered", layered_export="separate")),
    ("06-height-30mm", "display", dict(text="Bee", size={"mode": "height", "target_mm": 30})),
]
NUMBER = re.compile(r"-?\d+(?:\.\d+)?(?:e-?\d+)?")


def subpaths(d: str):
    """Polygon subpaths of an M/L/Z backing path (shapely output has no curves)."""
    out = []
    for chunk in re.split(r"(?=M)", d):
        values = [float(v) for v in NUMBER.findall(chunk)]
        if len(values) >= 6:
            out.append(list(zip(values[0::2], values[1::2])))
    return out


def signed_area(points):
    return sum(x0*y1-x1*y0 for (x0, y0), (x1, y1) in zip(points, points[1:] + points[:1])) / 2


def bounds(points):
    xs, ys = [p[0] for p in points], [p[1] for p in points]
    return min(xs), min(ys), max(xs), max(ys)


def mm(value: str) -> float:
    assert value.endswith("mm"), value
    return float(value[:-2])


def inspect_svg(text: str):
    root = ET.fromstring(text)  # raises on invalid XML
    assert root.tag == "{http://www.w3.org/2000/svg}svg"
    vb = [float(v) for v in root.get("viewBox").replace(",", " ").split()]
    groups = {g.get("id"): g for g in root.iter("{http://www.w3.org/2000/svg}g") if g.get("id")}
    info = {"width_mm": mm(root.get("width")), "height_mm": mm(root.get("height")), "viewBox": vb,
            "groups": sorted(groups), "hit_paths": len(re.findall(r"data-glyph-index", text)),
            "metadata": None}
    meta = root.find("svg:metadata", NS)
    if meta is not None and meta.text:
        info["metadata"] = json.loads(meta.text)
    if "CUT_BACKING" in groups:
        parts = [sp for p in groups["CUT_BACKING"].iter("{http://www.w3.org/2000/svg}path") for sp in subpaths(p.get("d"))]
        areas = [signed_area(p) for p in parts]
        outer = [p for p, a in zip(parts, areas) if abs(a) == max(abs(x) for x in areas)][0]
        outer_sign = 1 if signed_area(outer) > 0 else -1
        holes = [p for p, a in zip(parts, areas) if a * outer_sign < 0]
        all_points = [pt for p in parts for pt in p]
        x0, y0, x1, y1 = bounds(all_points)
        info["backing"] = {"subpaths": len(parts), "outer_contours": sum(1 for a in areas if a * outer_sign > 0),
                           "inner_contours": len(holes), "measured_width_mm": round(x1-x0, 3),
                           "measured_height_mm": round(y1-y0, 3), "margin_mm": [round(x0, 3), round(y0, 3),
                           round(vb[2]-x1, 3), round(vb[3]-y1, 3)],
                           "fill_rule": groups["CUT_BACKING"].get("fill-rule"),
                           "duplicate_contours": len(parts) - len({tuple(map(lambda p: (round(p[0], 3), round(p[1], 3)), sp)) for sp in parts})}
        # The ring hole is the roughly circular inner contour (equal width/height).
        circular = [bounds(h) for h in holes if abs((bounds(h)[2]-bounds(h)[0])-(bounds(h)[3]-bounds(h)[1])) < .05]
        info["backing"]["hole_diameters_mm"] = [round(b[2]-b[0], 4) for b in circular]
        info["backing"]["hole_centres_mm"] = [((b[0]+b[2])/2, (b[1]+b[3])/2) for b in circular]
    for layer in ("ENGRAVE_TEXT", "CUT_TEXT"):
        if layer in groups:
            ds = " ".join(p.get("d") for p in groups[layer].iter("{http://www.w3.org/2000/svg}path"))
            info["text"] = {"layer": layer, "fill": groups[layer].get("fill"), "has_curves": bool(re.search(r"[QC]", ds)),
                            "paths": len(list(groups[layer].iter("{http://www.w3.org/2000/svg}path")))}
    return info


def inspect_png(data: bytes, canvas_w: float, canvas_h: float, hole, backing_hex: str, text_hex: str):
    image = Image.open(io.BytesIO(data)).convert("RGBA")
    w, h = image.size
    px = lambda x_mm, y_mm: image.getpixel((min(w-1, int(x_mm*w/canvas_w)), min(h-1, int(y_mm*h/canvas_h))))
    rgb = lambda hex_: tuple(int(hex_[i:i+2], 16) for i in (1, 3, 5))
    access = image.load()
    pixels = [access[x, y] for y in range(h) for x in range(w)]
    near = lambda c, target: c[3] > 250 and all(abs(a-b) <= 8 for a, b in zip(c[:3], target))
    result = {"size_px": [w, h], "corner_alpha": px(.3, .3)[3],
              "backing_pixels": sum(near(c, rgb(backing_hex)) for c in pixels),
              "text_pixels": sum(near(c, rgb(text_hex)) for c in pixels)}
    if hole:
        cx, cy = hole
        result["hole_centre_alpha"] = px(cx, cy)[3]
    return result


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--out", type=Path, required=True)
    args = parser.parse_args()
    out = (ROOT / args.out).resolve() if not args.out.is_absolute() else args.out
    out.mkdir(parents=True, exist_ok=True)
    catalog = FontCatalog(ROOT)
    catalog.list_fonts()
    fonts = {role: catalog._read_font("project", ROOT / "fonts" / path).info.id for role, path in FONTS.items()}
    service = KeychainService(ROOT, catalog)
    report, failures = [], []
    for label, role, settings in CASES:
        request = KeychainRequest(font_id=fonts[role], quality="export", **settings)
        result = service.generate(request)
        files = []
        for file in result.files:
            name = f"{label}--{file.filename}"
            (out / name).write_text(file.svg, encoding="utf-8", newline="\n")
            files.append((name, inspect_svg((out / name).read_text(encoding="utf-8"))))
        png_name = f"{label}--{result.files[0].filename.replace('-backing.svg', '.svg').replace('.svg', '.png')}"
        png_bytes = base64.b64decode(result.png_base64)
        (out / png_name).write_bytes(png_bytes)
        backing_file = next(info for _, info in files if "backing" in info)
        hole = (backing_file["backing"]["hole_centres_mm"] or [None])[0]
        png = inspect_png(png_bytes, result.canvas_width_mm, result.canvas_height_mm, hole,
                          request.colors.backing, request.colors.text)
        axis = "measured_width_mm" if request.size.mode == "width" else "measured_height_mm"
        b = backing_file["backing"]
        checks = {
            "finished size within 0.05 mm": abs(b[axis] - request.size.target_mm) <= .05,
            "canvas = finished + 2 mm margin each side": all(abs(m - 2) <= .01 for m in b["margin_mm"]),
            "svg width/height match viewBox in mm": all(abs(info["width_mm"]-info["viewBox"][2]) < .01 and abs(info["height_mm"]-info["viewBox"][3]) < .01 for _, info in files),
            "hole diameter within 0.01 mm": len(b["hole_diameters_mm"]) == 1 and abs(b["hole_diameters_mm"][0] - request.ring.hole_diameter_mm) <= .01,
            "single outer backing contour": b["outer_contours"] == 1,
            "no duplicate cut contours": b["duplicate_contours"] == 0,
            "no preview hit paths": all(info["hit_paths"] == 0 for _, info in files),
            "expected layer groups": all(set(info["groups"]) <= {"CUT_BACKING", "ENGRAVE_TEXT", "CUT_TEXT"} for _, info in files)
                and {g for _, info in files for g in info["groups"]} == ({"CUT_BACKING", "ENGRAVE_TEXT"} if request.style == "engraved" else {"CUT_BACKING", "CUT_TEXT"}),
            "unbuffered text keeps Q/C curves": all(info["text"]["has_curves"] for _, info in files if "text" in info),
            "separate files share canvas/viewBox": len({json.dumps(info["viewBox"]) for _, info in files}) == 1,
            "recipe round-trips": all(KeychainRequest.model_validate({k: v for k, v in info["metadata"].items() if k != "app_version"}).model_dump(exclude={"quality", "request_id"})
                                      == request.model_dump(exclude={"quality", "request_id"}) for _, info in files),
            "PNG exterior transparent": png["corner_alpha"] == 0,
            "PNG ring hole transparent": png.get("hole_centre_alpha") == 0,
            "PNG backing and text colours present": png["backing_pixels"] > 0 and png["text_pixels"] > 0,
        }
        failed = [name for name, ok in checks.items() if not ok]
        failures += [f"{label}: {name}" for name in failed]
        report.append({"case": label, "request": {k: v for k, v in settings.items()}, "font_role": role,
                       "reported_width_mm": result.width_mm, "reported_height_mm": result.height_mm,
                       "canvas_mm": [result.canvas_width_mm, result.canvas_height_mm],
                       "files": [{"name": name, **{k: v for k, v in info.items() if k != "metadata"}} for name, info in files],
                       "png": {"name": png_name, **png}, "production_checks": {c.id: c.severity for c in result.checks},
                       "checks": checks, "passed": not failed})
        print(f"{label}: {'PASS' if not failed else 'FAIL ' + ', '.join(failed)}")
    (out / "validation-report.json").write_text(json.dumps({"png_renderer": "see keychain-k5-benchmark.json", "cases": report},
                                                           indent=2, default=list), encoding="utf-8")
    print("All export files valid." if not failures else f"{len(failures)} failure(s)")
    sys.exit(1 if failures else 0)


if __name__ == "__main__":
    main()
