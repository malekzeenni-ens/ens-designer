from __future__ import annotations

from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .api.routes.fonts import router as fonts_router
from .api.routes.generation import router as generation_router
from .api.routes.materials import router as materials_router
from .font_loader import FontCatalog
from .generation_service import GenerationService

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
    app.include_router(fonts_router)
    app.include_router(generation_router)
    app.include_router(materials_router)
    return app


app = create_app()
