"""
CascadeGuard: Application Server Entry Point
FastAPI web application & static server with auto-initialization and CLI runner.
"""
import os
import sys
import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from database import get_connection, DB_PATH
from engine.seeder import DatabaseSeeder
from api.routes import router as api_router

app = FastAPI(
    title="CascadeGuard: Cascade Deletion & Database Integrity Engine",
    description="Enterprise-grade cascading deletion engine preserving logical & physical database integrity",
    version="1.0.0"
)

# Enable CORS for local dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount API
app.include_router(api_router, prefix="/api")

# Static frontend mount
FRONTEND_DIST = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "frontend", "dist")

@app.on_event("startup")
def startup_event():
    # Check if database exists, if not initialize and seed
    seeder = DatabaseSeeder()
    with get_connection() as conn:
        seeder.init_schema(conn)
        cur = conn.cursor()
        cur.execute("SELECT COUNT(*) FROM organizations")
        if cur.fetchone()[0] == 0:
            print("[CascadeGuard] Initializing and seeding fresh enterprise dataset...")
            seeder.reset_and_seed(conn, "ENTERPRISE")
            print("[CascadeGuard] Seeding completed.")

# Serve frontend if built
if os.path.exists(FRONTEND_DIST):
    app.mount("/assets", StaticFiles(directory=os.path.join(FRONTEND_DIST, "assets")), name="assets")

    @app.get("/{full_path:path}")
    def serve_spa(full_path: str):
        file_path = os.path.join(FRONTEND_DIST, full_path)
        no_cache_headers = {
            "Cache-Control": "no-cache, no-store, must-revalidate",
            "Pragma": "no-cache",
            "Expires": "0"
        }
        if os.path.isfile(file_path):
            return FileResponse(file_path, headers=no_cache_headers if file_path.endswith('.html') else None)
        return FileResponse(os.path.join(FRONTEND_DIST, "index.html"), headers=no_cache_headers)

if __name__ == "__main__":
    port = 8000
    print(f"===============================================================")
    print(f"  CascadeGuard Engine Server starting on http://localhost:{port}")
    print(f"===============================================================")
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
