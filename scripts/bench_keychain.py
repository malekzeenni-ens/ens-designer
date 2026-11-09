"""Benchmark the Cake Topper outline + ring workflow (K0 baseline / K1 cache).

Run with .venv313/Scripts/python.exe scripts/bench_keychain.py --help.
Stage timings are inclusive, process-warm service timings (not HTTP latency).
"""
from __future__ import annotations

import argparse
from collections import defaultdict
from contextlib import ExitStack
from datetime import date, datetime, timezone
from functools import wraps
import hashlib
import importlib.metadata
import json
from pathlib import Path
import platform
import statistics
import sys
from time import perf_counter
from unittest.mock import patch
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))

from app import cake_topper_engine as engine
from app.font_loader import FontCatalog
from app.models import CakeTopperRequest

FIXTURES = ROOT / "tests/fixtures/keychain_baseline"
GOLDEN_DATE = "2026-11-09"
NAMES = ["Sarah", "Ali", "Jo", "Maximilian", "Mr Bear", "Zoë", "fifi"]
FONT_FILES = {
    "script": "Anton,League_Spartan,Lora,Quicksand,Satisfy/Satisfy/Satisfy-Regular.ttf",
    "display": "Anton,League_Spartan,Lora,Quicksand,Satisfy/Anton/Anton-Regular.ttf",
    "serif": "Anton,League_Spartan,Lora,Quicksand,Satisfy/Lora/static/Lora-Regular.ttf",
    "arabic": "Cairo/static/Cairo-Regular.ttf",
}
STAGES = {
    "shape": "shape_text", "outlines": "extract_outlines",
    "canonical_geometry": "build_geometry", "backing": "_generate_outline_geometry",
    "ring": "_apply_ring_to_base", "svg": "_assemble_svg", "png": "_render_png",
    "pillow_fallback": "render_paths_png",
}


def digest(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def pinned_fonts(catalog: FontCatalog) -> dict:
    # Resolve only exact bundled files, never a similarly named system face.
    catalog.list_fonts()
    result = {}
    for role, relative in FONT_FILES.items():
        path = ROOT / "fonts" / relative
        record = catalog._read_font("project", path)
        if record is None or catalog.get_font_path(record.info.id).read_bytes() != path.read_bytes():
            raise ValueError(f"Pinned project font is unavailable: {relative}")
        result[role] = {"id": record.info.id, "path": f"fonts/{relative}",
                        "sha256": digest(path.read_bytes())}
    return result


def golden_recipes(font_id: str) -> dict:
    base = {"text": "Happy Birthday Sarah", "default_font_id": font_id}
    return {
        "defaults": base,
        "outline-ring": {**base, "outline_enabled": True, "ring_config": {"enabled": True}},
        "two-stakes": {**base, "stake_config": {"count": 2}},
    }


def generate_golden(service, request):
    # _assemble_svg imports date locally; freeze only this standalone harness.
    class BaselineDate(date):
        @classmethod
        def today(cls):
            return cls.fromisoformat(GOLDEN_DATE)

    with patch("datetime.date", BaselineDate):
        return service.generate(request)


def write_fixtures(service, fonts: dict) -> None:
    if FIXTURES.exists() and any(FIXTURES.iterdir()):
        raise ValueError("Baseline already exists; refusing to overwrite reference output.")
    entries = []
    for name, recipe in golden_recipes(fonts["display"]["id"]).items():
        request = CakeTopperRequest.model_validate(recipe)
        svg = generate_golden(service, request).svg.encode("utf-8")
        ET.fromstring(svg)
        entries.append({"file": f"{name}.svg", "request": request.model_dump(),
                        "sha256": digest(svg), "svg": svg})
    FIXTURES.mkdir(parents=True, exist_ok=True)
    for entry in entries:
        (FIXTURES / entry["file"]).write_bytes(entry.pop("svg"))
    (FIXTURES / "manifest.json").write_text(
        json.dumps({"generated_date": GOLDEN_DATE, "font": fonts["display"], "recipes": entries}, indent=2) + "\n", encoding="utf-8")


def check_fixtures(service) -> None:
    manifest = json.loads((FIXTURES / "manifest.json").read_text(encoding="utf-8"))
    font = manifest["font"]
    if digest((ROOT / font["path"]).read_bytes()) != font["sha256"]:
        raise ValueError("Golden font changed; baseline cannot be compared.")
    for entry in manifest["recipes"]:
        expected = (FIXTURES / entry["file"]).read_bytes()
        if digest(expected) != entry["sha256"]:
            raise ValueError(f"Reference fixture modified: {entry['file']}")
        actual = generate_golden(service, CakeTopperRequest.model_validate(entry["request"])).svg.encode("utf-8")
        if actual != expected:
            raise ValueError(f"Cake Topper output changed: {entry['file']}")
    print("Golden SVGs: 3/3 byte-identical", flush=True)


def timed_call(service, request) -> tuple:
    timings = defaultdict(float)

    def wrapper(fn, stage):
        @wraps(fn)
        def run(*args, **kwargs):
            start = perf_counter()
            try:
                return fn(*args, **kwargs)
            finally:
                timings[stage] += (perf_counter() - start) * 1000
        return run

    with ExitStack() as stack:
        for stage, attribute in STAGES.items():
            stack.enter_context(patch.object(engine, attribute, wrapper(getattr(engine, attribute), stage)))
        start = perf_counter()
        response = service.generate(request)
        timings["total"] = (perf_counter() - start) * 1000
    return dict(timings), response


def summary(values: list[float]) -> dict:
    # Nearest-rank p95: meaningful also for short runs; keep raw samples in JSON.
    import math
    return {"p50_ms": round(statistics.median(values), 3),
            "p95_ms": round(sorted(values)[math.ceil(len(values) * .95) - 1], 3)}


def benchmark_keychain(args, catalog, fonts):
    from fastapi.testclient import TestClient
    from app.font_cache import clear_font_cache
    from app.keychain_engine import KeychainService
    from app import keychain_png
    from app.main import create_app
    from app.models import KeychainRequest

    app = create_app(project_root=ROOT)
    service = KeychainService(ROOT, catalog)
    app.state.keychain_service = service
    corpus = [(role, name) for role in ("script", "display", "serif") for name in NAMES]
    corpus.append(("arabic", "سارة"))
    results = []
    with TestClient(app) as client:
        for role, name in corpus:
            request = KeychainRequest(text=name, font_id=fonts[role]["id"])
            clear_font_cache()  # guarantee a cold parsed-font/glyph cache per case

            def preview():
                start = perf_counter()
                response = client.post("/api/keychain/preview", json=request.model_dump())
                response.raise_for_status()
                result = response.json()
                timings = {**result["timings_ms"], "api_round_trip": (perf_counter()-start)*1000}
                return timings, result

            cold, _ = preview()
            samples = []
            for _ in range(args.iterations):
                timings, result = preview()
                samples.append(timings)
            stages = {stage: summary([sample[stage] for sample in samples]) for stage in samples[0]}
            with patch.object(keychain_png, "render_paths_png", wraps=keychain_png.render_paths_png) as fallback:
                start = perf_counter()
                exported = service.generate(request.model_copy(update={"quality": "export"}))
                export_ms = (perf_counter()-start)*1000
                renderer = "Pillow" if fallback.call_count else "CairoSVG"
            for file in exported.files:
                ET.fromstring(file.svg)
            results.append({"role": role, "text": name, "request": request.model_dump(),
                            "cold_ms": cold, "stages": stages, "samples_ms": samples,
                            "export_ms": round(export_ms, 3), "export_timings_ms": exported.timings_ms,
                            "png_renderer": renderer, "checks": result["checks"],
                            "width_mm": result["width_mm"], "height_mm": result["height_mm"],
                            "converged": result["size_solve_converged"]})
            print(f"{role:7} {ascii(name):16} preview p50/p95={stages['total']['p50_ms']:.1f}/{stages['total']['p95_ms']:.1f} "
                  f"API p95={stages['api_round_trip']['p95_ms']:.1f} cold={cold['api_round_trip']:.1f} export={export_ms:.1f}", flush=True)
    passed = all(case["stages"]["api_round_trip"]["p95_ms"] <= 150
                 and case["cold_ms"]["api_round_trip"] <= 800 and case["export_ms"] <= 1500
                 and case["converged"] for case in results)
    report = {
        "recorded_at_utc": datetime.now(timezone.utc).isoformat(), "mode": "keychain-k2",
        "python": sys.version, "platform": platform.platform(), "fonts": fonts,
        "dependencies": {package: importlib.metadata.version(package) for package in ("shapely", "uharfbuzz", "fonttools", "cairosvg", "pillow")},
        "iterations_per_case": args.iterations,
        "method": "Cold parsed-font and raw glyph caches before each case, then warm API previews. "
                  "API round trip includes FastAPI routing, response validation, JSON and TestClient overhead, "
                  "without browser or network latency. One service export per case, including actual PNG renderer. "
                  "Preview never renders PNG. Fixed 60 mm finished width; Mr Bear stays on one line.",
        "budget_gate_passed": passed, "results": results,
    }
    if args.output:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(json.dumps(report, indent=2, ensure_ascii=False)+"\n", encoding="utf-8")
    print(f"Keychain budget gate: {'PASS' if passed else 'FAIL'}", flush=True)
    if args.assert_budgets and not passed:
        raise SystemExit(1)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--iterations", type=int, default=20)
    parser.add_argument("--output", type=Path, help="Write timings and environment metadata as JSON")
    parser.add_argument("--compare-uncached", action="store_true",
                        help="Alternate cached and uncached font paths in the same process (K1+)")
    parser.add_argument("--keychain", action="store_true", help="Measure K2 PNG-free preview API and full exports")
    parser.add_argument("--assert-budgets", action="store_true", help="Fail if K2 preview/cold/export budgets or size convergence fail")
    action = parser.add_mutually_exclusive_group()
    action.add_argument("--write-fixtures", action="store_true")
    action.add_argument("--check-fixtures", action="store_true")
    parser.add_argument("--fixtures-only", action="store_true")
    args = parser.parse_args()
    if args.iterations < 1:
        parser.error("--iterations must be positive")
    if args.fixtures_only and not (args.write_fixtures or args.check_fixtures):
        parser.error("--fixtures-only requires a fixture action")
    if args.assert_budgets and not args.keychain:
        parser.error("--assert-budgets requires --keychain")
    if args.keychain and args.compare_uncached:
        parser.error("--keychain and --compare-uncached are separate benchmark modes")
    if args.compare_uncached and not hasattr(engine, "get_loaded_font"):
        parser.error("--compare-uncached requires the K1 cached Cake Topper engine")
    catalog = FontCatalog(ROOT)
    service = engine.CakeTopperService(ROOT, catalog)
    fonts = pinned_fonts(catalog)
    if args.write_fixtures:
        write_fixtures(service, fonts)
    if args.check_fixtures or args.write_fixtures:
        check_fixtures(service)
    if args.fixtures_only:
        return
    if args.keychain:
        benchmark_keychain(args, catalog, fonts)
        return
    # Do not pretend unsupported Arabic in Latin faces is a successful sample.
    corpus = [(role, name) for role in ("script", "display", "serif") for name in NAMES]
    corpus.append(("arabic", "سارة"))
    results = []
    for role, name in corpus:
        request = CakeTopperRequest(text=name, default_font_id=fonts[role]["id"],
                                   outline_enabled=True, ring_config={"enabled": True})
        first, first_response = timed_call(service, request)
        if any("missing" in warning.lower() for warning in first_response.warnings):
            raise ValueError(f"Corpus font cannot render {name!r}: {first_response.warnings}")
        samples = []
        uncached_samples = []
        if args.compare_uncached:
            with patch.object(engine, "get_loaded_font", return_value=None):
                timed_call(service, request)  # separately warm the original font path
        for iteration in range(args.iterations):
            order = ["cached", "uncached"] if args.compare_uncached else ["cached"]
            if iteration % 2:
                order.reverse()
            for mode in order:
                if mode == "cached":
                    timings, response = timed_call(service, request)
                    samples.append(timings)
                else:
                    with patch.object(engine, "get_loaded_font", return_value=None):
                        timings, _ = timed_call(service, request)
                        uncached_samples.append(timings)
        stages = {stage: summary([sample.get(stage, 0) for sample in samples])
                  for stage in [*STAGES, "total"]}
        results.append({"role": role, "text": name, "request": request.model_dump(),
                        "png_renderer": "Pillow" if samples[-1].get("pillow_fallback", 0) else "CairoSVG",
                        "first_observed_ms": first, "stages": stages,
                        "samples_ms": samples, "warnings": response.warnings})
        if args.compare_uncached:
            uncached_stages = {stage: summary([sample.get(stage, 0) for sample in uncached_samples])
                               for stage in [*STAGES, "total"]}
            results[-1]["comparison"] = {
                "uncached_stages": uncached_stages, "uncached_samples_ms": uncached_samples,
                "median_total_speedup": round(uncached_stages["total"]["p50_ms"] / stages["total"]["p50_ms"], 4),
            }
        print(f"{role:7} {ascii(name):16} " + " ".join(
            f"{stage}={stats['p50_ms']:.1f}/{stats['p95_ms']:.1f}"
            for stage, stats in stages.items()), flush=True)
    report = {
        "recorded_at_utc": datetime.now(timezone.utc).isoformat(),
        "python": sys.version, "platform": platform.platform(),
        "dependencies": {package: importlib.metadata.version(package)
                         for package in ("shapely", "uharfbuzz", "fonttools", "cairosvg", "pillow")},
        "iterations_per_case": args.iterations, "fonts": fonts,
        "compare_uncached": args.compare_uncached,
        "method": "One separately recorded warm-up per case, then timed service calls including PNG. "
                  "Stage times inclusive, not additive. First-observed call is not a cold-font guarantee. "
                  "No HTTP or browser latency. Mr Bear uses current word-per-line Cake Topper behaviour. "
                  "When comparison is enabled, alternate cached/uncached order each iteration; "
                  "uncached calls use the original font paths via loaded=None, with the same current geometry and PNG renderer.",
        "results": results,
    }
    if args.output:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(json.dumps(report, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
