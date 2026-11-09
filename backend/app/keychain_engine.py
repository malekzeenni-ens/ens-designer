"""Dedicated physical-size keychains, composed from the shared text pipeline."""
from __future__ import annotations

import base64
from dataclasses import dataclass
import logging
import math
from pathlib import Path
from time import perf_counter

from shapely import affinity
from shapely.geometry import Point, Polygon
from shapely.ops import linemerge, nearest_points, unary_union

from .keychain_png import render_keychain_png as _render_png
from .floating_component import (_apply_to_subpath, _bounds, _split_subpaths,
                                 detect_floating_components, join_floating_components)
from .font_cache import get_glyph_outline, get_loaded_font
from .font_loader import FontCatalog
from .keychain_svg import assemble_svg
from .keychain_validation import cut_overlap_check, polygon_parts, validate_keychain
from .models import (GeometryPath, GlyphGeometry, KeychainFile, KeychainGlyphInfo,
                     KeychainRequest, KeychainResponse, KeychainRingMetadata)
from .overlap_helpers import _bbox_gaps, _cumulative, _pair_shifts, _safe_filename, _shift_paths
from .ring_geometry import _compound_paths_from_shapely
from .shapely_converter import path_to_shapely
from .text_shaper import shape_text

logger = logging.getLogger(__name__)
REFERENCE_SIZE_MM = 100.0
CANVAS_MARGIN_MM = 2.0
APP_VERSION = "keychain-1"
OVERLAP_MM = {"auto": 1, "light": .5, "medium": 1.5, "strong": 2.5}


def transform_path(path, matrix):
    """Affine map of every endpoint/control point, preserving Bézier commands."""
    a, b, d, e, xoff, yoff = matrix
    commands = []
    for command in path.commands:
        updates = {}
        for xkey, ykey in (("x", "y"), ("x1", "y1"), ("x2", "y2")):
            x, y = getattr(command, xkey), getattr(command, ykey)
            if x is not None and y is not None:
                updates[xkey] = a*x + b*y + xoff
                updates[ykey] = d*x + e*y + yoff
        commands.append(command.model_copy(update=updates))
    return path.model_copy(update={"commands": commands})


def cluster_labels(text, shaped):
    starts = sorted({glyph.cluster for glyph in shaped} | {len(text)})
    ends = dict(zip(starts, starts[1:]))
    return [text[glyph.cluster:ends.get(glyph.cluster, len(text))] for glyph in shaped]


def fill_counters(geometry):
    return unary_union([Polygon(part.exterior) for part in polygon_parts(geometry)])


def make_backing(text, request):
    cfg = request.backing
    grown = text.buffer(cfg.offset_mm + cfg.smoothing_mm, quad_segs=16, join_style="round")
    if cfg.smoothing_mm:
        grown = grown.buffer(-cfg.smoothing_mm, quad_segs=16, join_style="round")
    return fill_counters(grown) if cfg.fill_counters else grown


def _floating_indices(path):
    parts = _split_subpaths(path.commands)
    bounds = [_bounds(part) for part in parts]
    if len(parts) < 2:
        return []
    main = max(range(len(parts)), key=lambda i: (bounds[i][2]-bounds[i][0])*(bounds[i][3]-bounds[i][1]))
    return [i for i, b in enumerate(bounds) if i != main and (b[3] <= bounds[main][1] or b[1] >= bounds[main][3])]


@dataclass
class PreparedText:
    paths: list
    glyphs: list
    labels: list
    missing: list
    floating_glyphs: set
    floats: dict
    pieces: dict
    geometry: object


def prepare_text(request, catalog, timings):
    start = perf_counter()
    path = catalog.get_font_path(request.font_id)
    loaded = get_loaded_font(path)
    shaped = shape_text(request.text, path, loaded=loaded)
    labels = cluster_labels(request.text, shaped)
    timings["shape"] = (perf_counter()-start)*1000
    n = len(shaped)
    if any(item.glyph_index >= n for item in [*request.glyph_transforms, *request.dots.manual_offsets]):
        raise ValueError("Glyph setting refers to a glyph not present in this name.")
    if any(item.pair_index >= n-1 for item in request.gap_configs):
        raise ValueError("Gap setting refers to a gap not present in this name.")
    start = perf_counter()
    paths, glyphs, missing = [], [], []
    x = y = 0
    units = REFERENCE_SIZE_MM / loaded.upem
    for index, glyph in enumerate(shaped):
        ids = []
        if glyph.glyph_name == ".notdef":
            missing.append(labels[index])
        else:
            commands, closed = get_glyph_outline(loaded, glyph.glyph_name)
            if commands:
                raw = GeometryPath(path_id=f"KC-G{index}", commands=commands, closed=closed)
                paths.append(transform_path(raw, (units, 0, 0, -units,
                                                  (x+glyph.offset_x)*units, -(y+glyph.offset_y)*units)))
                ids.append(raw.path_id)
        glyphs.append(GlyphGeometry(glyph_id=glyph.glyph_id, glyph_name=glyph.glyph_name,
                                   cluster=glyph.cluster, advance_x=glyph.advance_x*units,
                                   advance_y=glyph.advance_y*units, offset_x=glyph.offset_x*units,
                                   offset_y=glyph.offset_y*units, path_ids=ids))
        x += glyph.advance_x
        y += glyph.advance_y
    if not paths:
        raise ValueError("Selected font cannot render this name. Choose a font supporting these characters.")
    gaps = _bbox_gaps(glyphs, paths)
    shifts = _cumulative(_pair_shifts(gaps, request.overlap_custom_mm or OVERLAP_MM.get(request.overlap_mode, 1),
                                     {item.pair_index: item for item in request.gap_configs}), n)
    paths = _shift_paths(paths, [glyph.path_ids for glyph in glyphs], shifts)
    detected = detect_floating_components(glyphs, paths, labels)
    floats = {path.path_id: _floating_indices(path) for path in paths}
    if request.dots.auto_join:
        paths = join_floating_components(paths, glyphs, request.dots.overlap_pct, labels)
    timings["outlines_layout"] = (perf_counter()-start)*1000
    start = perf_counter()
    bounds = _bounds([cmd for path in paths for cmd in path.commands])
    expected_scale = request.size.target_mm / max(bounds[2]-bounds[0], bounds[3]-bounds[1], 1)
    tolerance = (.05 if request.quality == "preview" else .02) / max(1, 2*expected_scale)
    pieces = {}
    for path in paths:
        parts = _split_subpaths(path.commands)
        body_commands = [cmd for i, part in enumerate(parts) if i not in floats[path.path_id] for cmd in part]
        body = path_to_shapely(path.model_copy(update={"commands": body_commands}), tolerance_mm=tolerance)
        dots = {i: path_to_shapely(path.model_copy(update={"commands": parts[i]}), tolerance_mm=tolerance)
                for i in floats[path.path_id]}
        geometries = [geometry for geometry in [body, *dots.values()] if geometry is not None and not geometry.is_empty]
        if not geometries:
            continue
        # Floating parts are unioned after join, rather than being mistaken for
        # counters when their centroids move into the main glyph body.
        pieces[path.path_id] = (unary_union(geometries), body, dots)
    if not pieces:
        raise ValueError("No closed outlines could be generated for this name.")
    geometry = unary_union([item[0] for item in pieces.values()])
    timings["flatten_union"] = (perf_counter()-start)*1000
    return PreparedText(paths, glyphs, labels, sorted(set(missing)),
                        {item["glyph_index"] for item in detected}, floats, pieces, geometry)


def text_at(prepared, request, scale, include_paths=False):
    """Reuse flattened reference geometry in every size iteration.

    Physical spacing, dot offsets and translations are applied AFTER scaling,
    so no previous-request scale or provisional conversion can cause mm drift.
    Non-default editing transforms individual cached geometries, never re-flattens.
    """
    modified = request.letter_spacing_mm or request.glyph_transforms or request.dots.manual_offsets
    if not modified and not include_paths:
        geometry = affinity.scale(prepared.geometry, scale, scale, origin=(0, 0))
        if request.stroke_buffer_mm:
            geometry = geometry.buffer(request.stroke_buffer_mm)
        return geometry, [], {}
    offsets = {item.glyph_index: item for item in request.dots.manual_offsets}
    transforms = {item.glyph_index: item for item in request.glyph_transforms}
    path_map = {path.path_id: path for path in prepared.paths}
    final_paths, glyph_geometries = [], {}
    for gi, glyph in enumerate(prepared.glyphs):
        group = []
        bounds = []
        for pid in glyph.path_ids:
            if pid not in prepared.pieces:
                continue
            path = path_map[pid]
            geometry, body, dots = prepared.pieces[pid]
            updated = transform_path(path, (scale, 0, 0, scale, 0, 0))
            offset = offsets.get(gi)
            if offset is not None and prepared.floats[pid]:
                # R1 F8: every floating mark of the glyph (both umlaut dots,
                # all tashkeel) moves together; the body stays put.
                for index in prepared.floats[pid]:
                    updated = _apply_to_subpath(updated, index, offset.x_offset_mm, offset.y_offset_mm)
                parts = [] if body is None else [affinity.scale(body, scale, scale, origin=(0, 0))]
                for dot in dots.values():
                    if dot is not None:
                        part = affinity.scale(dot, scale, scale, origin=(0, 0))
                        parts.append(affinity.translate(part, offset.x_offset_mm, offset.y_offset_mm))
                geometry = unary_union(parts)
            else:
                geometry = affinity.scale(geometry, scale, scale, origin=(0, 0))
            dx = gi * request.letter_spacing_mm
            if dx:
                geometry = affinity.translate(geometry, dx, 0)
                updated = transform_path(updated, (1, 0, 0, 1, dx, 0))
            bounds.append(_bounds(updated.commands))
            group.append((updated, geometry))
        if not group:
            continue
        cx = (min(b[0] for b in bounds)+max(b[2] for b in bounds))/2
        cy = (min(b[1] for b in bounds)+max(b[3] for b in bounds))/2
        transform = transforms.get(gi)
        geometries = []
        for path, geometry in group:
            if transform is not None:
                angle = math.radians(transform.rotation_deg)
                a, b = transform.scale*math.cos(angle), -transform.scale*math.sin(angle)
                d, e = -b, a
                matrix = (a, b, d, e, cx-a*cx-b*cy+transform.dx_mm, cy-d*cx-e*cy+transform.dy_mm)
                geometry = affinity.affine_transform(geometry, matrix)
                path = transform_path(path, matrix)
            geometries.append(geometry)
            if include_paths:
                final_paths.append(path)
        glyph_geometries[gi] = unary_union(geometries)
    geometry = unary_union(list(glyph_geometries.values()))
    if request.stroke_buffer_mm:
        geometry = geometry.buffer(request.stroke_buffer_mm)
    return geometry, final_paths, glyph_geometries


def ring_neck(outer, backing, radius):
    if backing.covers(outer):
        return 2*radius
    arcs = outer.boundary.intersection(backing)
    if arcs.geom_type == "MultiLineString":
        arcs = linemerge(arcs)
    lines = [arcs] if arcs.geom_type == "LineString" else list(getattr(arcs, "geoms", []))
    return max((math.dist(line.coords[0], line.coords[-1]) for line in lines
                if line.geom_type == "LineString" and len(line.coords) >= 2), default=0)


def attach_ring(backing, text, cfg):
    if not cfg.enabled:
        return backing, None
    r, hole_r = cfg.outer_diameter_mm/2, cfg.hole_diameter_mm/2
    x0, y0, x1, y1 = backing.bounds
    positions = {"top-left": (x0+r, y0+5-r), "top-center": ((x0+x1)/2, y0+5-r),
                 "top-right": (x1-r, y0+5-r), "custom": (x0+r, y0+5-r),
                 "left-middle": (x0+5-r, (y0+y1)/2), "right-middle": (x1-5+r, (y0+y1)/2)}
    x, y = positions[cfg.position]
    original = (x+cfg.x_offset_mm, y+cfg.y_offset_mm)
    center = original

    def evaluate(point):
        outer = Point(point).buffer(r, quad_segs=32)
        return outer, ring_neck(outer, backing, r)

    outer, neck = evaluate(center)
    if cfg.auto_snap and (outer.intersection(backing).area < 1e-8 or neck < cfg.min_neck_width_mm):
        boundary, _ = nearest_points(backing.boundary, Point(center))
        length = math.dist(center, (boundary.x, boundary.y))
        if length > 1e-9:
            vx, vy = (center[0]-boundary.x)/length, (center[1]-boundary.y)/length
            if not backing.covers(Point(center)):
                vx, vy = -vx, -vy
        else:
            inside = backing.representative_point()
            length = max(math.dist((boundary.x, boundary.y), (inside.x, inside.y)), 1e-9)
            vx, vy = (inside.x-boundary.x)/length, (inside.y-boundary.y)/length
        required_overlap = r-math.sqrt(max(0, r*r-(min(cfg.min_neck_width_mm, 2*r)/2)**2))
        distance = r-max(5, required_overlap+.05)
        best = (neck, center, outer)
        for step in range(18):
            point = (boundary.x+vx*(-distance+step*.5), boundary.y+vy*(-distance+step*.5))
            candidate, width = evaluate(point)
            if width > best[0]:
                best = (width, point, candidate)
            if width >= cfg.min_neck_width_mm:
                best = (width, point, candidate)
                break
        neck, center, outer = best
    hole = Point(center).buffer(hole_r, quad_segs=32)
    touching = outer.intersection(backing).area > 1e-8
    finished = unary_union([backing, outer]).difference(hole)
    if not finished.is_valid:
        finished = finished.buffer(0)
    metadata = KeychainRingMetadata(center_x_mm=center[0], center_y_mm=center[1],
                                   outer_diameter_mm=cfg.outer_diameter_mm, hole_diameter_mm=cfg.hole_diameter_mm,
                                   wall_thickness_mm=r-hole_r, neck_width_mm=neck,
                                   snapped=math.dist(center, original) > .05, touching=touching,
                                   hole_clearance_mm=hole.distance(text),
                                   requested_center_x_mm=original[0], requested_center_y_mm=original[1])
    return finished, metadata


def solve_size(prepared, request):
    axis = 0 if request.size.mode == "width" else 1
    target = request.size.target_mm

    def evaluate(scale):
        text, _, _ = text_at(prepared, request, scale)
        backing = make_backing(text, request)
        body, ring = attach_ring(backing, text, request.ring)
        bounds = body.bounds
        return bounds[axis+2]-bounds[axis], (scale, text, backing, body, ring)

    low = .0001
    minimum, minimum_result = evaluate(low)
    reference = prepared.geometry.bounds
    span = max(reference[axis+2]-reference[axis], .01)
    if minimum > target+.05 and (request.glyph_transforms or request.dots.manual_offsets or request.letter_spacing_mm):
        # Opposing physical translations can make F(s) decrease before it
        # increases. Locate the minimum first rather than falsely declaring
        # the tiny-text extent to be an unattainable-size bound.
        extent = sum(abs(item.dx_mm)+abs(item.dy_mm) for item in request.glyph_transforms)
        extent += len(prepared.glyphs)*abs(request.letter_spacing_mm)
        extent += sum(abs(item.x_offset_mm)+abs(item.y_offset_mm) for item in request.dots.manual_offsets)
        left, right = low, max(1, 2*(target+extent)/span)
        ratio = (math.sqrt(5)-1)/2
        a, b = right-ratio*(right-left), left+ratio*(right-left)
        fa, ra = evaluate(a)
        fb, rb = evaluate(b)
        for _ in range(18):
            for value, result in ((fa, ra), (fb, rb)):
                if value < minimum:
                    minimum, minimum_result = value, result
            if fa < fb:
                right, b, fb, rb = b, a, fa, ra
                a = right-ratio*(right-left)
                fa, ra = evaluate(a)
            else:
                left, a, fa, ra = a, b, fb, rb
                b = left+ratio*(right-left)
                fb, rb = evaluate(b)
        low = minimum_result[0]
    if minimum > target+.05:
        return minimum_result, False, minimum
    scale = max(low*2, (target-2*request.backing.offset_mm-2)/span)
    previous_scale, previous_value = low, minimum
    high = None
    best = (abs(minimum-target), minimum_result)
    for _ in range(6):
        value, result = evaluate(scale)
        error = value-target
        if abs(error) < best[0]:
            best = (abs(error), result)
        if abs(error) <= .05:
            return result, True, minimum
        if error < 0:
            low = scale
        else:
            high = scale
        delta = value-previous_value
        next_scale = scale-error*(scale-previous_scale)/delta if abs(delta) > 1e-10 else scale*2
        if next_scale <= low or (high is not None and next_scale >= high):
            next_scale = (low+high)/2 if high is not None else max(scale*2, low*2)
        previous_scale, previous_value = scale, value
        scale = next_scale
    return best[1], best[0] <= .05, minimum


@dataclass
class KeychainService:
    project_root: Path
    font_catalog: FontCatalog

    def generate(self, request: KeychainRequest) -> KeychainResponse:
        start = perf_counter()
        timings = {}
        prepared = prepare_text(request, self.font_catalog, timings)
        stage = perf_counter()
        (scale, text, backing, body, ring), converged, minimum = solve_size(prepared, request)
        timings["size_ring"] = (perf_counter()-stage)*1000
        stage = perf_counter()
        checks = validate_keychain(request, body, text, ring, converged, minimum, prepared.missing)
        timings["validation"] = (perf_counter()-stage)*1000
        stage = perf_counter()
        _, text_paths, glyph_geometries = text_at(prepared, request, scale, include_paths=True)
        minx, miny, maxx, maxy = body.bounds
        width, height = maxx-minx, maxy-miny
        canvas_w, canvas_h = width+2*CANVAS_MARGIN_MM, height+2*CANVAS_MARGIN_MM
        dx, dy = CANVAS_MARGIN_MM-minx, CANVAS_MARGIN_MM-miny
        translation = (1, 0, 0, 1, dx, dy)
        hit_paths = [transform_path(path, translation) for path in text_paths]
        if request.style == "layered" or request.stroke_buffer_mm:
            # D1 (R1): a laser cuts every contour, so the Layered cut layer is the
            # welded (unioned) silhouette, never overlapping per-glyph outlines.
            # Engraved fills keep the original Q/C curves; hit paths stay per glyph.
            text_paths = _compound_paths_from_shapely(text, "KC-TEXT")
        if request.style == "layered":
            checks.append(cut_overlap_check(text_paths, text.bounds))
        text_paths = [transform_path(path, translation) for path in text_paths]
        backing_paths = [transform_path(path, translation) for path in _compound_paths_from_shapely(body, "KC-BACKING")]
        glyph_indices = {pid: gi for gi, glyph in enumerate(prepared.glyphs) for pid in glyph.path_ids}
        infos = []
        for gi in range(len(prepared.glyphs)):
            bounds = glyph_geometries[gi].bounds if gi in glyph_geometries else None
            box = (bounds[0]+dx, bounds[1]+dy, bounds[2]+dx, bounds[3]+dy) if bounds else (2, 2, 2, 2)
            infos.append(KeychainGlyphInfo(glyph_index=gi, cluster_text=prepared.labels[gi], bbox_mm=box,
                                          has_floating_component=gi in prepared.floating_glyphs))
        if ring is not None:
            ring = ring.model_copy(update={"center_x_mm": ring.center_x_mm+dx, "center_y_mm": ring.center_y_mm+dy,
                                           "requested_center_x_mm": ring.requested_center_x_mm+dx,
                                           "requested_center_y_mm": ring.requested_center_y_mm+dy})
        for check in checks:
            if check.highlight_bbox_mm is not None:
                x0, y0, x1, y1 = check.highlight_bbox_mm
                check.highlight_bbox_mm = (x0+dx, y0+dy, x1+dx, y1+dy)
        recipe = {**request.model_dump(), "app_version": APP_VERSION}
        preview = assemble_svg(backing_paths, text_paths, request, canvas_w, canvas_h,
                               glyph_indices=glyph_indices, hit_paths=hit_paths)
        files = []
        png = None
        if request.quality == "export":
            width_token = f"{width:.1f}".rstrip("0").rstrip(".")
            stem = f"{_safe_filename(request.text)}-keychain-{width_token}mm"
            if request.style == "layered" and request.layered_export == "separate":
                for layer in ("backing", "text"):
                    files.append(KeychainFile(filename=f"{stem}-{layer}.svg", svg=assemble_svg(
                        backing_paths, text_paths, request, canvas_w, canvas_h, recipe=recipe, layer=layer)))
            else:
                files.append(KeychainFile(filename=f"{stem}.svg", svg=assemble_svg(
                    backing_paths, text_paths, request, canvas_w, canvas_h, recipe=recipe)))
        timings["svg"] = (perf_counter()-stage)*1000
        if request.quality == "export":
            stage = perf_counter()
            # Rasterise the unioned text silhouette so joined dots cannot be
            # mistaken for counters by the legacy Pillow subpath renderer.
            png_text = [transform_path(path, translation) for path in _compound_paths_from_shapely(text, "KC-PNGTEXT")]
            groups = [(backing_paths, request.colors.backing), (png_text, request.colors.text)]
            png = base64.b64encode(_render_png(preview, groups, canvas_w, canvas_h)).decode("ascii")
            timings["png"] = (perf_counter()-stage)*1000
        timings["total"] = (perf_counter()-start)*1000
        logger.debug("Keychain request %s timings_ms=%s", request.request_id, timings)
        return KeychainResponse(request_id=request.request_id, preview_svg=preview, files=files, png_base64=png,
                                width_mm=round(width, 3), height_mm=round(height, 3),
                                canvas_width_mm=round(canvas_w, 3), canvas_height_mm=round(canvas_h, 3),
                                scale_applied=scale, size_solve_converged=converged,
                                glyphs=infos, ring=ring, checks=checks, recipe=recipe, timings_ms=timings)
