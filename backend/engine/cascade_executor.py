"""
CascadeGuard: Transactional Cascade Execution Engine
Implements ACID-compliant multi-phase cascade deletion with:
- Strict SQLite physical integrity checks (PRAGMA foreign_key_check)
- 2-Phase cyclic dependency de-coupling (SET NULL phase)
- Topological leaves-first deletion sequence
- Snapshot archival to immutable cascade_audit_ledger
- Soft-delete cascading propagation
- Granular step-by-step audit execution tracing
"""
import json
import uuid
import time
import sqlite3
from typing import Dict, List, Any, Optional
from datetime import datetime
from schema_defs import SCHEMA_TABLES
from engine.graph_planner import GraphPlanner
from engine.impact_analyzer import ImpactAnalyzer

class CascadeExecutor:
    def __init__(self, planner: GraphPlanner, analyzer: ImpactAnalyzer):
        self.planner = planner
        self.analyzer = analyzer
        self.tables = SCHEMA_TABLES

    def execute_cascade(
        self,
        conn: sqlite3.Connection,
        root_table: str,
        root_id: int,
        policy: str = "HARD_CASCADE", # HARD_CASCADE, SOFT_CASCADE, ARCHIVE_AND_HARD_DELETE, SAFE_NULLIFY
        reason: str = "User initiated cascade deletion",
        override_violations: bool = False
    ) -> Dict[str, Any]:
        """
        Executes cascade deletion in strict ACID transaction with physical FK validation.
        """
        # Step 1: Perform dry-run impact analysis
        analysis = self.analyzer.analyze(conn, root_table, root_id, policy)

        # Check critical blockers
        critical_violations = [v for v in analysis["violations"] if v["severity"] == "CRITICAL_BLOCKER"]
        if critical_violations and not override_violations:
            raise PermissionError(
                f"Cascade aborted due to {len(critical_violations)} logical integrity blocker(s): "
                f"{critical_violations[0]['message']}"
            )

        execution_id = f"EXEC-{uuid.uuid4().hex[:10].upper()}"
        start_time = time.perf_counter()
        trace_steps: List[Dict[str, Any]] = []

        cur = conn.cursor()

        try:
            # Begin strict transaction
            cur.execute("BEGIN IMMEDIATE TRANSACTION;")
            trace_steps.append({
                "step": 1,
                "phase": "TRANSACTION_START",
                "action": "Acquired IMMEDIATE exclusive write lock",
                "status": "SUCCESS",
                "timestamp": datetime.now().isoformat()
            })

            # Snapshot data collection
            snapshot_records = {}
            for table_name, records in analysis["records"].items():
                if records:
                    snapshot_records[table_name] = records

            affected_summary_json = json.dumps(analysis["affectedCounts"])
            snapshot_json = json.dumps(snapshot_records, default=str)

            # Store in audit ledger if archive or hard cascade
            if policy in ["ARCHIVE_AND_HARD_DELETE", "HARD_CASCADE"]:
                cur.execute("""
                    INSERT INTO cascade_audit_ledger (
                        execution_id, policy, root_table, root_id, affected_summary,
                        snapshot_data, executed_by, reason, created_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
                """, (
                    execution_id,
                    policy,
                    root_table,
                    root_id,
                    affected_summary_json,
                    snapshot_json,
                    "admin",
                    reason
                ))
                trace_steps.append({
                    "step": len(trace_steps) + 1,
                    "phase": "LEDGER_SNAPSHOT",
                    "action": f"Recorded complete subtree snapshot ({analysis['totalAffected']} rows) in audit ledger",
                    "status": "SUCCESS",
                    "timestamp": datetime.now().isoformat()
                })

            if policy == "SOFT_CASCADE":
                # Mark is_deleted = 1 and deleted_at = datetime('now')
                now_str = datetime.now().isoformat()
                for table_name, records in analysis["records"].items():
                    if not records:
                        continue
                    pk_name = self.tables[table_name].pk
                    ids = [r[pk_name] for r in records]
                    placeholders = ",".join("?" for _ in ids)
                    sql = f"UPDATE {table_name} SET is_deleted = 1, deleted_at = ? WHERE {pk_name} IN ({placeholders})"
                    cur.execute(sql, [now_str] + ids)
                    trace_steps.append({
                        "step": len(trace_steps) + 1,
                        "phase": "SOFT_CASCADE_UPDATE",
                        "action": f"Updated {len(ids)} rows in '{table_name}' with is_deleted=1",
                        "status": "SUCCESS",
                        "timestamp": datetime.now().isoformat()
                    })

            elif policy == "SAFE_NULLIFY":
                # For child tables referencing root, set FK to null where allowed
                child_refs = self.planner.children_map.get(root_table, [])
                for child_table, fk in child_refs:
                    if fk.is_nullable:
                        cur.execute(
                            f"UPDATE {child_table} SET {fk.from_col} = NULL WHERE {fk.from_col} = ?",
                            (root_id,)
                        )
                        trace_steps.append({
                            "step": len(trace_steps) + 1,
                            "phase": "NULLIFY_FK",
                            "action": f"Nullified {fk.from_col} in '{child_table}' referencing root ID {root_id}",
                            "status": "SUCCESS",
                            "timestamp": datetime.now().isoformat()
                        })
                    else:
                        raise ValueError(f"Cannot safe-nullify: foreign key '{fk.from_col}' in '{child_table}' is NOT NULL")

                # Finally delete root
                root_pk = self.tables[root_table].pk
                cur.execute(f"DELETE FROM {root_table} WHERE {root_pk} = ?", (root_id,))
                trace_steps.append({
                    "step": len(trace_steps) + 1,
                    "phase": "ROOT_DELETE",
                    "action": f"Deleted root row from '{root_table}' ID {root_id}",
                    "status": "SUCCESS",
                    "timestamp": datetime.now().isoformat()
                })

            else:
                # HARD_CASCADE or ARCHIVE_AND_HARD_DELETE:
                # Phase A: De-couple cyclic foreign keys to prevent FK violation deadlocks
                for update in analysis["cyclicUpdates"]:
                    cur.execute(
                        f"UPDATE {update['table']} SET {update['column']} = NULL WHERE {self.tables[update['table']].pk} = ?",
                        (update["pk"],)
                    )
                if analysis["cyclicUpdates"]:
                    trace_steps.append({
                        "step": len(trace_steps) + 1,
                        "phase": "CYCLE_DECOUPLING",
                        "action": f"Severed {len(analysis['cyclicUpdates'])} cyclic/self-referential FK pointers to NULL",
                        "status": "SUCCESS",
                        "timestamp": datetime.now().isoformat()
                    })

                # Phase B: Physical leaves-first topological deletion
                for table_name in analysis["deletionOrder"]:
                    records = analysis["records"].get(table_name, [])
                    if not records:
                        continue
                    pk_name = self.tables[table_name].pk
                    ids = [r[pk_name] for r in records]
                    placeholders = ",".join("?" for _ in ids)
                    del_sql = f"DELETE FROM {table_name} WHERE {pk_name} IN ({placeholders})"
                    cur.execute(del_sql, ids)
                    trace_steps.append({
                        "step": len(trace_steps) + 1,
                        "phase": "TOPOLOGICAL_DELETE",
                        "action": f"Physically deleted {len(ids)} rows from '{table_name}'",
                        "status": "SUCCESS",
                        "timestamp": datetime.now().isoformat()
                    })

            # Pre-commit Physical Referential Integrity Verification
            cur.execute("PRAGMA foreign_key_check;")
            fk_violations = cur.fetchall()
            if fk_violations:
                viol_details = [
                    f"Table: {v[0]}, RowId: {v[1]}, Parent: {v[2]}, FK index: {v[3]}"
                    for v in fk_violations
                ]
                raise RuntimeError(
                    f"Physical Integrity Verification Failed! PRAGMA foreign_key_check returned violations: "
                    + "; ".join(viol_details)
                )

            trace_steps.append({
                "step": len(trace_steps) + 1,
                "phase": "PHYSICAL_INTEGRITY_CHECK",
                "action": "PRAGMA foreign_key_check passed with 0 violations. Physical integrity intact.",
                "status": "VERIFIED",
                "timestamp": datetime.now().isoformat()
            })

            # Commit transaction
            conn.commit()
            trace_steps.append({
                "step": len(trace_steps) + 1,
                "phase": "TRANSACTION_COMMIT",
                "action": "ACID Transaction committed to disk cleanly",
                "status": "COMMITTED",
                "timestamp": datetime.now().isoformat()
            })

        except Exception as e:
            conn.rollback()
            trace_steps.append({
                "step": len(trace_steps) + 1,
                "phase": "TRANSACTION_ROLLBACK",
                "action": f"Transaction rolled back safely: {str(e)}",
                "status": "ROLLED_BACK",
                "timestamp": datetime.now().isoformat()
            })
            raise

        duration_ms = round((time.perf_counter() - start_time) * 1000, 2)

        return {
            "executionId": execution_id,
            "policy": policy,
            "rootTable": root_table,
            "rootId": root_id,
            "totalAffected": analysis["totalAffected"],
            "affectedSummary": analysis["affectedCounts"],
            "durationMs": duration_ms,
            "traceSteps": trace_steps,
            "integrityVerified": True,
            "timestamp": datetime.now().isoformat()
        }
