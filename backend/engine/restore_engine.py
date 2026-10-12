"""
CascadeGuard: Point-in-Time Snapshot Restoration Engine
Restores entire cascade-deleted subtrees from the immutable audit ledger:
- Parents-first top-down topological insertion
- Two-pass re-linking of self-referential & cyclic foreign keys
- ACID transaction with PRAGMA foreign_key_check verification
"""
import json
import time
import sqlite3
from typing import Dict, List, Any
from datetime import datetime
from schema_defs import SCHEMA_TABLES
from engine.graph_planner import GraphPlanner

class RestoreEngine:
    def __init__(self, planner: GraphPlanner):
        self.planner = planner
        self.tables = SCHEMA_TABLES

    def restore_execution(self, conn: sqlite3.Connection, ledger_id: int) -> Dict[str, Any]:
        cur = conn.cursor()
        cur.execute("SELECT * FROM cascade_audit_ledger WHERE id = ?", (ledger_id,))
        row = cur.fetchone()
        if not row:
            raise ValueError(f"Ledger entry with ID {ledger_id} not found")

        ledger = dict(row)
        if ledger["restored"] == 1:
            raise ValueError(f"Execution {ledger['execution_id']} has already been restored at {ledger['restored_at']}")

        snapshot_data = json.loads(ledger["snapshot_data"])
        snapshot_tables = set(snapshot_data.keys())
        restore_order = self.planner.get_restoration_order(snapshot_tables)

        start_time = time.perf_counter()
        trace_steps = []
        restored_counts = {}

        try:
            cur.execute("BEGIN IMMEDIATE TRANSACTION;")
            trace_steps.append({
                "step": 1,
                "action": "Acquired exclusive write lock for restore operation",
                "timestamp": datetime.now().isoformat()
            })

            cyclic_patches: List[Dict[str, Any]] = []

            # Pass 1: Insert records in parents-first order with cyclic FKs set to NULL
            for table_name in restore_order:
                records = snapshot_data.get(table_name, [])
                if not records:
                    continue

                meta = self.tables.get(table_name)
                cyclic_fks = [fk.from_col for fk in meta.fks if fk.is_cyclic] if meta else []

                for r in records:
                    cols = list(r.keys())
                    vals = []
                    for c in cols:
                        val = r[c]
                        if c in cyclic_fks and val is not None:
                            # Save patch for pass 2
                            cyclic_patches.append({
                                "table": table_name,
                                "pk_col": meta.pk,
                                "pk_val": r[meta.pk],
                                "col": c,
                                "target_val": val
                            })
                            vals.append(None)
                        else:
                            vals.append(val)

                    placeholders = ",".join("?" for _ in cols)
                    col_names = ",".join(cols)
                    insert_sql = f"INSERT OR REPLACE INTO {table_name} ({col_names}) VALUES ({placeholders})"
                    cur.execute(insert_sql, vals)

                restored_counts[table_name] = len(records)
                trace_steps.append({
                    "step": len(trace_steps) + 1,
                    "action": f"Restored {len(records)} records into table '{table_name}'",
                    "timestamp": datetime.now().isoformat()
                })

            # Pass 2: Re-link cyclic and self-referential pointers
            for patch in cyclic_patches:
                cur.execute(
                    f"UPDATE {patch['table']} SET {patch['col']} = ? WHERE {patch['pk_col']} = ?",
                    (patch["target_val"], patch["pk_val"])
                )

            if cyclic_patches:
                trace_steps.append({
                    "step": len(trace_steps) + 1,
                    "action": f"Re-linked {len(cyclic_patches)} cyclic/self-referential relationships",
                    "timestamp": datetime.now().isoformat()
                })

            # Physical foreign key check
            cur.execute("PRAGMA foreign_key_check;")
            violations = cur.fetchall()
            if violations:
                raise RuntimeError(f"Restore caused foreign key violations: {violations}")

            # Mark ledger as restored
            cur.execute(
                "UPDATE cascade_audit_ledger SET restored = 1, restored_at = datetime('now') WHERE id = ?",
                (ledger_id,)
            )

            conn.commit()
            trace_steps.append({
                "step": len(trace_steps) + 1,
                "action": "Physical integrity verified. Restore transaction successfully committed.",
                "timestamp": datetime.now().isoformat()
            })

        except Exception as e:
            conn.rollback()
            raise RuntimeError(f"Restore failed and was rolled back: {str(e)}")

        duration_ms = round((time.perf_counter() - start_time) * 1000, 2)
        total_restored = sum(restored_counts.values())

        return {
            "ledgerId": ledger_id,
            "executionId": ledger["execution_id"],
            "totalRestored": total_restored,
            "restoredCounts": restored_counts,
            "durationMs": duration_ms,
            "traceSteps": trace_steps,
            "timestamp": datetime.now().isoformat()
        }
