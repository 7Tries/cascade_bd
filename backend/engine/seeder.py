"""
CascadeGuard: Multi-Tier Realistic Relational Data Seeder
Populates a multi-tier enterprise holding dataset with:
- 10 Relational and polymorphic tables
- Self-referential hierarchies (Management chain & recursive subtasks)
- Cyclic dependencies (Department -> Project -> Employee -> Department)
- Financial compliance invoices (PAID, LOCKED_AUDIT, DRAFT)
- Audit ledger history
"""
import sqlite3
from schema_defs import DDL_SCRIPT, POSTGRES_DDL_SCRIPT

class DatabaseSeeder:
    def __init__(self):
        pass

    def init_schema(self, conn):
        """Initializes tables, indexes and pragmas."""
        cur = conn.cursor()
        is_pg = getattr(conn, "db_type", "SQLITE") == "POSTGRESQL"
        if is_pg:
            cur.executescript(POSTGRES_DDL_SCRIPT)
        else:
            cur.executescript(DDL_SCRIPT)
        conn.commit()

    def reset_and_seed(self, conn, preset: str = "ENTERPRISE") -> dict:
        cur = conn.cursor()
        is_pg = getattr(conn, "db_type", "SQLITE") == "POSTGRESQL"
        if is_pg:
            cur.execute("""
                TRUNCATE cascade_audit_ledger, audit_attachments, payments, invoices, work_logs, tasks,
                         project_assignments, projects, employees, departments, organizations RESTART IDENTITY CASCADE;
            """)
            conn.commit()
        else:
            # Temporarily disable FKs during complete wipe to avoid delete order restrictions during reset
            cur.execute("PRAGMA foreign_keys = OFF;")
            cur.executescript("""
                DELETE FROM cascade_audit_ledger;
                DELETE FROM audit_attachments;
                DELETE FROM payments;
                DELETE FROM invoices;
                DELETE FROM work_logs;
                DELETE FROM tasks;
                DELETE FROM project_assignments;
                DELETE FROM projects;
                DELETE FROM employees;
                DELETE FROM departments;
                DELETE FROM organizations;
                DELETE FROM sqlite_sequence;
            """)
            conn.commit()
            cur.execute("PRAGMA foreign_keys = ON;")

        # 1. Organizations
        cur.execute("""
            INSERT INTO organizations (id, name, code, tier) VALUES
            (1, 'Apex Global Technologies Holding', 'APEX-HOLDING', 'ENTERPRISE'),
            (2, 'Vanguard Quantum Labs', 'VQL-RESEARCH', 'VENTURE')
        """)

        # 2. Departments
        cur.execute("""
            INSERT INTO departments (id, org_id, name, budget) VALUES
            (1, 1, 'Cloud Infrastructure & SRE', 1250000.00),
            (2, 1, 'FinTech & High-Frequency Systems', 2400000.00),
            (3, 1, 'Cybersecurity & Threat Defense', 950000.00),
            (4, 2, 'Quantum Computing Architecture', 1800000.00)
        """)

        # 3. Employees (with self-referential manager_id)
        # Note: insert managers first so manager_id references exist
        cur.execute("""
            INSERT INTO employees (id, dept_id, manager_id, full_name, email, role, salary) VALUES
            (1, 1, NULL, 'Dr. Victoria Stone', 'vstone@apex.tech', 'VP of Engineering', 240000.00),
            (2, 2, 1, 'Marcus Aurelius Vance', 'mvance@apex.tech', 'Chief FinTech Architect', 210000.00),
            (3, 1, 1, 'Elena Rostova', 'erostova@apex.tech', 'Lead Infrastructure Engineer', 185000.00),
            (4, 1, 3, 'David Kim', 'dkim@apex.tech', 'Senior SRE Engineer', 160000.00),
            (5, 2, 2, 'Sophie Martin', 'smartin@apex.tech', 'Algorithmic Systems Engineer', 170000.00),
            (6, 3, 1, 'Alexander Cross', 'across@apex.tech', 'Head of Cyber Defense', 195000.00),
            (7, 4, NULL, 'Dr. Hiroshi Tanaka', 'htanaka@vanguard.io', 'Principal Quantum Scientist', 230000.00)
        """)

        # 4. Projects (with cyclic lead_id referencing employees)
        cur.execute("""
            INSERT INTO projects (id, dept_id, lead_id, title, status) VALUES
            (1, 1, 3, 'Project Aegis: Zero-Trust Service Mesh', 'IN_PROGRESS'),
            (2, 2, 2, 'Project Hyperion: Low-Latency Settlement Engine', 'IN_PROGRESS'),
            (3, 3, 6, 'Project Sentinel: Autonomous Threat Mitigation', 'PLANNING'),
            (4, 4, 7, 'Project Qubit-X: Topological Qubit Simulation', 'IN_PROGRESS'),
            (5, 2, 5, 'Legacy Clearing System Migration', 'LOCKED')
        """)

        # 5. Project Assignments (Many-to-Many junction)
        cur.execute("""
            INSERT INTO project_assignments (id, project_id, employee_id, assigned_role, allocation_pct) VALUES
            (1, 1, 3, 'TECHNICAL_LEAD', 60),
            (2, 1, 4, 'DEVOPS_ENGINEER', 100),
            (3, 2, 2, 'CHIEF_ARCHITECT', 50),
            (4, 2, 5, 'CORE_DEVELOPER', 100),
            (5, 3, 6, 'SECURITY_DIRECTOR', 80),
            (6, 4, 7, 'LEAD_INVESTIGATOR', 100)
        """)

        # 6. Tasks (with recursive self-referential parent_task_id)
        cur.execute("""
            INSERT INTO tasks (id, project_id, parent_task_id, assignee_id, title, priority, status) VALUES
            (1, 1, NULL, 3, 'Deploy Envoy Sidecar Proxy Fleet', 'CRITICAL', 'IN_PROGRESS'),
            (2, 1, 1, 4, 'Configure SPIRE Workload Attestation', 'HIGH', 'IN_PROGRESS'),
            (3, 1, 1, 4, 'Automate TLS Certificate Rotation via Vault', 'MEDIUM', 'TODO'),
            (4, 2, NULL, 2, 'Design Lock-Free Ring Buffer Memory Pipeline', 'CRITICAL', 'DONE'),
            (5, 2, 4, 5, 'Implement FPGA Hardware Offloading Kernel', 'HIGH', 'IN_PROGRESS'),
            (6, 3, NULL, 6, 'Train Anomaly Detection Transformer Model', 'HIGH', 'PLANNING'),
            (7, 4, NULL, 7, 'Calibrate Anyon Braiding Braids Hamiltonian', 'CRITICAL', 'IN_PROGRESS')
        """)

        # 7. Work Logs
        cur.execute("""
            INSERT INTO work_logs (id, task_id, employee_id, hours_spent, notes, logged_date) VALUES
            (1, 1, 3, 6.5, 'Tuned eBPF bypass filters for ingress proxy', '2026-10-10'),
            (2, 2, 4, 8.0, 'Configured Node Agent Unix Domain Sockets', '2026-10-11'),
            (3, 2, 4, 4.5, 'Debugging mutual TLS handshake negotiation timeout', '2026-10-12'),
            (4, 4, 2, 12.0, 'Benchmarked Disruptor ring buffer under 10M ops/sec load', '2026-10-09'),
            (5, 5, 5, 9.5, 'Synthesized Verilog IP core for packet parser', '2026-10-11'),
            (6, 7, 7, 14.0, 'Simulated Majorana zero modes in 2D lattice', '2026-10-10')
        """)

        # 8. Invoices (with compliance rules: PAID, DRAFT, LOCKED_AUDIT)
        cur.execute("""
            INSERT INTO invoices (id, project_id, invoice_number, amount, status) VALUES
            (1, 1, 'INV-2026-001', 85000.00, 'DRAFT'),
            (2, 2, 'INV-2026-FIN-PAID', 340000.00, 'PAID'),
            (3, 2, 'INV-2026-FIN-AUDIT', 120000.00, 'LOCKED_AUDIT'),
            (4, 4, 'INV-VQL-2026-09', 250000.00, 'DRAFT')
        """)

        # 9. Payments (Settled transactions)
        cur.execute("""
            INSERT INTO payments (id, invoice_id, transaction_ref, amount, payment_method) VALUES
            (1, 2, 'TXN-SWIFT-9948201', 340000.00, 'WIRE_TRANSFER'),
            (2, 3, 'TXN-ESCROW-881204', 120000.00, 'ESCROW_SETTLEMENT')
        """)

        # 10. Polymorphic Audit Attachments
        cur.execute("""
            INSERT INTO audit_attachments (id, parent_table, parent_id, filename, file_size_kb, checksum) VALUES
            (1, 'projects', 1, 'Aegis_Architecture_Specification_v2.pdf', 3420, 'sha256-e3b0c44298fc1c149afb'),
            (2, 'projects', 2, 'Hyperion_LowLatency_Audit_Report.pdf', 8190, 'sha256-785bcf56a7d83c21a998'),
            (3, 'invoices', 2, 'Audited_Fiscal_Invoice_Receipt_340k.pdf', 540, 'sha256-42a9b1c73f56e921d011'),
            (4, 'tasks', 4, 'Disruptor_Benchmark_Microbench_Results.csv', 120, 'sha256-11f8c2e98745a1b32d56')
        """)

        if is_pg:
            tables = ["organizations", "departments", "employees", "projects", "project_assignments", "tasks", "work_logs", "invoices", "payments", "audit_attachments", "cascade_audit_ledger"]
            for tbl in tables:
                try:
                    cur.execute(f"SELECT setval(pg_get_serial_sequence('{tbl}', 'id'), coalesce(max(id), 1)) FROM {tbl};")
                except Exception:
                    pass

        conn.commit()

        # Query counts
        counts = {}
        for tbl in ["organizations", "departments", "employees", "projects", "project_assignments", "tasks", "work_logs", "invoices", "payments", "audit_attachments"]:
            cur.execute(f"SELECT COUNT(*) FROM {tbl}")
            counts[tbl] = cur.fetchone()[0]

        return {
            "status": "SEEDED_SUCCESSFULLY",
            "preset": preset,
            "counts": counts,
            "totalRows": sum(counts.values())
        }
