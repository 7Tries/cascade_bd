import React, { useState, useEffect } from 'react';
import type { IntegrityAudit } from '../api';
import { api } from '../api';
import {
  Activity, ShieldCheck, Bug, Wrench, RotateCcw,
  CheckCircle, Database, Server, RefreshCw
} from 'lucide-react';

interface IntegrityDoctorViewProps {
  onDatabaseMutated: () => void;
}

export const IntegrityDoctorView: React.FC<IntegrityDoctorViewProps> = ({ onDatabaseMutated }) => {
  const [audit, setAudit] = useState<IntegrityAudit | null>(null);
  const [loading, setLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  useEffect(() => {
    runAudit();
  }, []);

  const runAudit = async () => {
    setLoading(true);
    setActionMessage(null);
    try {
      const data = await api.getIntegrityAudit();
      setAudit(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleInjectChaos = async () => {
    setLoading(true);
    try {
      const res = await api.injectChaos();
      setActionMessage(`Хаос-тест: ${res.message}`);
      await runAudit();
      onDatabaseMutated();
    } catch (err: any) {
      setActionMessage(`Ошибка хаос-теста: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleRepair = async () => {
    setLoading(true);
    try {
      const res = await api.repairDatabase();
      setActionMessage(res.message);
      await runAudit();
      onDatabaseMutated();
    } catch (err: any) {
      setActionMessage(`Ошибка восстановления: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleResetSeed = async () => {
    if (!window.confirm('Сбросить базу данных и наполнить чистым корпоративным датасетом?')) return;
    setLoading(true);
    try {
      const res = await api.resetSeed('ENTERPRISE');
      setActionMessage(`База данных успешно сброшена и наполнена (${res.totalRows} строк).`);
      await runAudit();
      onDatabaseMutated();
    } catch (err: any) {
      setActionMessage(`Ошибка сброса: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const isHealthy = audit?.score === 100;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Header Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontSize: 16, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8, color: '#0f172a' }}>
            <Activity size={16} color={isHealthy ? '#059669' : '#dc2626'} />
            Диагностика физической и логической целостности
          </h2>
          <p style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
            Контроль страниц SQLite B-Tree, целостности внешних ключей и соблюдения инвариантов бизнес-логики.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <button className="btn-ui btn-ui-secondary" onClick={runAudit} disabled={loading}>
            <RefreshCw className={loading ? 'animate-spin' : ''} size={13} /> Повторный аудит
          </button>
          <button className="btn-ui btn-ui-secondary" onClick={handleResetSeed} disabled={loading}>
            <RotateCcw size={13} /> Перезаполнить БД
          </button>
        </div>
      </div>

      {actionMessage && (
        <div
          className="animate-enter"
          style={{
            padding: '10px 14px',
            background: '#fffbeb',
            border: '1px solid #fde68a',
            borderRadius: 8,
            fontSize: 12,
            color: '#b45309'
          }}
        >
          {actionMessage}
        </div>
      )}

      {/* Metrics Grid */}
      {audit && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
          {/* Integrity Score */}
          <div
            className="studio-card"
            style={{
              padding: 18,
              borderTop: `3px solid ${isHealthy ? '#059669' : '#dc2626'}`,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between'
            }}
          >
            <div>
              <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Индекс целостности
              </div>
              <div
                className="mono-text"
                style={{
                  fontSize: 32,
                  fontWeight: 700,
                  color: isHealthy ? '#059669' : '#dc2626',
                  marginTop: 4
                }}
              >
                {audit.score}%
              </div>
            </div>
            <div style={{ marginTop: 12 }}>
              <span className={`status-pill ${isHealthy ? 'status-pill-emerald' : 'status-pill-rose'}`}>
                {isHealthy ? 'Норма' : 'Аномалии'} ({audit.totalIssues} проблем)
              </span>
            </div>
          </div>

          {/* Physical Storage */}
          <div className="studio-card" style={{ padding: 18, borderTop: '3px solid #2563eb' }}>
            <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Физическое хранилище B-Tree
            </div>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#0f172a', marginTop: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Server size={15} color="#2563eb" />
              PRAGMA integrity_check
            </div>
            <div style={{ marginTop: 16 }}>
              <span className={`status-pill ${audit.physicalStatus === 'OK' ? 'status-pill-emerald' : 'status-pill-rose'}`}>
                Страницы: {audit.physicalStatus}
              </span>
            </div>
          </div>

          {/* Foreign Keys */}
          <div className="studio-card" style={{ padding: 18, borderTop: '3px solid #059669' }}>
            <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Контроль внешних ключей
            </div>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#0f172a', marginTop: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
              <ShieldCheck size={15} color="#059669" />
              PRAGMA foreign_key_check
            </div>
            <div style={{ marginTop: 16 }}>
              <span className={`status-pill ${audit.issues.filter(i => i.type === 'ORPHANED_FOREIGN_KEY').length === 0 ? 'status-pill-emerald' : 'status-pill-rose'}`}>
                {audit.issues.filter(i => i.type === 'ORPHANED_FOREIGN_KEY').length === 0 ? '0 сиротских FK' : `${audit.issues.filter(i => i.type === 'ORPHANED_FOREIGN_KEY').length} сломанных FK`}
              </span>
            </div>
          </div>

          {/* Business Invariants */}
          <div className="studio-card" style={{ padding: 18, borderTop: '3px solid #d97706' }}>
            <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Инварианты бизнес-логики
            </div>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#0f172a', marginTop: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Database size={15} color="#d97706" />
              Полиморфные связи
            </div>
            <div style={{ marginTop: 16 }}>
              <span className={`status-pill ${audit.issues.filter(i => i.type !== 'ORPHANED_FOREIGN_KEY').length === 0 ? 'status-pill-emerald' : 'status-pill-amber'}`}>
                {audit.issues.filter(i => i.type !== 'ORPHANED_FOREIGN_KEY').length === 0 ? '100% инвариантов' : `${audit.issues.filter(i => i.type !== 'ORPHANED_FOREIGN_KEY').length} предупреждений`}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Stress/Chaos Testing Suite */}
      <div className="studio-card" style={{ padding: 18, background: '#f8fafc' }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 4, color: '#0f172a' }}>
          Тестирование устойчивости и авто-восстановление (Chaos Mode)
        </h3>
        <p style={{ fontSize: 12, color: '#64748b', marginBottom: 14, maxWidth: 840, lineHeight: 1.45 }}>
          Намеренное создание записей-сирот для проверки диагностического сканера. Алгоритм восстановления автоматически выявляет нарушенные связи и производит очистку сиротских записей.
        </p>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="btn-ui btn-ui-danger" onClick={handleInjectChaos} disabled={loading}>
            <Bug size={13} /> Симулировать сбой (Хаос-тест)
          </button>

          <button className="btn-ui btn-ui-primary" onClick={handleRepair} disabled={loading || isHealthy}>
            <Wrench size={13} /> Автоматически восстановить базу
          </button>
        </div>
      </div>

      {/* Diagnostic Findings */}
      <div className="studio-card" style={{ padding: 18 }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: '#0f172a' }}>
          Диагностический отчет ({audit?.issues.length || 0} аномалий)
        </h3>

        {audit?.issues.length === 0 ? (
          <div style={{ padding: 28, textAlign: 'center', color: '#059669' }}>
            <CheckCircle size={32} style={{ margin: '0 auto 8px', color: '#059669' }} />
            <p style={{ fontWeight: 600, fontSize: 14, color: '#0f172a' }}>Целостность базы данных подтверждена</p>
            <p style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
              Все внешние ключи валидны, B-Tree страницы SQLite без повреждений, сиротских записей не обнаружено.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {audit?.issues.map((issue, idx) => (
              <div
                key={idx}
                style={{
                  padding: '10px 14px',
                  background: '#f8fafc',
                  border: '1px solid var(--border-light)',
                  borderRadius: 6,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 10
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className={`status-pill ${issue.severity === 'CRITICAL' ? 'status-pill-rose' : (issue.severity === 'HIGH' ? 'status-pill-amber' : 'status-pill-neutral')} mono-text`} style={{ fontSize: 10 }}>
                    {issue.type}
                  </span>
                  <span style={{ fontSize: 12, color: '#0f172a' }}>{issue.detail}</span>
                </div>

                <span className="mono-text" style={{ fontSize: 11, color: '#64748b' }}>
                  {issue.table} {issue.rowId ? `#${issue.rowId}` : ''}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
