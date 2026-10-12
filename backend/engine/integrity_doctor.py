"""
CascadeGuard: Integrity Doctor
Comprehensive diagnostic, audit, and repair system for physical and logical database integrity:
- Physical: PRAGMA foreign_key_check, PRAGMA integrity_check, B-tree sanity
- Logical: Invariant compliance, dangling polymorphic attachments, soft-delete consistency
- Repair: Automated orphan sweeps and consistency alignment
- Simulation: Chaos injector to demonstrate detection and repair
"""
import sqlite3
from typing import Dict, List, Any
from schema_defs import SCHEMA_TABLES

class IntegrityDoctor:
    def __init__(self):
        self.tables = SCHEMA_TABLES

    def run_full_audit(self, conn: sqlite3.Connection) -> Dict[str, Any]:
        cur = conn.cursor()
        issues: List[Dict[str, Any]] = []

        # 1. Physical Integrity Check (B-Tree & file storage)
        cur.execute("PRAGMA integrity_check(10);")
        integrity_rows = cur.fetchall()
        physical_status = "OK"
        if integrity_rows and integrity_rows[0][0] != "ok":
            physical_status = "CORRUPTED"
            for r in integrity_rows:
                issues.append({
                    "type": "PHYSICAL_STORAGE_CORRUPTION",
                    "severity": "CRITICAL",
                    "detail": str(r[0]),
                    "table": "SQLITE_CORE"
                })

        # 2. Foreign Key Referential Integrity Check
        cur.execute("PRAGMA foreign_key_check;")
        fk_rows = cur.fetchall()
        for r in fk_rows:
            issues.append({
                "type": "ORPHANED_FOREIGN_KEY",
                "severity": "HIGH",
                "table": r[0],
                "rowId": r[1],
                "parentTable": r[2],
                "fkIndex": r[3],
                "detail": f"Table '{r[0]}' row {r[1]} points to non-existent parent in '{r[2]}'"
            })

        # 3. Polymorphic Orphan Check (audit_attachments)
        cur.execute("SELECT id, parent_table, parent_id, filename FROM audit_attachments")
        attachments = cur.fetchall()
        for att in attachments:
            aid, ptable, pid, fname = att[0], att[1], att[2], att[3]
            if ptable in self.tables:
                pk_name = self.tables[ptable].pk
                cur.execute(f"SELECT COUNT(*) FROM {ptable} WHERE {pk_name} = ?", (pid,))
                if cur.fetchone()[0] == 0:
                    issues.append({
                        "type": "ORPHANED_POLYMORPHIC_ATTACHMENT",
                        "severity": "MEDIUM",
                        "table": "audit_attachments",
                        "rowId": aid,
                        "parentTable": ptable,
                        "detail": f"Attachment '{fname}' points to non-existent {ptable} with ID {pid}"
                    })

        # 4. Logical Invariant Checks
        # A) Negative/Zero Worklog hours
        cur.execute("SELECT id, hours_spent FROM work_logs WHERE hours_spent <= 0")
        for bad_wl in cur.fetchall():
            issues.append({
                "type": "LOGICAL_INVARIANT_VIOLATION",
                "severity": "LOW",
                "table": "work_logs",
                "rowId": bad_wl[0],
                "detail": f"Work log #{bad_wl[0]} has invalid non-positive duration ({bad_wl[1]} hrs)"
            })

        # B) Negative Invoice amount
        cur.execute("SELECT id, invoice_number, amount FROM invoices WHERE amount < 0")
        for bad_inv in cur.fetchall():
            issues.append({
                "type": "LOGICAL_INVARIANT_VIOLATION",
                "severity": "HIGH",
                "table": "invoices",
                "rowId": bad_inv[0],
                "detail": f"Invoice {bad_inv[1]} has negative financial amount ({bad_inv[2]})"
            })

        # C) Soft-delete Inconsistency: Active child referencing a soft-deleted parent!
        # E.g. Active employee whose department is marked is_deleted=1
        cur.execute("""
            SELECT e.id, e.full_name, d.id, d.name
            FROM employees e
            JOIN departments d ON e.dept_id = d.id
            WHERE e.is_deleted = 0 AND d.is_deleted = 1
        """)
        for bad_sd in cur.fetchall():
            issues.append({
                "type": "SOFT_DELETE_INCONSISTENCY",
                "severity": "MEDIUM",
                "table": "employees",
                "rowId": bad_sd[0],
                "detail": f"Active employee '{bad_sd[1]}' belongs to soft-deleted department '{bad_sd[3]}'"
            })

        # Score calculation: 100 minus penalty per issue
        total_issues = len(issues)
        score = max(0, 100 - (len([i for i in issues if i["severity"] == "CRITICAL"]) * 50 +
                             len([i for i in issues if i["severity"] == "HIGH"]) * 20 +
                             len([i for i in issues if i["severity"] == "MEDIUM"]) * 10 +
                             len([i for i in issues if i["severity"] == "LOW"]) * 5))

        return {
            "score": score,
            "status": "HEALTHY" if score == 100 else ("WARNING" if score >= 70 else "CRITICAL"),
            "physicalStatus": physical_status,
            "totalIssues": total_issues,
            "issues": issues
        }

    def inject_chaos_orphan(self, conn: sqlite3.Connection) -> Dict[str, Any]:
        """
        Temporarily turns off FK enforcement to insert an intentional orphan
        for demonstration of integrity doctor detection and cascade protection.
        """
        cur = conn.cursor()
        cur.execute("PRAGMA foreign_keys = OFF;")
        cur.execute("""
            INSERT INTO departments (org_id, name, budget, is_deleted)
            VALUES (999999, 'CHAOS_SIMULATED_ORPHAN_DEPT', 150000.0, 0)
        """)
        orphan_id = cur.lastrowid
        conn.commit()
        cur.execute("PRAGMA foreign_keys = ON;")
        return {
            "action": "INJECTED_ORPHAN",
            "table": "departments",
            "insertedId": orphan_id,
            "invalidRef": 999999,
            "message": f"Injected orphan department (ID {orphan_id}) referencing non-existent organization 999999"
        }

    def repair_database(self, conn: sqlite3.Connection) -> Dict[str, Any]:
        """
        Repairs logical inconsistencies and purges orphan records safely.
        """
        cur = conn.cursor()
        cur.execute("PRAGMA foreign_keys = OFF;")
        repaired_actions = []

        try:
            cur.execute("BEGIN IMMEDIATE TRANSACTION;")

            # 1. Purge departments with non-existent org_id
            cur.execute("""
                DELETE FROM departments WHERE org_id NOT IN (SELECT id FROM organizations)
            """)
            if cur.rowcount > 0:
                repaired_actions.append(f"Purged {cur.rowcount} orphan department records")

            # 2. Fix polymorphic attachments
            for parent_tbl in ["projects", "tasks", "invoices"]:
                cur.execute(f"""
                    DELETE FROM audit_attachments
                    WHERE parent_table = '{parent_tbl}'
                    AND parent_id NOT IN (SELECT id FROM {parent_tbl})
                """)
                if cur.rowcount > 0:
                    repaired_actions.append(f"Purged {cur.rowcount} orphan attachments for {parent_tbl}")

            # 3. Synchronize soft-deleted cascades: mark employees whose department is soft-deleted
            cur.execute("""
                UPDATE employees SET is_deleted = 1, deleted_at = datetime('now')
                WHERE is_deleted = 0 AND dept_id IN (SELECT id FROM departments WHERE is_deleted = 1)
            """)
            if cur.rowcount > 0:
                repaired_actions.append(f"Synchronized soft-delete state for {cur.rowcount} child employees")

            conn.commit()
        finally:
            cur.execute("PRAGMA foreign_keys = ON;")

        return {
            "repairedCount": len(repaired_actions),
            "actions": repaired_actions,
            "message": "Database repair completed successfully."
        }
