import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse

from backend.database.session import engine, Base, SessionLocal
from backend.services.seed_generator import seed_database
from backend.routers import (
    cases, evidence, reviews, failures, ingestion,
    experiment, feedback, audit, dashboard, settings, auth
)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Create tables and auto-seed database
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        seed_database(db, force=False)
    finally:
        db.close()
    yield
    # Shutdown logic if any

app = FastAPI(
    title="CardioEvidence API",
    description="Multidisciplinary Clinical Evidence Timeline — Synthetic Demonstration Engine",
    version="1.0.0",
    lifespan=lifespan
)

# Enable CORS for local React development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(dashboard.router)
app.include_router(cases.router)
app.include_router(evidence.router)
app.include_router(reviews.router)
app.include_router(failures.router)
app.include_router(ingestion.router)
app.include_router(experiment.router)
app.include_router(feedback.router)
app.include_router(audit.router)
app.include_router(settings.router)
app.include_router(auth.router)

@app.get("/api-info")
def api_info():
    return {
        "name": "CardioEvidence API",
        "version": "1.0.0",
        "status": "Operational",
        "synthetic_notice": "SYNTHETIC DATA — DEMONSTRATION ONLY. Not for clinical decision-making.",
        "documentation": "/docs"
    }

@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "synthetic_data": True,
        "engine": "CardioEvidence Core v1.0"
    }

# Mount static files if frontend dist exists
frontend_dist = os.path.join(os.path.dirname(__file__), "..", "frontend", "dist")
index_html = os.path.join(frontend_dist, "index.html")

if os.path.exists(frontend_dist):
    app.mount("/assets", StaticFiles(directory=os.path.join(frontend_dist, "assets")), name="assets")

    @app.get("/")
    def serve_spa():
        if os.path.exists(index_html):
            return FileResponse(index_html)
        return JSONResponse({"message": "Frontend build in progress"})

    @app.get("/app")
    def serve_spa_app():
        if os.path.exists(index_html):
            return FileResponse(index_html)
        return JSONResponse({"message": "Frontend build in progress"})

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host="127.0.0.1", port=8000, reload=True)
