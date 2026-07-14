from __future__ import annotations

from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

from .api.routes.cake_topper import router as cake_topper_router
from .api.routes.fonts import router as fonts_router
from .api.routes.generation import router as generation_router
from .api.routes.history import router as history_router
from .api.routes.materials import router as materials_router
from .api.routes.overlap import router as overlap_router
from .api.routes.presets import router as presets_router
from .cake_topper_engine import CakeTopperService
from .font_loader import FontCatalog
from .generation_service import GenerationService
from .history_store import HistoryStore
from .overlap_engine import OverlapService

PROJECT_ROOT = Path(__file__).resolve().parents[2]


def create_app(
    *,
    project_root: Path = PROJECT_ROOT,
    frontend_dist: Path | None = None,
) -> FastAPI:
    app = FastAPI(title="Etch N Shine Designer", version="0.1.0")
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[
            "http://localhost:5174",
            "http://127.0.0.1:5174",
        ],
        allow_credentials=False,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    font_catalog = FontCatalog(project_root)
    app.state.font_catalog = font_catalog
    app.state.generation_service = GenerationService(
        project_root=project_root,
        font_catalog=font_catalog,
    )
    app.state.overlap_service = OverlapService(
        project_root=project_root,
        font_catalog=font_catalog,
    )
    app.state.cake_topper_service = CakeTopperService(
        project_root=project_root,
        font_catalog=font_catalog,
    )
    app.state.history_store = HistoryStore(project_root)

    @app.get("/healthz", include_in_schema=False)
    def healthcheck() -> dict[str, str]:
        return {"status": "ok", "app": "ens-designer"}

    app.include_router(fonts_router)
    app.include_router(generation_router)
    app.include_router(materials_router)
    app.include_router(overlap_router)
    app.include_router(presets_router)
    app.include_router(cake_topper_router)
    app.include_router(history_router)

    # Register this catch-all mount after every API route. In production it
    # serves the pre-built React application on the same origin as the API,
    # removing Vite and Node from the normal runtime path.
    frontend_root = frontend_dist or project_root / "frontend" / "dist"
    frontend_index = frontend_root / "index.html"
    app.state.frontend_dist = frontend_root
    app.state.frontend_available = frontend_index.is_file()
    if app.state.frontend_available:
        app.mount(
            "/",
            StaticFiles(directory=str(frontend_root), html=True),
            name="frontend",
        )
    else:
        @app.get("/", include_in_schema=False)
        def frontend_not_built() -> JSONResponse:
            return JSONResponse(
                status_code=503,
                content={
                    "detail": "The EnS Designer frontend has not been built.",
                    "expected_path": str(frontend_index),
                    "build_command": "cd frontend; npm.cmd run build",
                },
            )

    return app


app = create_app()
