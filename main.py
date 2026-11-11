"""Vercel FastAPI entrypoint.

Use one root-level ASGI application so the original /api/* paths are preserved
and /public is served as static assets. No function-level route rewrite is needed.
"""
from api.index import app

__all__ = ['app']
