import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.database import engine, Base
from app.routers import api

# Create tables in SQLite on load (simple, migration-free database lifecycle for local MVP)
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="ForecastIQ AI API",
    description="Paid Ads Forecasting and Optimization Decision Engine REST API",
    version="1.0.0"
)

# CORS configurations
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_URL, "http://localhost:3000", "http://localhost:3001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include main router
app.include_router(api.router, prefix="/api")

from fastapi.responses import HTMLResponse
import os

@app.get("/", response_class=HTMLResponse)
def read_root():
    static_file_path = os.path.join(os.path.dirname(__file__), "static", "index.html")
    if os.path.exists(static_file_path):
        with open(static_file_path, "r", encoding="utf-8") as f:
            return HTMLResponse(content=f.read(), status_code=200)
    return HTMLResponse(content="<h1>Welcome to ForecastIQ AI API</h1><p>Static UI index.html not found.</p>", status_code=200)

if __name__ == "__main__":
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
