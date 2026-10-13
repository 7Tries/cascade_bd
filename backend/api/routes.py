"""
CascadeGuard: FastAPI REST API Routes
Exposes endpoints for schema exploration, dry-run simulation, ACID cascade execution,
point-in-time restoration, physical/logical integrity doctor, and seed management.
"""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
import sqlite3

from database import get_connection, get_db_info
from schema_defs import SCHEMA_TABLES
from engine.graph_planner import GraphPlanner
from engine.impact_analyzer import ImpactAnalyzer
from engine.cascade_executor import CascadeExecutor
from engine.restore_engine import RestoreEngine
from engine.integrity_doctor import IntegrityDoctor
from engine.seeder import DatabaseSeeder

router = APIRouter()

# Instantiate singletons
planner = GraphPlanner()
analyzer = ImpactAnalyzer(planner)
executor = CascadeExecutor(planner, analyzer)
restore_engine = RestoreEngine(planner)
doctor = IntegrityDoctor()
seeder = DatabaseSeeder()

# Request Models
class DryRunRequest(BaseModel):
    table: str
    id: int
    policy: str = "HARD_CASCADE"

class ExecuteCascadeRequest(BaseModel):
    table: str
    id: int
    policy: str = "HARD_CASCADE"
    reason: Optional[str] = "User cascade deletion via CascadeGuard UI"
    overrideViolations: bool = False

# Dependencies
def get_db():
    conn = get_connection()
    try:
        yield conn
    finally:
        conn.close()

# 0. System & Engine Info
@router.get("/system/db-info")
def get_database_info():
    """Returns live PostgreSQL / SQLite status and DBeaver connection parameters."""
    return get_db_info()

# 1. Schema Endpoints
@router.get("/schema/graph")
def get_schema_graph():
    return planner.get_schema_graph()

@router.get("/schema/tables")
def get_schema_tables(conn: sqlite3.Connection = Depends(get_db)):
    cur = conn.cursor()
    tables_info = []
    for name, meta in SCHEMA_TABLES.items():
        cur.execute(f"SELECT COUNT(*) FROM {name} WHERE is_deleted = 0")
        active_count = cur.fetchone()[0]
        cur.execute(f"SELECT COUNT(*) FROM {name} WHERE is_deleted = 1")
        soft_deleted_count = cur.fetchone()[0]
        tables_info.append({
            "name": name,
            "category": meta.category,
            "pk": meta.pk,
            "displayCol": meta.display_col,
            "activeCount": active_count,
            "softDeletedCount": soft_deleted_count,
            "totalCount": active_count + soft_deleted_count,
            "description": meta.description
        })
    return {"tables": tables_info}

# 2. Data Endpoints
@router.get("/data/table/{table_name}")
def get_table_data(table_name: str, show_deleted: bool = False, conn: sqlite3.Connection = Depends(get_db)):
    if table_name not in SCHEMA_TABLES:
        raise HTTPException(status_code=404, detail=f"Table {table_name} not found")

    meta = SCHEMA_TABLES[table_name]
    cur = conn.cursor()
    sql = f"SELECT * FROM {table_name}"
    if not show_deleted and meta.has_soft_delete:
        sql += " WHERE is_deleted = 0"
    sql += f" ORDER BY {meta.pk} ASC LIMIT 200"

    cur.execute(sql)
    rows = [dict(r) for r in cur.fetchall()]
    return {
        "table": table_name,
        "primaryKey": meta.pk,
        "displayCol": meta.display_col,
        "count": len(rows),
        "rows": rows
    }

# 3. Cascade Dry-Run Simulator
@router.post("/cascade/dry-run")
def simulate_cascade(req: DryRunRequest, conn: sqlite3.Connection = Depends(get_db)):
    try:
        analysis = analyzer.analyze(conn, req.table, req.id, req.policy)
        return analysis
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# 4. ACID Cascade Execution
@router.post("/cascade/execute")
def execute_cascade(req: ExecuteCascadeRequest, conn: sqlite3.Connection = Depends(get_db)):
    try:
        result = executor.execute_cascade(
            conn=conn,
            root_table=req.table,
            root_id=req.id,
            policy=req.policy,
            reason=req.reason or "UI Action",
            override_violations=req.overrideViolations
        )
        return result
    except PermissionError as e:
        raise HTTPException(status_code=400, detail={"type": "LOGICAL_VIOLATION_BLOCKER", "message": str(e)})
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# 5. Ledger & Restore
@router.get("/ledger/history")
def get_ledger_history(conn: sqlite3.Connection = Depends(get_db)):
    cur = conn.cursor()
    cur.execute("""
        SELECT id, execution_id, policy, root_table, root_id, affected_summary,
               executed_by, reason, restored, restored_at, created_at
        FROM cascade_audit_ledger
        ORDER BY id DESC LIMIT 50
    """)
    records = [dict(r) for r in cur.fetchall()]
    return {"ledger": records}

@router.get("/ledger/{ledger_id}")
def get_ledger_detail(ledger_id: int, conn: sqlite3.Connection = Depends(get_db)):
    cur = conn.cursor()
    cur.execute("SELECT * FROM cascade_audit_ledger WHERE id = ?", (ledger_id,))
    row = cur.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Ledger record not found")
    return dict(row)

@router.post("/ledger/{ledger_id}/restore")
def restore_ledger(ledger_id: int, conn: sqlite3.Connection = Depends(get_db)):
    try:
        result = restore_engine.restore_execution(conn, ledger_id)
        return result
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# 6. Integrity Doctor
@router.get("/integrity/audit")
def run_integrity_audit(conn: sqlite3.Connection = Depends(get_db)):
    return doctor.run_full_audit(conn)

@router.post("/integrity/chaos")
def inject_chaos(conn: sqlite3.Connection = Depends(get_db)):
    return doctor.inject_chaos_orphan(conn)

@router.post("/integrity/repair")
def repair_database(conn: sqlite3.Connection = Depends(get_db)):
    return doctor.repair_database(conn)

# 7. Database Seeder
@router.post("/seed/reset")
def reset_database(preset: str = "ENTERPRISE", conn: sqlite3.Connection = Depends(get_db)):
    seeder.init_schema(conn)
    result = seeder.reset_and_seed(conn, preset)
    return result
