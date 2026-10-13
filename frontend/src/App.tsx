import { useState, useEffect } from 'react';
import type { SchemaGraph, TableInfo, IntegrityAudit } from './api';
import { api } from './api';
import { ParallaxHero } from './components/ParallaxHero';
import { IntuitiveGuide } from './components/IntuitiveGuide';
import { SchemaGraphView } from './components/SchemaGraphView';
import { DataExplorer } from './components/DataExplorer';
import { CascadeStudio } from './components/CascadeStudio';
import { AuditLedger } from './components/AuditLedger';
import { IntegrityDoctorView } from './components/IntegrityDoctorView';
import {
  Database, Table, History, Activity, RotateCcw, ShieldCheck, Heart
} from 'lucide-react';

export function App() {
  const [activeTab, setActiveTab] = useState<'graph' | 'data' | 'ledger' | 'doctor'>('graph');
  const [schemaGraph, setSchemaGraph] = useState<SchemaGraph | null>(null);
  const [tables, setTables] = useState<TableInfo[]>([]);
  const [selectedTable, setSelectedTable] = useState<string>('organizations');
  const [integrityAudit, setIntegrityAudit] = useState<IntegrityAudit | null>(null);

  // Modal target
  const [modalTarget, setModalTarget] = useState<{ table: string; id: number; label: string } | null>(null);

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      const [g, t, a] = await Promise.all([
        api.getSchemaGraph(),
        api.getTables(),
        api.getIntegrityAudit()
      ]);
      setSchemaGraph(g);
      setTables(t);
      setIntegrityAudit(a);
    } catch (err) {
      console.error('Initialization error:', err);
    }
  };

  const handleTableSelectedFromGraph = (tableName: string) => {
    if (tableName) {
      setSelectedTable(tableName);
      setActiveTab('data');
      const mainContent = document.getElementById('main-workspace');
      if (mainContent) {
        mainContent.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  const handleQuickSeed = async () => {
    if (!window.confirm('Сбросить базу данных и наполнить чистым корпоративным датасетом?')) return;
    try {
      await api.resetSeed('ENTERPRISE');
      await loadInitialData();
    } catch (err) {
      console.error(err);
    }
  };

  const openDefaultSimulator = () => {
    setModalTarget({
      table: 'departments',
      id: 1,
      label: 'Cloud Infrastructure & SRE'
    });
  };

  const scrollToWorkspace = () => {
    const mainContent = document.getElementById('main-workspace');
    if (mainContent) {
      mainContent.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const isHealthy = integrityAudit?.score === 100;

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Studio Top Navigation Bar */}
      <header
        style={{
          background: 'rgba(255, 255, 255, 0.92)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid var(--border-light)',
          position: 'sticky',
          top: 0,
          zIndex: 100,
          padding: '0 24px'
        }}
      >
        <div
          style={{
            maxWidth: 1400,
            margin: '0 auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            height: 56
          }}
        >
          {/* Brand Mark */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: 6,
                background: '#0f172a',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff'
              }}
            >
              <ShieldCheck size={16} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 15, fontWeight: 600, color: '#0f172a', letterSpacing: '-0.02em' }}>
                CascadeGuard
              </span>
              <span className="status-pill status-pill-neutral mono-text" style={{ fontSize: 10 }}>
                studio
              </span>
            </div>
            <div style={{ height: 16, width: 1, background: '#e2e8f0', margin: '0 4px' }} />
            <span style={{ fontSize: 12, color: '#64748b' }}>
              Relational Integrity & Cascade Engine
            </span>
          </div>

          {/* System Status & Actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button
              onClick={() => {
                setActiveTab('doctor');
                scrollToWorkspace();
              }}
              className={`status-pill ${isHealthy ? 'status-pill-emerald' : 'status-pill-rose'}`}
              style={{ cursor: 'pointer', padding: '4px 10px', fontSize: 12 }}
              title="Перейти к диагностике целостности"
            >
              <Heart size={12} />
              <span>Целостность: {integrityAudit?.score || 100}%</span>
            </button>

            <button
              className="btn-ui btn-ui-secondary"
              onClick={handleQuickSeed}
              title="Сбросить все таблицы к исходному корпоративному состоянию"
            >
              <RotateCcw size={13} color="#475569" /> Сбросить данные
            </button>
          </div>
        </div>
      </header>

      {/* Hero Console Summary */}
      <ParallaxHero
        onOpenSimulator={openDefaultSimulator}
        onExploreGraph={() => {
          setActiveTab('graph');
          scrollToWorkspace();
        }}
        healthScore={integrityAudit?.score || 100}
        totalTables={tables.length || 10}
      />

      {/* Main Workspace */}
      <div id="main-workspace" style={{ maxWidth: 1400, margin: '0 auto', padding: '0 24px 64px', width: '100%' }}>
        {/* Help & Architecture Reference */}
        <IntuitiveGuide />

        {/* Linear-Style Segmented Navigation */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 12,
            marginBottom: 20
          }}
        >
          <div className="segmented-nav">
            <button
              onClick={() => setActiveTab('graph')}
              className={`segmented-tab ${activeTab === 'graph' ? 'active' : ''}`}
            >
              <Database size={14} /> Граф зависимостей (DAG)
            </button>

            <button
              onClick={() => setActiveTab('data')}
              className={`segmented-tab ${activeTab === 'data' ? 'active' : ''}`}
            >
              <Table size={14} /> Таблицы данных
            </button>

            <button
              onClick={() => setActiveTab('ledger')}
              className={`segmented-tab ${activeTab === 'ledger' ? 'active' : ''}`}
            >
              <History size={14} /> Журнал аудита и откат
            </button>

            <button
              onClick={() => setActiveTab('doctor')}
              className={`segmented-tab ${activeTab === 'doctor' ? 'active' : ''}`}
            >
              <Activity size={14} /> Диагностика целостности
            </button>
          </div>

          <div style={{ fontSize: 12, color: '#64748b' }}>
            Схема базы: <span className="mono-text" style={{ color: '#0f172a', fontWeight: 600 }}>{tables.length}</span> таблиц
          </div>
        </div>

        {/* Tab Views */}
        <main>
          {activeTab === 'graph' && schemaGraph && (
            <SchemaGraphView
              graph={schemaGraph}
              selectedTable={selectedTable}
              onSelectTable={handleTableSelectedFromGraph}
            />
          )}

          {activeTab === 'data' && (
            <DataExplorer
              tables={tables}
              selectedTable={selectedTable}
              onSelectTable={setSelectedTable}
              onOpenCascadeModal={(table, id, label) => setModalTarget({ table, id, label })}
            />
          )}

          {activeTab === 'ledger' && (
            <AuditLedger onRestored={loadInitialData} />
          )}

          {activeTab === 'doctor' && (
            <IntegrityDoctorView onDatabaseMutated={loadInitialData} />
          )}
        </main>
      </div>

      {/* Cascade Studio Modal */}
      {modalTarget && (
        <CascadeStudio
          table={modalTarget.table}
          id={modalTarget.id}
          label={modalTarget.label}
          onClose={() => setModalTarget(null)}
          onExecutionComplete={loadInitialData}
        />
      )}

      {/* Studio Clean Footer */}
      <footer
        style={{
          borderTop: '1px solid var(--border-light)',
          padding: '16px 24px',
          background: '#ffffff',
          fontSize: 12,
          color: '#64748b',
          marginTop: 'auto'
        }}
      >
        <div
          style={{
            maxWidth: 1400,
            margin: '0 auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 12
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontWeight: 600, color: '#0f172a' }}>CascadeGuard Engine</span>
            <span>—</span>
            <span>Автоматический контроль ссылочной целостности и предотвращение появления записей-сирот</span>
          </div>

          <div className="mono-text" style={{ fontSize: 11, color: '#94a3b8' }}>
            SQLite 3.x WAL • PRAGMA foreign_keys = ON • ACID compliant
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
