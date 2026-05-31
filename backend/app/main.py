from __future__ import annotations

from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .api.routes.cake_topper import router as cake_topper_router
from .api.routes.fonts import router as fonts_router
from .api.routes.generation import router as generation_router
from .api.routes.materials import router as materials_router
from .api.routes.overlap import router as overlap_router
from .api.routes.presets import router as presets_router
from .cake_topper_engine import CakeTopperService
from .font_loader import FontCatalog
from .generation_service import GenerationService
from .overlap_engine import OverlapService

PROJECT_ROOT = Path(__file__).resolve().parents[2]


def create_app() -> FastAPI:
    app = FastAPI(title="Etch N Shine Designer", version="0.1.0")
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
        allow_credentials=False,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    font_catalog = FontCatalog(PROJECT_ROOT)
    app.state.font_catalog = font_catalog
    app.state.generation_service = GenerationService(project_root=PROJECT_ROOT, font_catalog=font_catalog)
    app.state.overlap_service = OverlapService(project_root=PROJECT_ROOT, font_catalog=font_catalog)
    app.state.cake_topper_service = CakeTopperService(project_root=PROJECT_ROOT, font_catalog=font_catalog)
    app.include_router(fonts_router)
    app.include_router(generation_router)
    app.include_router(materials_router)
    app.include_router(overlap_router)
    app.include_router(presets_router)
    app.include_router(cake_topper_router)
    return app


app = create_app()
