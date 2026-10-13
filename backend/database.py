"""
CascadeGuard: Unified Database Connection & Configuration Manager
Supports:
1. PostgreSQL 16 (Primary / Default for DBeaver & Production)
   Host: 127.0.0.1 | Port: 5432 | DB: cascadeguard | User: postgres | Password: postgres
2. SQLite 3 WAL (Seamless Fallback if PostgreSQL is offline)
"""
import os
import sqlite3
from typing import Dict, Any, Optional
from contextlib import contextmanager

# PostgreSQL configuration
PG_HOST = os.environ.get("PGHOST", "127.0.0.1")
PG_PORT = int(os.environ.get("PGPORT", 5432))
PG_USER = os.environ.get("PGUSER", "postgres")
PG_PASSWORD = os.environ.get("PGPASSWORD", "postgres")
PG_DATABASE = os.environ.get("PGDATABASE", "cascadeguard")

# SQLite fallback path
SQLITE_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "cascade_guard.db")
DB_PATH = SQLITE_PATH

class PostgresRow(dict):
    """Unified Row wrapper supporting row['col'], row[0], and dict(row)."""
    def __init__(self, data: dict, columns: list):
        super().__init__(data)
        self._columns = columns
        self._values = [data[c] for c in columns]

    def __getitem__(self, key):
        if isinstance(key, int):
            return self._values[key]
        return super().__getitem__(key)

class PostgresCursorWrapper:
    def __init__(self, cursor):
        self._cursor = cursor
        self.lastrowid = None

    def execute(self, query: str, params=None):
        q_strip = query.strip().rstrip(';').upper()

        # Handle SQLite PRAGMA commands gracefully on PostgreSQL
        if q_strip.startswith("PRAGMA FOREIGN_KEYS"):
            return self
        if q_strip.startswith("PRAGMA FOREIGN_KEY_CHECK"):
            return self
        if q_strip.startswith("PRAGMA INTEGRITY_CHECK"):
            return self
        if q_strip.startswith("BEGIN IMMEDIATE"):
            return self

        # Translate SQLite dialect quirks to PostgreSQL
        norm_query = query.replace("datetime('now')", "NOW()").replace("DATETIME('NOW')", "NOW()")
        if params is not None:
            norm_query = norm_query.replace('?', '%s')
            return self._cursor.execute(norm_query, params)
        else:
            return self._cursor.execute(norm_query)

    def executescript(self, script: str):
        for stmt in script.split(';'):
            s = stmt.strip()
            if s:
                self.execute(s)
        return self

    def fetchone(self):
        if not self._cursor.description:
            return ("ok",) # Emulate successful pragma
        row = self._cursor.fetchone()
        if row is None:
            return None
        cols = [desc[0] for desc in self._cursor.description]
        return PostgresRow(row, cols)

    def fetchall(self):
        if not self._cursor.description:
            return [] # Emulate 0 violations for pragma checks
        rows = self._cursor.fetchall()
        if not rows:
            return []
        cols = [desc[0] for desc in self._cursor.description]
        return [PostgresRow(r, cols) for r in rows]

    @property
    def rowcount(self):
        return self._cursor.rowcount

    def __getattr__(self, name):
        return getattr(self._cursor, name)

class PostgresConnectionWrapper:
    def __init__(self, raw_conn):
        self._conn = raw_conn
        self.db_type = "POSTGRESQL"

    def cursor(self):
        try:
            from psycopg2.extras import RealDictCursor
            return PostgresCursorWrapper(self._conn.cursor(cursor_factory=RealDictCursor))
        except Exception:
            return PostgresCursorWrapper(self._conn.cursor())

    def commit(self):
        return self._conn.commit()

    def rollback(self):
        return self._conn.rollback()

    def close(self):
        return self._conn.close()

    def execute(self, query: str, params=None):
        cur = self.cursor()
        cur.execute(query, params)
        return cur

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        if exc_type is not None:
            self.rollback()
        else:
            self.commit()
        self.close()

def _ensure_pg_database_exists():
    """Connects to 'postgres' maintenance db and creates 'cascadeguard' if needed."""
    try:
        import psycopg2
        conn = psycopg2.connect(
            host=PG_HOST,
            port=PG_PORT,
            user=PG_USER,
            password=PG_PASSWORD,
            dbname="postgres",
            connect_timeout=3
        )
        conn.autocommit = True
        cur = conn.cursor()
        cur.execute(f"SELECT 1 FROM pg_database WHERE datname = '{PG_DATABASE}';")
        if not cur.fetchone():
            cur.execute(f"CREATE DATABASE {PG_DATABASE};")
        cur.close()
        conn.close()
    except Exception:
        pass

def get_connection(prefer_pg: bool = True, db_path: Optional[str] = None):
    """
    Returns unified connection object. Prefers PostgreSQL 16;
    gracefully falls back to SQLite if PostgreSQL server is offline.
    """
    if isinstance(prefer_pg, str):
        target_path = prefer_pg
        prefer_pg = False
    else:
        target_path = db_path or SQLITE_PATH

    if prefer_pg:
        try:
            import psycopg2
            _ensure_pg_database_exists()
            raw_conn = psycopg2.connect(
                host=PG_HOST,
                port=PG_PORT,
                user=PG_USER,
                password=PG_PASSWORD,
                dbname=PG_DATABASE,
                connect_timeout=3
            )
            return PostgresConnectionWrapper(raw_conn)
        except Exception as e:
            # Fall back to SQLite
            pass

    # SQLite connection
    conn = sqlite3.connect(target_path, timeout=10.0)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON;")
    conn.execute("PRAGMA journal_mode = WAL;")
    conn.execute("PRAGMA busy_timeout = 5000;")
    conn.execute("PRAGMA synchronous = NORMAL;")
    return conn

@contextmanager
def get_db_context():
    conn = get_connection()
    try:
        yield conn
    finally:
        conn.close()

def get_db_info() -> Dict[str, Any]:
    """Returns database connection parameters for DBeaver and UI status badges."""
    with get_connection() as conn:
        db_type = getattr(conn, "db_type", "SQLITE")
        if db_type == "POSTGRESQL":
            return {
                "engine": "PostgreSQL 16",
                "isPostgres": True,
                "host": PG_HOST,
                "port": PG_PORT,
                "database": PG_DATABASE,
                "user": PG_USER,
                "password": PG_PASSWORD,
                "dbeaverJdbcUrl": f"jdbc:postgresql://{PG_HOST}:{PG_PORT}/{PG_DATABASE}",
                "status": "ONLINE",
                "foreignKeyEnforcement": "ENGINE_LEVEL (ACID Cascades Active)"
            }
        else:
            return {
                "engine": "SQLite 3 WAL",
                "isPostgres": False,
                "host": "local file",
                "port": 0,
                "database": SQLITE_PATH,
                "user": "local",
                "password": "",
                "dbeaverJdbcUrl": f"jdbc:sqlite:{SQLITE_PATH}",
                "status": "FALLBACK_MODE",
                "foreignKeyEnforcement": "PRAGMA foreign_keys = ON"
            }
