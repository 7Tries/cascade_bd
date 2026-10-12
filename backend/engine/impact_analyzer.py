"""
CascadeGuard: Impact Analyzer & Dry-Run Simulator
Performs recursive graph traversal across relational and polymorphic entities,
identifying the exact impact tree, row counts, depth levels, cyclic edges,
and logical invariant compliance violations before any deletion occurs.
"""
from typing import Dict, List, Set, Any, Tuple, Optional
import sqlite3
from schema_defs import SCHEMA_TABLES, ForeignKeyRef
from engine.graph_planner import GraphPlanner

class ImpactNode:
    def __init__(self, table: str, pk: int, label: str, depth: int, data: Dict[str, Any]):
        self.table = table
        self.pk = pk
        self.label = label
        self.depth = depth
        self.data = data
        self.children: List['ImpactNode'] = []

    def to_dict(self) -> Dict[str, Any]:
        return {
            "table": self.table,
            "pk": self.pk,
            "label": str(self.label),
            "depth": self.depth,
            "children": [c.to_dict() for c in self.children]
        }

class ImpactAnalyzer:
    def __init__(self, planner: GraphPlanner):
        self.planner = planner
        self.tables = SCHEMA_TABLES

    def analyze(self, conn: sqlite3.Connection, root_table: str, root_id: int, policy: str = "HARD_CASCADE") -> Dict[str, Any]:
        """
        Simulates cascade deletion starting from (root_table, root_id).
        Returns impact tree, total counts, logical violations, and planned SQL phases.
        """
        if root_table not in self.tables:
            raise ValueError(f"Unknown root table: {root_table}")

        # Check root exists
        meta = self.tables[root_table]
        cur = conn.cursor()
        cur.execute(f"SELECT * FROM {root_table} WHERE {meta.pk} = ?", (root_id,))
        root_row = cur.fetchone()
        if not root_row:
            raise ValueError(f"Record {root_table} with ID {root_id} not found")

        root_dict = dict(root_row)
        root_label = root_dict.get(meta.display_col, f"ID {root_id}")

        visited: Dict[str, Set[int]] = {t: set() for t in self.tables}
        records_by_table: Dict[str, List[Dict[str, Any]]] = {t: [] for t in self.tables}
        tree_nodes_flat: List[Dict[str, Any]] = []
        tree_edges: List[Dict[str, Any]] = []
        violations: List[Dict[str, Any]] = []
        cyclic_updates: List[Dict[str, Any]] = []

        root_node = ImpactNode(root_table, root_id, root_label, 0, root_dict)
        visited[root_table].add(root_id)
        records_by_table[root_table].append(root_dict)
        tree_nodes_flat.append({
            "id": f"{root_table}_{root_id}",
            "table": root_table,
            "pk": root_id,
            "label": str(root_label),
            "depth": 0,
            "isRoot": True
        })

        # Queue for BFS traversal: (table, id, depth, parent_node_ref, parent_node_key)
        queue = [(root_table, root_id, 0, root_node, f"{root_table}_{root_id}")]
        max_depth = 0

        while queue:
            curr_table, curr_id, curr_depth, parent_node, parent_key = queue.pop(0)
            max_depth = max(max_depth, curr_depth)

            # 1. Check schema child tables
            child_refs = self.planner.children_map.get(curr_table, [])
            for child_table, fk in child_refs:
                child_meta = self.tables[child_table]
                # Query child rows
                sql = f"SELECT * FROM {child_table} WHERE {fk.from_col} = ?"
                cur.execute(sql, (curr_id,))
                child_rows = cur.fetchall()

                for row in child_rows:
                    row_dict = dict(row)
                    cid = row_dict[child_meta.pk]

                    # Detect if self-referential or cyclic edge
                    if fk.is_cyclic:
                        cyclic_updates.append({
                            "table": child_table,
                            "column": fk.from_col,
                            "pk": cid,
                            "current_val": curr_id,
                            "action": "SET_NULL_BEFORE_CASCADE"
                        })

                    if cid not in visited[child_table]:
                        visited[child_table].add(cid)
                        records_by_table[child_table].append(row_dict)
                        clabel = row_dict.get(child_meta.display_col, f"ID {cid}")
                        cnode = ImpactNode(child_table, cid, clabel, curr_depth + 1, row_dict)
                        parent_node.children.append(cnode)

                        node_key = f"{child_table}_{cid}"
                        tree_nodes_flat.append({
                            "id": node_key,
                            "table": child_table,
                            "pk": cid,
                            "label": str(clabel),
                            "depth": curr_depth + 1,
                            "isRoot": False
                        })
                        tree_edges.append({
                            "source": parent_key,
                            "target": node_key,
                            "type": "FK_CASCADE",
                            "fkCol": fk.from_col
                        })

                        queue.append((child_table, cid, curr_depth + 1, cnode, node_key))

            # 2. Check polymorphic audit_attachments
            if curr_table in ["projects", "tasks", "invoices"]:
                cur.execute(
                    "SELECT * FROM audit_attachments WHERE parent_table = ? AND parent_id = ?",
                    (curr_table, curr_id)
                )
                att_rows = cur.fetchall()
                for arow in att_rows:
                    adict = dict(arow)
                    aid = adict["id"]
                    if aid not in visited["audit_attachments"]:
                        visited["audit_attachments"].add(aid)
                        records_by_table["audit_attachments"].append(adict)
                        anode = ImpactNode("audit_attachments", aid, adict["filename"], curr_depth + 1, adict)
                        parent_node.children.append(anode)

                        node_key = f"audit_attachments_{aid}"
                        tree_nodes_flat.append({
                            "id": node_key,
                            "table": "audit_attachments",
                            "pk": aid,
                            "label": adict["filename"],
                            "depth": curr_depth + 1,
                            "isRoot": False
                        })
                        tree_edges.append({
                            "source": parent_key,
                            "target": node_key,
                            "type": "ATTACHMENT_CASCADE",
                            "fkCol": "parent_id"
                        })

        # Check Logical Integrity Invariants on the affected records
        for inv_row in records_by_table["invoices"]:
            inv_status = inv_row.get("status")
            if inv_status in ["PAID", "LOCKED_AUDIT"]:
                violations.append({
                    "severity": "CRITICAL_BLOCKER",
                    "table": "invoices",
                    "pk": inv_row["id"],
                    "rule": "FINANCIAL_COMPLIANCE_LOCK",
                    "message": f"Invoice #{inv_row['invoice_number']} is {inv_status}. Statutory compliance prevents cascade deletion without explicit override authorization."
                })

        for proj_row in records_by_table["projects"]:
            if proj_row.get("status") == "LOCKED":
                violations.append({
                    "severity": "WARNING",
                    "table": "projects",
                    "pk": proj_row["id"],
                    "rule": "PROJECT_LOCKED_STATUS",
                    "message": f"Project '{proj_row['title']}' is marked as LOCKED."
                })

        # Summary calculations
        affected_counts = {t: len(records) for t, records in records_by_table.items() if len(records) > 0}
        total_records = sum(affected_counts.values())
        impacted_tables = set(affected_counts.keys())

        # Determine topological deletion sequence
        deletion_order = self.planner.get_deletion_order(impacted_tables)

        return {
            "root": {
                "table": root_table,
                "id": root_id,
                "label": str(root_label)
            },
            "policy": policy,
            "totalAffected": total_records,
            "maxDepth": max_depth,
            "affectedCounts": affected_counts,
            "impactedTables": list(impacted_tables),
            "deletionOrder": deletion_order,
            "violations": violations,
            "canProceed": len([v for v in violations if v["severity"] == "CRITICAL_BLOCKER"]) == 0,
            "cyclicEdgesToUnlink": len(cyclic_updates),
            "cyclicUpdates": cyclic_updates,
            "tree": root_node.to_dict(),
            "graph": {
                "nodes": tree_nodes_flat,
                "edges": tree_edges
            },
            "records": records_by_table
        }
