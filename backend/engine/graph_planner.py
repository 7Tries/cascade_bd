"""
CascadeGuard: Graph Planner & Topological Engine
Constructs the schema dependency graph, detects cycles using Tarjan's SCC algorithm,
and determines exact topological execution orders for:
- Cascade Deletion (Leaves-first: bottom-up)
- Snapshot Restoration (Parents-first: top-down)
- Cyclic edge severance planning
"""
from typing import Dict, List, Set, Tuple, Any
from collections import defaultdict, deque
from schema_defs import SCHEMA_TABLES, ForeignKeyRef

class GraphPlanner:
    def __init__(self):
        self.tables = SCHEMA_TABLES
        # parent -> list of (child_table, fk_ref)
        self.children_map: Dict[str, List[Tuple[str, ForeignKeyRef]]] = defaultdict(list)
        # child -> list of (parent_table, fk_ref)
        self.parents_map: Dict[str, List[Tuple[str, ForeignKeyRef]]] = defaultdict(list)
        self._build_maps()

    def _build_maps(self):
        for child_table, meta in self.tables.items():
            for fk in meta.fks:
                parent_table = fk.to_table
                self.children_map[parent_table].append((child_table, fk))
                self.parents_map[child_table].append((parent_table, fk))

    def get_schema_graph(self) -> Dict[str, Any]:
        """Returns node and edge definitions formatted for frontend visualizer."""
        nodes = []
        for name, meta in self.tables.items():
            nodes.append({
                "id": name,
                "label": name,
                "category": meta.category,
                "pk": meta.pk,
                "displayCol": meta.display_col,
                "description": meta.description
            })

        edges = []
        edge_id = 1
        for parent_table, children in self.children_map.items():
            for child_table, fk in children:
                edges.append({
                    "id": f"e{edge_id}",
                    "source": parent_table,
                    "target": child_table,
                    "fromCol": fk.from_col,
                    "toCol": fk.to_col,
                    "onDelete": fk.on_delete,
                    "isNullable": fk.is_nullable,
                    "isCyclic": fk.is_cyclic
                })
                edge_id += 1

        # Also add polymorphic edge for audit_attachments
        for target in ["projects", "tasks", "invoices"]:
            edges.append({
                "id": f"e{edge_id}",
                "source": target,
                "target": "audit_attachments",
                "fromCol": "parent_id",
                "toCol": "id",
                "onDelete": "CASCADE (Virtual)",
                "isNullable": False,
                "isCyclic": False
            })
            edge_id += 1

        return {"nodes": nodes, "edges": edges}

    def detect_cycles(self) -> List[List[str]]:
        """
        Uses Tarjan's Strongly Connected Components algorithm
        to detect directed cycles in table dependencies.
        """
        index = 0
        indices = {}
        lowlinks = {}
        on_stack = set()
        stack = []
        sccs = []

        # Graph where edge is child -> parent
        graph = defaultdict(list)
        for child, parents in self.parents_map.items():
            for p, _ in parents:
                graph[child].append(p)

        def strongconnect(node):
            nonlocal index
            indices[node] = index
            lowlinks[node] = index
            index += 1
            stack.append(node)
            on_stack.add(node)

            for neighbor in graph[node]:
                if neighbor not in indices:
                    strongconnect(neighbor)
                    lowlinks[node] = min(lowlinks[node], lowlinks[neighbor])
                elif neighbor in on_stack:
                    lowlinks[node] = min(lowlinks[node], indices[neighbor])

            if lowlinks[node] == indices[node]:
                current_scc = []
                while True:
                    w = stack.pop()
                    on_stack.remove(w)
                    current_scc.append(w)
                    if w == node:
                        break
                if len(current_scc) > 1 or (len(current_scc) == 1 and node in graph[node]):
                    sccs.append(current_scc)

        for node in self.tables.keys():
            if node not in indices:
                strongconnect(node)

        return sccs

    def get_deletion_order(self, impacted_tables: Set[str]) -> List[str]:
        """
        Calculates bottom-up (leaves first) topological deletion order
        for the set of impacted tables, ignoring cyclic back-edges which
        are handled via phase-1 nullification.
        """
        # Graph where edge is parent -> child (so in-degree of child counts parents)
        # For deletion: children must be deleted before parents.
        # So dependency is: child depends on nothing, parent depends on child being deleted first.
        # Edge: Child -> Parent
        adj = defaultdict(set)
        in_degree = defaultdict(int)

        for table in impacted_tables:
            in_degree[table] = 0

        for child in impacted_tables:
            for parent, fk in self.parents_map[child]:
                if parent in impacted_tables and parent != child and not fk.is_cyclic:
                    # child must be deleted before parent => child -> parent
                    if parent not in adj[child]:
                        adj[child].add(parent)
                        in_degree[parent] += 1

        # Kahn's algorithm
        queue = deque([t for t in impacted_tables if in_degree[t] == 0])
        deletion_order = []

        while queue:
            node = queue.popleft()
            deletion_order.append(node)
            for parent in adj[node]:
                in_degree[parent] -= 1
                if in_degree[parent] == 0:
                    queue.append(parent)

        # In case of remaining nodes due to cycles, append them
        remaining = [t for t in impacted_tables if t not in deletion_order]
        deletion_order.extend(remaining)

        # Always ensure audit_attachments deleted before their parents if present
        if "audit_attachments" in impacted_tables:
            deletion_order.remove("audit_attachments")
            deletion_order.insert(0, "audit_attachments")

        return deletion_order

    def get_restoration_order(self, snapshot_tables: Set[str]) -> List[str]:
        """
        Calculates top-down (parents first) topological restoration order.
        """
        deletion_order = self.get_deletion_order(snapshot_tables)
        # Restore is reverse of deletion order
        restore_order = list(reversed(deletion_order))
        return restore_order
