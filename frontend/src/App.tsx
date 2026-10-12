import { useState, useEffect } from 'react';
import type { SchemaGraph, TableInfo, IntegrityAudit } from './api';
import { api } from './api';
import { ParallaxHero } from './components/ParallaxHero';
import { SchemaGraphView } from './components/SchemaGraphView';
import { DataExplorer } from './components/DataExplorer';
import { CascadeStudio } from './components/CascadeStudio';
import { AuditLedger } from './components/AuditLedger';
import { IntegrityDoctorView } from './components/IntegrityDoctorView';
import {
  Database, Table, History, Activity, RotateCcw
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
      // Smooth scroll down to data table
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

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#000000' }}>
      {/* Editorial Top Navbar inspired by Reference */}
      <header
        style={{
          background: 'rgba(0, 0, 0, 0.92)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid var(--border-subtle)',
          position: 'sticky',
          top: 0,
          zIndex: 100,
          padding: '0 28px'
        }}
      >
        <div
          style={{
            maxWidth: 1400,
            margin: '0 auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            height: 64
          }}
        >
          {/* Logo & Brand in Condensed Grotesque */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <span
              style={{
                fontFamily: 'var(--font-headline)',
                fontSize: 24,
                fontWeight: 900,
                letterSpacing: '-0.02em',
                color: '#ffffff',
                textTransform: 'uppercase'
              }}
            >
              CASCADE GUARD
            </span>
            <span className="mono-tag" style={{ color: 'var(--text-muted)' }}>
              [ ACID КАСКАД / SQLITE ]
            </span>
          </div>

          {/* Right Action Pills */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button
              className="pill-btn pill-btn-white"
              onClick={() => {
                setActiveTab('doctor');
                scrollToWorkspace();
              }}
            >
              <Activity size={13} /> АУДИТ БАЗЫ
            </button>

            <button
              className="pill-btn pill-btn-yellow"
              onClick={handleQuickSeed}
            >
              <RotateCcw size={13} /> СБРОСИТЬ СЕМЕНА
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section with Parallax Effect & Swipe Gesture */}
      <ParallaxHero
        onOpenSimulator={openDefaultSimulator}
        onExploreGraph={() => {
          setActiveTab('graph');
          scrollToWorkspace();
        }}
        healthScore={integrityAudit?.score || 100}
        totalTables={tables.length || 10}
      />

      {/* Workspace Section */}
      <div id="main-workspace" style={{ background: '#020202', borderTop: '1px solid var(--border-subtle)' }}>
        {/* Navigation Tabs Bar */}
        <div style={{ borderBottom: '1px solid var(--border-subtle)', padding: '16px 28px', background: '#000000' }}>
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
            <nav style={{ display: 'flex', alignItems: 'center', gap: 8, overflowX: 'auto' }}>
              <button
                onClick={() => setActiveTab('graph')}
                className={`nav-tab-btn ${activeTab === 'graph' ? 'active' : ''}`}
              >
                <Database size={13} /> [ 01 ] ГРАФ ЗАВИСИМОСТЕЙ
              </button>

              <button
                onClick={() => setActiveTab('data')}
                className={`nav-tab-btn ${activeTab === 'data' ? 'active' : ''}`}
              >
                <Table size={13} /> [ 02 ] ПРОВОДНИК ТАБЛИЦ
              </button>

              <button
                onClick={() => setActiveTab('ledger')}
                className={`nav-tab-btn ${activeTab === 'ledger' ? 'active' : ''}`}
              >
                <History size={13} /> [ 03 ] ЖУРНАЛ АУДИТА И ОТКАТ
              </button>

              <button
                onClick={() => setActiveTab('doctor')}
                className={`nav-tab-btn ${activeTab === 'doctor' ? 'active' : ''}`}
              >
                <Activity size={13} /> [ 04 ] ДОКТОР ЦЕЛОСТНОСТИ
              </button>
            </nav>

            <div className="mono-tag" style={{ color: 'var(--text-muted)' }}>
              [ ТАБЛИЦ В СИСТЕМЕ: {tables.length} ]
            </div>
          </div>
        </div>

        {/* Tab Content */}
        <main style={{ maxWidth: 1400, margin: '0 auto', padding: '36px 28px 64px', width: '100%' }}>
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

      {/* Editorial Footer */}
      <footer
        style={{
          borderTop: '1px solid var(--border-subtle)',
          padding: '24px 28px',
          background: '#000000',
          fontSize: 12,
          color: 'var(--text-muted)'
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
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontFamily: 'var(--font-headline)', color: '#ffffff', fontSize: 16 }}>
              CASCADE GUARD
            </span>
            <span>— Система каскадного удаления с сохранением логической и физической целостности БД</span>
          </div>

          <div className="mono-tag">
            [ SQLITE WAL / PRAGMA FOREIGN_KEYS = ON / TOPOLOGICAL SORT ]
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
