export interface TableInfo {
  name: string;
  category: string;
  pk: string;
  displayCol: string;
  activeCount: number;
  softDeletedCount: number;
  totalCount: number;
  description: string;
}

export interface SchemaNode {
  id: string;
  label: string;
  category: string;
  pk: string;
  displayCol: string;
  description: string;
}

export interface SchemaEdge {
  id: string;
  source: string;
  target: string;
  fromCol: string;
  toCol: string;
  onDelete: string;
  isNullable: boolean;
  isCyclic: boolean;
}

export interface SchemaGraph {
  nodes: SchemaNode[];
  edges: SchemaEdge[];
}

export interface TreeNode {
  table: string;
  pk: number;
  label: string;
  depth: number;
  children: TreeNode[];
}

export interface FlatGraphNode {
  id: string;
  table: string;
  pk: number;
  label: string;
  depth: number;
  isRoot: boolean;
}

export interface FlatGraphEdge {
  source: string;
  target: string;
  type: string;
  fkCol: string;
}

export interface Violation {
  severity: 'CRITICAL_BLOCKER' | 'WARNING';
  table: string;
  pk: number;
  rule: string;
  message: string;
}

export interface CyclicUpdate {
  table: string;
  column: string;
  pk: number;
  current_val: number;
  action: string;
}

export interface AnalysisResult {
  root: {
    table: string;
    id: number;
    label: string;
  };
  policy: string;
  totalAffected: number;
  maxDepth: number;
  affectedCounts: Record<string, number>;
  impactedTables: string[];
  deletionOrder: string[];
  violations: Violation[];
  canProceed: boolean;
  cyclicEdgesToUnlink: number;
  cyclicUpdates: CyclicUpdate[];
  tree: TreeNode;
  graph: {
    nodes: FlatGraphNode[];
    edges: FlatGraphEdge[];
  };
  records: Record<string, any[]>;
}

export interface TraceStep {
  step: number;
  phase?: string;
  action: string;
  status?: string;
  timestamp: string;
}

export interface ExecutionResult {
  executionId: string;
  policy: string;
  rootTable: string;
  rootId: number;
  totalAffected: number;
  affectedSummary: Record<string, number>;
  durationMs: number;
  traceSteps: TraceStep[];
  integrityVerified: boolean;
  timestamp: string;
}

export interface RestoreResult {
  ledgerId: number;
  executionId: string;
  totalRestored: number;
  restoredCounts: Record<string, number>;
  durationMs: number;
  traceSteps: TraceStep[];
  timestamp: string;
}

export interface LedgerItem {
  id: number;
  execution_id: string;
  policy: string;
  root_table: string;
  root_id: number;
  affected_summary: string;
  executed_by: string;
  reason: string;
  restored: number;
  restored_at: string | null;
  created_at: string;
}

export interface IntegrityIssue {
  type: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  table: string;
  rowId?: number;
  parentTable?: string;
  fkIndex?: number;
  detail: string;
}

export interface IntegrityAudit {
  score: number;
  status: 'HEALTHY' | 'WARNING' | 'CRITICAL';
  physicalStatus: string;
  totalIssues: number;
  issues: IntegrityIssue[];
}

const API_BASE = '/api';

export const api = {
  async getSchemaGraph(): Promise<SchemaGraph> {
    const res = await fetch(`${API_BASE}/schema/graph`);
    if (!res.ok) throw new Error('Failed to load schema graph');
    return res.json();
  },

  async getTables(): Promise<TableInfo[]> {
    const res = await fetch(`${API_BASE}/schema/tables`);
    if (!res.ok) throw new Error('Failed to load schema tables');
    const data = await res.json();
    return data.tables;
  },

  async getTableData(table: string, showDeleted = false): Promise<{ table: string; primaryKey: string; displayCol: string; count: number; rows: any[] }> {
    const res = await fetch(`${API_BASE}/data/table/${table}?show_deleted=${showDeleted}`);
    if (!res.ok) throw new Error(`Failed to load data for ${table}`);
    return res.json();
  },

  async dryRunCascade(table: string, id: number, policy: string): Promise<AnalysisResult> {
    const res = await fetch(`${API_BASE}/cascade/dry-run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ table, id, policy })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'Dry run simulation failed');
    }
    return res.json();
  },

  async executeCascade(table: string, id: number, policy: string, reason: string, overrideViolations = false): Promise<ExecutionResult> {
    const res = await fetch(`${API_BASE}/cascade/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ table, id, policy, reason, overrideViolations })
    });
    if (!res.ok) {
      const err = await res.json();
      const msg = typeof err.detail === 'object' ? err.detail.message : err.detail;
      throw new Error(msg || 'Cascade execution failed');
    }
    return res.json();
  },

  async getLedgerHistory(): Promise<LedgerItem[]> {
    const res = await fetch(`${API_BASE}/ledger/history`);
    if (!res.ok) throw new Error('Failed to load audit ledger');
    const data = await res.json();
    return data.ledger;
  },

  async restoreLedger(ledgerId: number): Promise<RestoreResult> {
    const res = await fetch(`${API_BASE}/ledger/${ledgerId}/restore`, {
      method: 'POST'
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'Restoration failed');
    }
    return res.json();
  },

  async getIntegrityAudit(): Promise<IntegrityAudit> {
    const res = await fetch(`${API_BASE}/integrity/audit`);
    if (!res.ok) throw new Error('Failed to load integrity audit');
    return res.json();
  },

  async injectChaos(): Promise<any> {
    const res = await fetch(`${API_BASE}/integrity/chaos`, { method: 'POST' });
    if (!res.ok) throw new Error('Failed to inject chaos orphan');
    return res.json();
  },

  async repairDatabase(): Promise<any> {
    const res = await fetch(`${API_BASE}/integrity/repair`, { method: 'POST' });
    if (!res.ok) throw new Error('Failed to repair database');
    return res.json();
  },

  async resetSeed(preset = 'ENTERPRISE'): Promise<any> {
    const res = await fetch(`${API_BASE}/seed/reset?preset=${preset}`, { method: 'POST' });
    if (!res.ok) throw new Error('Failed to reset and seed database');
    return res.json();
  },

  async getDbInfo(): Promise<DbInfo> {
    const res = await fetch(`${API_BASE}/system/db-info`);
    if (!res.ok) throw new Error('Failed to load database engine info');
    return res.json();
  }
};

export interface DbInfo {
  engine: string;
  isPostgres: boolean;
  host: string;
  port: number;
  database: string;
  user: string;
  password?: string;
  dbeaverJdbcUrl: string;
  status: string;
  foreignKeyEnforcement: string;
}
