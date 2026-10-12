"""
CascadeGuard: Schema & Relationship Definitions
Declarative metadata describing:
- Tables & primary keys
- Foreign key dependencies & on_delete rules
- Soft-delete support
- Logical integrity rules & constraints
"""
from typing import Dict, List, Any, Optional
from dataclasses import dataclass, field

@dataclass
class ForeignKeyRef:
    from_col: str
    to_table: str
    to_col: str
    on_delete: str = "CASCADE" # CASCADE, RESTRICT, SET NULL, NO ACTION
    is_nullable: bool = False
    is_cyclic: bool = False

@dataclass
class TableMeta:
    name: str
    pk: str
    display_col: str
    category: str
    has_soft_delete: bool = True
    fks: List[ForeignKeyRef] = field(default_factory=list)
    description: str = ""

SCHEMA_TABLES: Dict[str, TableMeta] = {
    "organizations": TableMeta(
        name="organizations",
        pk="id",
        display_col="name",
        category="Root Enterprise",
        has_soft_delete=True,
        fks=[],
        description="Root corporate organization holding"
    ),
    "departments": TableMeta(
        name="departments",
        pk="id",
        display_col="name",
        category="Division",
        has_soft_delete=True,
        fks=[
            ForeignKeyRef("org_id", "organizations", "id", on_delete="CASCADE", is_nullable=False)
        ],
        description="Operational department within an organization"
    ),
    "employees": TableMeta(
        name="employees",
        pk="id",
        display_col="full_name",
        category="Personnel",
        has_soft_delete=True,
        fks=[
            ForeignKeyRef("dept_id", "departments", "id", on_delete="CASCADE", is_nullable=False),
            ForeignKeyRef("manager_id", "employees", "id", on_delete="SET NULL", is_nullable=True, is_cyclic=True)
        ],
        description="Staff member; supports self-referential manager hierarchy"
    ),
    "projects": TableMeta(
        name="projects",
        pk="id",
        display_col="title",
        category="Operation",
        has_soft_delete=True,
        fks=[
            ForeignKeyRef("dept_id", "departments", "id", on_delete="CASCADE", is_nullable=False),
            ForeignKeyRef("lead_id", "employees", "id", on_delete="SET NULL", is_nullable=True, is_cyclic=True)
        ],
        description="Business initiative, linked to department and team lead"
    ),
    "project_assignments": TableMeta(
        name="project_assignments",
        pk="id",
        display_col="assigned_role",
        category="Junction",
        has_soft_delete=True,
        fks=[
            ForeignKeyRef("project_id", "projects", "id", on_delete="CASCADE", is_nullable=False),
            ForeignKeyRef("employee_id", "employees", "id", on_delete="CASCADE", is_nullable=False)
        ],
        description="Many-to-many allocation between projects and employees"
    ),
    "tasks": TableMeta(
        name="tasks",
        pk="id",
        display_col="title",
        category="Execution",
        has_soft_delete=True,
        fks=[
            ForeignKeyRef("project_id", "projects", "id", on_delete="CASCADE", is_nullable=False),
            ForeignKeyRef("parent_task_id", "tasks", "id", on_delete="CASCADE", is_nullable=True, is_cyclic=True),
            ForeignKeyRef("assignee_id", "employees", "id", on_delete="SET NULL", is_nullable=True)
        ],
        description="Deliverable task; supports recursive subtasks"
    ),
    "work_logs": TableMeta(
        name="work_logs",
        pk="id",
        display_col="hours_spent",
        category="Telemetry",
        has_soft_delete=True,
        fks=[
            ForeignKeyRef("task_id", "tasks", "id", on_delete="CASCADE", is_nullable=False),
            ForeignKeyRef("employee_id", "employees", "id", on_delete="CASCADE", is_nullable=False)
        ],
        description="Immutable time tracking log for task delivery"
    ),
    "invoices": TableMeta(
        name="invoices",
        pk="id",
        display_col="invoice_number",
        category="Finance",
        has_soft_delete=True,
        fks=[
            ForeignKeyRef("project_id", "projects", "id", on_delete="RESTRICT", is_nullable=False)
        ],
        description="Financial billing document with compliance guardrails"
    ),
    "payments": TableMeta(
        name="payments",
        pk="id",
        display_col="transaction_ref",
        category="Finance",
        has_soft_delete=True,
        fks=[
            ForeignKeyRef("invoice_id", "invoices", "id", on_delete="CASCADE", is_nullable=False)
        ],
        description="Settled fiscal transaction linked to an invoice"
    ),
    "audit_attachments": TableMeta(
        name="audit_attachments",
        pk="id",
        display_col="filename",
        category="Evidence",
        has_soft_delete=True,
        fks=[], # Polymorphic attachment handled at application level
        description="Attached compliance documents (linked to project, task, or invoice)"
    )
}

# DDL Schema Script
DDL_SCRIPT = """
CREATE TABLE IF NOT EXISTS organizations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    code TEXT UNIQUE NOT NULL,
    tier TEXT DEFAULT 'ENTERPRISE',
    is_deleted INTEGER DEFAULT 0,
    deleted_at TEXT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS departments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    org_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    budget REAL DEFAULT 0.0,
    is_deleted INTEGER DEFAULT 0,
    deleted_at TEXT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(org_id) REFERENCES organizations(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS employees (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    dept_id INTEGER NOT NULL,
    manager_id INTEGER NULL,
    full_name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    role TEXT NOT NULL,
    salary REAL DEFAULT 0.0,
    is_deleted INTEGER DEFAULT 0,
    deleted_at TEXT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(dept_id) REFERENCES departments(id) ON DELETE CASCADE,
    FOREIGN KEY(manager_id) REFERENCES employees(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    dept_id INTEGER NOT NULL,
    lead_id INTEGER NULL,
    title TEXT NOT NULL,
    status TEXT DEFAULT 'IN_PROGRESS',
    is_deleted INTEGER DEFAULT 0,
    deleted_at TEXT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(dept_id) REFERENCES departments(id) ON DELETE CASCADE,
    FOREIGN KEY(lead_id) REFERENCES employees(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS project_assignments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL,
    employee_id INTEGER NOT NULL,
    assigned_role TEXT DEFAULT 'DEVELOPER',
    allocation_pct INTEGER DEFAULT 100,
    is_deleted INTEGER DEFAULT 0,
    deleted_at TEXT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY(employee_id) REFERENCES employees(id) ON DELETE CASCADE,
    UNIQUE(project_id, employee_id)
);

CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL,
    parent_task_id INTEGER NULL,
    assignee_id INTEGER NULL,
    title TEXT NOT NULL,
    priority TEXT DEFAULT 'MEDIUM',
    status TEXT DEFAULT 'TODO',
    is_deleted INTEGER DEFAULT 0,
    deleted_at TEXT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY(parent_task_id) REFERENCES tasks(id) ON DELETE CASCADE,
    FOREIGN KEY(assignee_id) REFERENCES employees(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS work_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    task_id INTEGER NOT NULL,
    employee_id INTEGER NOT NULL,
    hours_spent REAL NOT NULL,
    notes TEXT,
    logged_date TEXT DEFAULT CURRENT_DATE,
    is_deleted INTEGER DEFAULT 0,
    deleted_at TEXT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(task_id) REFERENCES tasks(id) ON DELETE CASCADE,
    FOREIGN KEY(employee_id) REFERENCES employees(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS invoices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL,
    invoice_number TEXT UNIQUE NOT NULL,
    amount REAL NOT NULL,
    status TEXT DEFAULT 'DRAFT',
    is_deleted INTEGER DEFAULT 0,
    deleted_at TEXT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    invoice_id INTEGER NOT NULL,
    transaction_ref TEXT UNIQUE NOT NULL,
    amount REAL NOT NULL,
    payment_method TEXT DEFAULT 'BANK_TRANSFER',
    is_deleted INTEGER DEFAULT 0,
    deleted_at TEXT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(invoice_id) REFERENCES invoices(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS audit_attachments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    parent_table TEXT NOT NULL,
    parent_id INTEGER NOT NULL,
    filename TEXT NOT NULL,
    file_size_kb INTEGER NOT NULL,
    checksum TEXT NOT NULL,
    is_deleted INTEGER DEFAULT 0,
    deleted_at TEXT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS cascade_audit_ledger (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    execution_id TEXT UNIQUE NOT NULL,
    policy TEXT NOT NULL,
    root_table TEXT NOT NULL,
    root_id INTEGER NOT NULL,
    affected_summary TEXT NOT NULL,
    snapshot_data TEXT NOT NULL,
    executed_by TEXT DEFAULT 'admin',
    reason TEXT,
    restored INTEGER DEFAULT 0,
    restored_at TEXT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_dept_org ON departments(org_id);
CREATE INDEX IF NOT EXISTS idx_emp_dept ON employees(dept_id);
CREATE INDEX IF NOT EXISTS idx_emp_mgr ON employees(manager_id);
CREATE INDEX IF NOT EXISTS idx_proj_dept ON projects(dept_id);
CREATE INDEX IF NOT EXISTS idx_proj_lead ON projects(lead_id);
CREATE INDEX IF NOT EXISTS idx_tasks_proj ON tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_parent ON tasks(parent_task_id);
CREATE INDEX IF NOT EXISTS idx_worklogs_task ON work_logs(task_id);
CREATE INDEX IF NOT EXISTS idx_invoices_proj ON invoices(project_id);
CREATE INDEX IF NOT EXISTS idx_payments_inv ON payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_audit_attach ON audit_attachments(parent_table, parent_id);
"""
