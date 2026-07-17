"""FastAPI application factory and production SPA host."""
from __future__ import annotations

from contextlib import asynccontextmanager
import os
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from starlette.exceptions import HTTPException as StarletteHTTPException
from starlette.responses import Response

from . import ROOT
from .routers import jobs, models, runs, search, sources, uploads


class SPAStaticFiles(StaticFiles):
    async def get_response(self, path: str, scope) -> Response:
        try:
            response = await super().get_response(path, scope)
        except StarletteHTTPException as exc:
            if exc.status_code == 404:
                return await super().get_response("index.html", scope)
            raise
        if response.status_code == 404:
            return await super().get_response("index.html", scope)
        return response


@asynccontextmanager
async def lifespan(app: FastAPI):
    preload = os.getenv("PRELOAD_EMBEDDER", os.getenv("KDX_PRELOAD_EMBEDDER", "0"))
    if preload == "1":
        from kurdish_explorer import config, embed
        embed.get_embedder(config.default_model_key())
    yield


def create_app(*, mount_spa: bool = True) -> FastAPI:
    app = FastAPI(title="Kurdish Data Explorer API", version="1.0.0", lifespan=lifespan)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.get("/api/health", tags=["health"])
    def health() -> dict:
        return {"status": "ok"}

    for router in (sources.router, models.router, runs.router, search.router, uploads.router, jobs.router):
        app.include_router(router, prefix="/api")

    dist = ROOT / "web" / "dist"
    if mount_spa and dist.is_dir():
        app.mount("/", SPAStaticFiles(directory=dist, html=True), name="web")
    return app


app = create_app()
