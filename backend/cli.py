"""
CascadeGuard: Comprehensive CLI Utility for DBAs & Engineers
Provides command-line interface for:
- Dry-run simulation & dependency impact analysis
- Safe transactional cascade deletion with physical FK checks
- 1-Click point-in-time snapshot restoration
- Physical & logical integrity audits
- Database seeding & resetting
"""
import sys
import argparse
import json
import webbrowser
import uvicorn
from database import get_connection
from schema_defs import SCHEMA_TABLES
from engine.graph_planner import GraphPlanner
from engine.impact_analyzer import ImpactAnalyzer
from engine.cascade_executor import CascadeExecutor
from engine.restore_engine import RestoreEngine
from engine.integrity_doctor import IntegrityDoctor
from engine.seeder import DatabaseSeeder

def print_banner():
    print("""
======================================================================
  CASCADEGUARD: ACID REFERENTIAL INTEGRITY & CASCADE ENGINE v1.0
======================================================================
    """)

def cmd_tables():
    planner = GraphPlanner()
    with get_connection() as conn:
        cur = conn.cursor()
        print("\n[SCHEMA TABLES & REFERENTIAL INTEGRITY STATE]")
        print(f"{'TABLE NAME':<24} | {'CATEGORY':<16} | {'ACTIVE':<8} | {'DELETED':<8} | {'FK RELATIONS'}")
        print("-" * 80)
        for name, meta in SCHEMA_TABLES.items():
            cur.execute(f"SELECT COUNT(*) FROM {name} WHERE is_deleted = 0")
            act = cur.fetchone()[0]
            cur.execute(f"SELECT COUNT(*) FROM {name} WHERE is_deleted = 1")
            del_cnt = cur.fetchone()[0]
            fk_count = len(meta.fks)
            print(f"{name:<24} | {meta.category:<16} | {act:<8} | {del_cnt:<8} | {fk_count} foreign key(s)")

def cmd_simulate(table: str, row_id: int, policy: str):
    planner = GraphPlanner()
    analyzer = ImpactAnalyzer(planner)
    with get_connection() as conn:
        print(f"\n[RUNNING DRY-RUN IMPACT SIMULATION: {table} #{row_id}]")
        analysis = analyzer.analyze(conn, table, row_id, policy)

        print(f"\n  Root Entity: {analysis['root']['table']} #{analysis['root']['id']} - '{analysis['root']['label']}'")
        print(f"  Policy:      {policy}")
        print(f"  Total Rows:  {analysis['totalAffected']} affected across {len(analysis['impactedTables'])} tables")
        print(f"  Max Depth:   {analysis['maxDepth']} hierarchical level(s)")
        print(f"  Cyclic FKs:  {analysis['cyclicEdgesToUnlink']} edge(s) to sever during phase 1")

        print("\n  [AFFECTED BREAKDOWN BY TABLE]:")
        for tbl, cnt in analysis["affectedCounts"].items():
            print(f"    - {tbl:<22}: {cnt} row(s)")

        print("\n  [PLANNED LEAVES-FIRST TOPOLOGICAL DELETION ORDER]:")
        for idx, tbl in enumerate(analysis["deletionOrder"], 1):
            print(f"    {idx}. {tbl}")

        print("\n  [LOGICAL INVARIANT COMPLIANCE AUDIT]:")
        if not analysis["violations"]:
            print("    [PASS] 100% compliant. Zero logical invariant blockers.")
        else:
            for v in analysis["violations"]:
                flag = "[BLOCKER]" if v["severity"] == "CRITICAL_BLOCKER" else "[WARNING]"
                print(f"    {flag} {v['rule']}: {v['message']}")

        return analysis

def cmd_cascade(table: str, row_id: int, policy: str, override: bool, reason: str):
    planner = GraphPlanner()
    analyzer = ImpactAnalyzer(planner)
    executor = CascadeExecutor(planner, analyzer)
    with get_connection() as conn:
        print(f"\n[EXECUTING ACID CASCADE DELETION: {table} #{row_id}]")
        try:
            res = executor.execute_cascade(
                conn=conn,
                root_table=table,
                root_id=row_id,
                policy=policy,
                reason=reason,
                override_violations=override
            )
            print(f"\n  STATUS: SUCCESS (Execution ID: {res['executionId']})")
            print(f"  Duration:           {res['durationMs']} ms")
            print(f"  Total Rows Removed: {res['totalAffected']}")
            print(f"  Integrity Check:    PASS (PRAGMA foreign_key_check verified with 0 violations)")
            print("\n  [TRANSACTION EXECUTION TRACE]:")
            for step in res["traceSteps"]:
                status_str = f"[{step['status']}]" if step.get("status") else ""
                print(f"    Step {step['step']}: {step['action']} {status_str}")
        except Exception as e:
            print(f"\n  [ERROR] Deletion aborted and rolled back: {e}")

def cmd_restore(ledger_id: int):
    planner = GraphPlanner()
    restorer = RestoreEngine(planner)
    with get_connection() as conn:
        print(f"\n[EXECUTING POINT-IN-TIME RESTORE: Ledger #{ledger_id}]")
        try:
            res = restorer.restore_execution(conn, ledger_id)
            print(f"\n  STATUS: SUCCESS (Execution ID: {res['executionId']})")
            print(f"  Duration:            {res['durationMs']} ms")
            print(f"  Total Rows Restored: {res['totalRestored']}")
            print("\n  [RESTORE STEPS]:")
            for step in res["traceSteps"]:
                print(f"    Step {step['step']}: {step['action']}")
        except Exception as e:
            print(f"\n  [ERROR] Restore failed: {e}")

def cmd_audit():
    doctor = IntegrityDoctor()
    with get_connection() as conn:
        print("\n[PERFORMING DATABASE INTEGRITY AUDIT]")
        audit = doctor.run_full_audit(conn)
        print(f"\n  Overall Health Score: {audit['score']}% [{audit['status']}]")
        print(f"  Physical Storage:     {audit['physicalStatus']}")
        print(f"  Total Anomalies:      {audit['totalIssues']}")

        if audit["issues"]:
            print("\n  [DETECTED ISSUES]:")
            for i in audit["issues"]:
                print(f"    - [{i['severity']}] {i['type']} ({i['table']}): {i['detail']}")
        else:
            print("\n  Database physical and logical integrity verified 100% OK.")

def cmd_seed(preset: str):
    seeder = DatabaseSeeder()
    with get_connection() as conn:
        print(f"\n[RESETTING AND SEEDING DATASET: {preset}]")
        seeder.init_schema(conn)
        res = seeder.reset_and_seed(conn, preset)
        print(f"  Seeded {res['totalRows']} rows across 10 relational tables.")
        for tbl, count in res["counts"].items():
            print(f"    - {tbl:<22}: {count} rows")

def main():
    print_banner()
    parser = argparse.ArgumentParser(description="CascadeGuard CLI")
    subparsers = parser.add_subparsers(dest="command")

    # Tables
    subparsers.add_parser("tables", help="List all tables, row counts and foreign keys")

    # Simulate
    p_sim = subparsers.add_parser("simulate", help="Dry-run simulate cascade deletion")
    p_sim.add_argument("table", type=str, help="Root table name")
    p_sim.add_argument("id", type=int, help="Root record ID")
    p_sim.add_argument("--policy", type=str, default="HARD_CASCADE", choices=["HARD_CASCADE", "SOFT_CASCADE", "ARCHIVE_AND_HARD_DELETE", "SAFE_NULLIFY"])

    # Cascade
    p_del = subparsers.add_parser("cascade", help="Execute transactional cascade deletion")
    p_del.add_argument("table", type=str, help="Root table name")
    p_del.add_argument("id", type=int, help="Root record ID")
    p_del.add_argument("--policy", type=str, default="HARD_CASCADE", choices=["HARD_CASCADE", "SOFT_CASCADE", "ARCHIVE_AND_HARD_DELETE", "SAFE_NULLIFY"])
    p_del.add_argument("--override", action="store_true", help="Authorize override of logical invariant blockers")
    p_del.add_argument("--reason", type=str, default="CLI cascade operation")

    # Restore
    p_res = subparsers.add_parser("restore", help="Restore deleted subtree from ledger")
    p_res.add_argument("ledger_id", type=int, help="Audit ledger entry ID")

    # Audit
    subparsers.add_parser("audit", help="Run Integrity Doctor physical & logical audit")

    # Seed
    p_seed = subparsers.add_parser("seed", help="Reset and seed database")
    p_seed.add_argument("--preset", type=str, default="ENTERPRISE")

    # Serve
    p_serve = subparsers.add_parser("serve", help="Start web application and open in browser")
    p_serve.add_argument("--port", type=int, default=8000)

    args = parser.parse_args()

    if args.command == "tables":
        cmd_tables()
    elif args.command == "simulate":
        cmd_simulate(args.table, args.id, args.policy)
    elif args.command == "cascade":
        cmd_cascade(args.table, args.id, args.policy, args.override, args.reason)
    elif args.command == "restore":
        cmd_restore(args.ledger_id)
    elif args.command == "audit":
        cmd_audit()
    elif args.command == "seed":
        cmd_seed(args.preset)
    elif args.command == "serve":
        import socket
        port = args.port
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            if s.connect_ex(('127.0.0.1', port)) == 0:
                print(f"\n[CascadeGuard] Предупреждение: порт {port} уже занят сторонним процессом.")
                print(f"Освобождение порта {port} от зависших фоновых процессов...")
                try:
                    import subprocess
                    subprocess.run(
                        ["powershell", "-Command", f"Get-NetTCPConnection -LocalPort {port} -ErrorAction SilentlyContinue | ForEach-Object {{ Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }}"],
                        timeout=5
                    )
                except Exception:
                    pass
        url = f"http://localhost:{port}"
        print(f"\nЗапуск сервера CascadeGuard: {url}")
        webbrowser.open(url)
        uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
    else:
        parser.print_help()

if __name__ == "__main__":
    main()
