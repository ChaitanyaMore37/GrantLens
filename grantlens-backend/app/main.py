"""FastAPI application composition. Start with uvicorn app.main:app."""
import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app import db
from app.api.errors import register_errors
from app.api.routes import system, audits, beneficiaries, clusters, graphs, investigations, reports

@asynccontextmanager
async def lifespan(app):
    db.initialize()
    yield


app=FastAPI(title='GrantLens',version='2.0.0',lifespan=lifespan,
            description='Local fictional scholarship audit prototype. Scores are review priorities, not fraud probabilities.')
app.add_middleware(CORSMiddleware,allow_origins=os.getenv('GRANTLENS_CORS','http://localhost:5173,http://127.0.0.1:5173').split(','),allow_methods=['GET','POST','PATCH'],allow_headers=['*'])


register_errors(app)

app.include_router(system.router)
app.include_router(audits.router)
app.include_router(beneficiaries.router)
app.include_router(clusters.router)
app.include_router(graphs.router)
app.include_router(investigations.router)
app.include_router(reports.router)
