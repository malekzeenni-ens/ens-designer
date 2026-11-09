"""SVG assembly without svgwrite's costly per-coordinate debug validation."""
from __future__ import annotations

import json
import xml.etree.ElementTree as ET

import svgwrite


def path_data(path) -> str:
    values = []
    for cmd in path.commands:
        if cmd.type in ("M", "L"):
            values.append(f"{cmd.type}{cmd.x:.3f},{cmd.y:.3f}")
        elif cmd.type == "Q":
            values.append(f"Q{cmd.x1:.3f},{cmd.y1:.3f} {cmd.x:.3f},{cmd.y:.3f}")
        elif cmd.type == "C":
            values.append(f"C{cmd.x1:.3f},{cmd.y1:.3f} {cmd.x2:.3f},{cmd.y2:.3f} {cmd.x:.3f},{cmd.y:.3f}")
        else:
            values.append("Z")
    return " ".join(values)


def assemble_svg(backing_paths, text_paths, request, width, height, *, recipe=None, layer=None, glyph_indices=None, hit_paths=None):
    drawing = svgwrite.Drawing(size=(f"{width:.3f}mm", f"{height:.3f}mm"), profile="full", debug=False)
    drawing.viewbox(0, 0, round(width, 3), round(height, 3))
    drawing.attribs["version"] = "1.1"
    groups = []
    if layer != "text":
        groups.append(("CUT_BACKING", backing_paths, request.colors.backing))
    if layer != "backing":
        groups.append(("ENGRAVE_TEXT" if request.style == "engraved" else "CUT_TEXT", text_paths, request.colors.text))
    for name, paths, color in groups:
        group = drawing.g(id=name, fill=color, stroke="none", fill_rule="nonzero")
        for path in paths:
            group.add(drawing.path(d=path_data(path), id=path.path_id))
        drawing.add(group)
    if glyph_indices is not None:
        hits = drawing.g(id="GLYPH_HIT_TARGETS", fill="#000000", fill_opacity=0, stroke="none")
        for path in (hit_paths if hit_paths is not None else text_paths):
            hit = drawing.path(d=path_data(path), id=f"hit-{path.path_id}")
            hit.attribs["data-glyph-index"] = str(glyph_indices[path.path_id])
            hit.attribs["pointer-events"] = "all"
            hits.add(hit)
        drawing.add(hits)
    svg = drawing.tostring()
    if recipe is not None:
        # ElementTree escapes JSON and comment text; user names never become XML.
        metadata = ET.Element("metadata", {"id": "ens-recipe"})
        metadata.text = json.dumps(recipe, ensure_ascii=False, separators=(",", ":"))
        name = request.text.replace("--", "—").replace("-", "−")
        comment = ET.tostring(ET.Comment(f" EnS Designer — Keychain Recipe: {name} "), encoding="unicode")
        opening_end = svg.index(">") + 1
        svg = svg[:opening_end] + comment + ET.tostring(metadata, encoding="unicode") + svg[opening_end:]
    return svg
