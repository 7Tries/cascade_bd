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
      {/* Soft Friendly Header */}
      <header
        style={{
          background: 'rgba(255, 255, 255, 0.85)',
          backdropFilter: 'blur(16px)',
          borderBottom: '1px solid #e2e8f0',
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
            height: 68
          }}
        >
          {/* Logo & Brand in Soft Style */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 12,
                background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                boxShadow: '0 4px 12px rgba(99, 102, 241, 0.25)'
              }}
            >
              <ShieldCheck size={22} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 18, fontWeight: 800, color: '#1e293b' }}>
                  CascadeGuard
                </span>
                <span className="badge-soft badge-soft-indigo">Безопасный каскад</span>
              </div>
              <div style={{ fontSize: 11, color: '#64748b' }}>
                Контроль физической и логической целостности базы данных
              </div>
            </div>
          </div>

          {/* Right Action Pills */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              onClick={() => {
                setActiveTab('doctor');
                scrollToWorkspace();
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 14px',
                borderRadius: 9999,
                background: isHealthy ? '#ecfdf5' : '#fff1f2',
                border: `1px solid ${isHealthy ? '#a7f3d0' : '#fecdd3'}`,
                color: isHealthy ? '#059669' : '#e11d48',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer'
              }}
              title="Нажмите для открытия диагностики"
            >
              <Heart size={14} />
              <span>Здоровье базы: {integrityAudit?.score || 100}%</span>
            </div>

            <button
              className="btn-soft btn-soft-secondary"
              onClick={handleQuickSeed}
              style={{ fontSize: 12, padding: '7px 14px' }}
            >
              <RotateCcw size={13} /> Сбросить данные
            </button>
          </div>
        </div>
      </header>

      {/* Hero Welcome Banner */}
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
      <div id="main-workspace" style={{ maxWidth: 1400, margin: '0 auto', padding: '0 24px 64px', width: '100%' }}>
        {/* Intuitive Guide Component */}
        <IntuitiveGuide />

        {/* Navigation Tabs Bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 12,
            marginBottom: 22,
            padding: '6px',
            background: 'rgba(255, 255, 255, 0.7)',
            backdropFilter: 'blur(10px)',
            borderRadius: 16,
            border: '1px solid #e2e8f0'
          }}
        >
          <nav style={{ display: 'flex', alignItems: 'center', gap: 6, overflowX: 'auto' }}>
            <button
              onClick={() => setActiveTab('graph')}
              className={`nav-pill ${activeTab === 'graph' ? 'active' : ''}`}
            >
              <Database size={15} /> Интерактивный граф связей
            </button>

            <button
              onClick={() => setActiveTab('data')}
              className={`nav-pill ${activeTab === 'data' ? 'active' : ''}`}
            >
              <Table size={15} /> Таблицы данных
            </button>

            <button
              onClick={() => setActiveTab('ledger')}
              className={`nav-pill ${activeTab === 'ledger' ? 'active' : ''}`}
            >
              <History size={15} /> Журнал аудита и откат
            </button>

            <button
              onClick={() => setActiveTab('doctor')}
              className={`nav-pill ${activeTab === 'doctor' ? 'active' : ''}`}
            >
              <Activity size={15} /> Диагностика базы
            </button>
          </nav>

          <div style={{ fontSize: 12, color: '#64748b', paddingRight: 12, fontWeight: 500 }}>
            Таблиц в структуре: <strong style={{ color: '#1e293b' }}>{tables.length}</strong>
          </div>
        </div>

        {/* Tab Content */}
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

      {/* Friendly Soft Footer */}
      <footer
        style={{
          borderTop: '1px solid #e2e8f0',
          padding: '24px',
          background: '#ffffff',
          fontSize: 13,
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
            <strong style={{ color: '#1e293b' }}>CascadeGuard</strong>
            <span>— Интеллектуальное каскадное удаление с защитой базы данных</span>
          </div>

          <div style={{ fontSize: 12, color: '#94a3b8' }}>
            Поддержка физической (PRAGMA foreign_keys = ON) и логической целостности
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
