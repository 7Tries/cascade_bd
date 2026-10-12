"""
CascadeGuard: Automated Verification Test Suite
Verifies:
1. Physical foreign key constraint enforcement
2. 2-Phase cyclic and self-referential uncoupling
3. Topological leaves-first deletion sequence
4. Financial compliance logical blockers
5. 1-Click point-in-time snapshot restoration
6. Integrity Doctor anomaly detection & repair
"""
import unittest
import sqlite3
import os
import sys

# Add parent directory to sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import get_connection
from schema_defs import DDL_SCRIPT
from engine.graph_planner import GraphPlanner
from engine.impact_analyzer import ImpactAnalyzer
from engine.cascade_executor import CascadeExecutor
from engine.restore_engine import RestoreEngine
from engine.integrity_doctor import IntegrityDoctor
from engine.seeder import DatabaseSeeder

class TestCascadeIntegrity(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.test_db = os.path.join(os.path.dirname(__file__), "test_cascade.db")
        if os.path.exists(cls.test_db):
            os.remove(cls.test_db)

        cls.conn = get_connection(cls.test_db)
        cls.seeder = DatabaseSeeder()
        cls.seeder.init_schema(cls.conn)
        cls.planner = GraphPlanner()
        cls.analyzer = ImpactAnalyzer(cls.planner)
        cls.executor = CascadeExecutor(cls.planner, cls.analyzer)
        cls.restorer = RestoreEngine(cls.planner)
        cls.doctor = IntegrityDoctor()

    def setUp(self):
        # Reset and seed clean data before each test
        self.seeder.reset_and_seed(self.conn, "ENTERPRISE")

    def test_01_physical_integrity_initial_audit(self):
        """Database should start with 100% integrity health score and 0 foreign key violations."""
        audit = self.doctor.run_full_audit(self.conn)
        self.assertEqual(audit["score"], 100)
        self.assertEqual(audit["physicalStatus"], "OK")
        self.assertEqual(audit["totalIssues"], 0)

    def test_02_direct_deletion_without_cascade_fails_fk_constraint(self):
        """Attempting direct deletion of parent record without cascade MUST trigger SQLite FK violation."""
        cur = self.conn.cursor()
        with self.assertRaises(sqlite3.IntegrityError):
            cur.execute("DELETE FROM organizations WHERE id = 1")

    def test_03_impact_analyzer_detects_blockers(self):
        """Impact analyzer should identify PAID invoices as critical logical integrity blockers."""
        analysis = self.analyzer.analyze(self.conn, "departments", 1)
        self.assertFalse(analysis["canProceed"])
        blockers = [v for v in analysis["violations"] if v["severity"] == "CRITICAL_BLOCKER"]
        self.assertTrue(len(blockers) >= 1)
        self.assertEqual(blockers[0]["rule"], "FINANCIAL_COMPLIANCE_LOCK")

    def test_04_hard_cascade_with_override_preserves_physical_integrity(self):
        """Executing authorized cascade deletion must delete in topological order and pass PRAGMA foreign_key_check."""
        res = self.executor.execute_cascade(
            self.conn,
            root_table="departments",
            root_id=1,
            policy="HARD_CASCADE",
            override_violations=True
        )
        self.assertTrue(res["integrityVerified"])
        self.assertGreater(res["totalAffected"], 0)

        # Confirm post-cascade integrity
        audit = self.doctor.run_full_audit(self.conn)
        self.assertEqual(audit["score"], 100)
        self.assertEqual(len(audit["issues"]), 0)

    def test_05_snapshot_archival_and_point_in_time_restoration(self):
        """Archive-and-hard-delete must allow 1-click restoration recovering exact row counts and FK consistency."""
        cur = self.conn.cursor()
        cur.execute("SELECT COUNT(*) FROM tasks")
        initial_tasks = cur.fetchone()[0]

        # Execute archive & purge on task #1
        del_res = self.executor.execute_cascade(
            self.conn,
            root_table="tasks",
            root_id=1,
            policy="ARCHIVE_AND_HARD_DELETE"
        )
        cur.execute("SELECT COUNT(*) FROM tasks")
        reduced_tasks = cur.fetchone()[0]
        self.assertLess(reduced_tasks, initial_tasks)

        # Retrieve ledger entry
        cur.execute("SELECT id FROM cascade_audit_ledger WHERE execution_id = ?", (del_res["executionId"],))
        ledger_id = cur.fetchone()[0]

        # Restore from snapshot
        restore_res = self.restorer.restore_execution(self.conn, ledger_id)
        self.assertEqual(restore_res["totalRestored"], del_res["totalAffected"])

        # Verify task count restored
        cur.execute("SELECT COUNT(*) FROM tasks")
        restored_tasks = cur.fetchone()[0]
        self.assertEqual(restored_tasks, initial_tasks)

        # Audit post restore
        audit = self.doctor.run_full_audit(self.conn)
        self.assertEqual(audit["score"], 100)

    def test_06_soft_cascade_propagation(self):
        """Soft-cascade should propagate is_deleted=1 recursively without physical row removal."""
        res = self.executor.execute_cascade(
            self.conn,
            root_table="tasks",
            root_id=1,
            policy="SOFT_CASCADE"
        )
        cur = self.conn.cursor()
        cur.execute("SELECT is_deleted FROM tasks WHERE id = 1")
        self.assertEqual(cur.fetchone()[0], 1)

        # Subtasks should also be soft-deleted
        cur.execute("SELECT is_deleted FROM tasks WHERE parent_task_id = 1")
        for row in cur.fetchall():
            self.assertEqual(row[0], 1)

    def test_07_integrity_doctor_chaos_detection_and_repair(self):
        """Integrity Doctor must detect intentionally injected orphan records and successfully repair them."""
        # Inject chaos
        chaos = self.doctor.inject_chaos_orphan(self.conn)
        audit = self.doctor.run_full_audit(self.conn)
        self.assertLess(audit["score"], 100)
        self.assertTrue(any(i["type"] == "ORPHANED_FOREIGN_KEY" for i in audit["issues"]))

        # Run automated repair
        repair = self.doctor.repair_database(self.conn)
        self.assertGreater(repair["repairedCount"], 0)

        # Confirm post-repair clean state
        audit_after = self.doctor.run_full_audit(self.conn)
        self.assertEqual(audit_after["score"], 100)

    @classmethod
    def tearDownClass(cls):
        cls.conn.close()
        if os.path.exists(cls.test_db):
            os.remove(cls.test_db)

if __name__ == "__main__":
    unittest.main()
