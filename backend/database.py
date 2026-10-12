"""
CascadeGuard: Database Connection & Configuration Manager
Enforces SQLite physical integrity pragmas:
- foreign_keys = ON
- journal_mode = WAL
- busy_timeout = 5000
- synchronous = NORMAL
"""
import os
import sqlite3
from contextlib import contextmanager

DB_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "cascade_guard.db")

def get_connection(db_path: str = DB_PATH) -> sqlite3.Connection:
    conn = sqlite3.connect(db_path, timeout=10.0)
    conn.row_factory = sqlite3.Row
    # Enforce physical referential integrity strictly
    conn.execute("PRAGMA foreign_keys = ON;")
    conn.execute("PRAGMA journal_mode = WAL;")
    conn.execute("PRAGMA busy_timeout = 5000;")
    conn.execute("PRAGMA synchronous = NORMAL;")
    return conn

@contextmanager
def get_db_context(db_path: str = DB_PATH):
    conn = get_connection(db_path)
    try:
        yield conn
    finally:
        conn.close()
