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
      setActionMessage(`Тест хаоса: ${res.message}`);
      await runAudit();
      onDatabaseMutated();
    } catch (err: any) {
      setActionMessage(`Ошибка теста хаоса: ${err.message}`);
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Top Banner */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14 }}>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8, color: '#1e293b' }}>
            <Activity size={20} color={isHealthy ? '#059669' : '#e11d48'} />
            Доктор целостности базы данных
          </h2>
          <p style={{ fontSize: 13, color: '#64748b' }}>
            Автоматическая проверка физического хранилища страниц SQLite, ссылок внешних ключей и бизнес-инвариантов.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button className="btn-soft btn-soft-secondary" onClick={runAudit} disabled={loading}>
            <RefreshCw className={loading ? 'animate-spin' : ''} size={13} /> Повторный аудит
          </button>
          <button className="btn-soft btn-soft-amber" onClick={handleResetSeed} disabled={loading}>
            <RotateCcw size={13} /> Сбросить и наполнить
          </button>
        </div>
      </div>

      {actionMessage && (
        <div
          className="animate-soft-in"
          style={{
            padding: '14px 18px',
            background: '#fffbeb',
            border: '1px solid #fde68a',
            borderRadius: 12,
            fontSize: 13,
            color: '#b45309'
          }}
        >
          {actionMessage}
        </div>
      )}

      {/* Health Overview Cards */}
      {audit && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14 }}>
          {/* Integrity Score */}
          <div
            className="soft-card"
            style={{
              padding: 22,
              borderTop: `4px solid ${isHealthy ? '#10b981' : '#f43f5e'}`,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between'
            }}
          >
            <div>
              <div style={{ fontSize: 12, color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>
                Индекс здоровья базы
              </div>
              <div
                style={{
                  fontSize: 38,
                  fontWeight: 800,
                  color: isHealthy ? '#059669' : '#e11d48',
                  marginTop: 6
                }}
              >
                {audit.score}%
              </div>
            </div>
            <div style={{ marginTop: 14 }}>
              <span className={isHealthy ? 'badge-soft badge-soft-emerald' : 'badge-soft badge-soft-rose'}>
                {isHealthy ? 'Безупречно' : 'Обнаружены аномалии'} ({audit.totalIssues} проблем)
              </span>
            </div>
          </div>

          {/* Physical Storage */}
          <div className="soft-card" style={{ padding: 22, borderTop: '4px solid #6366f1' }}>
            <div style={{ fontSize: 12, color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>
              Физическое хранилище B-Tree
            </div>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#1e293b', marginTop: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Server size={18} color="#6366f1" />
              PRAGMA integrity_check
            </div>
            <div style={{ marginTop: 18 }}>
              <span className={audit.physicalStatus === 'OK' ? 'badge-soft badge-soft-emerald' : 'badge-soft badge-soft-rose'}>
                Страницы: {audit.physicalStatus}
              </span>
            </div>
          </div>

          {/* Referential Integrity */}
          <div className="soft-card" style={{ padding: 22, borderTop: '4px solid #059669' }}>
            <div style={{ fontSize: 12, color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>
              Целостность внешних ключей
            </div>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#1e293b', marginTop: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
              <ShieldCheck size={18} color="#059669" />
              PRAGMA foreign_key_check
            </div>
            <div style={{ marginTop: 18 }}>
              <span className={audit.issues.filter(i => i.type === 'ORPHANED_FOREIGN_KEY').length === 0 ? 'badge-soft badge-soft-emerald' : 'badge-soft badge-soft-rose'}>
                {audit.issues.filter(i => i.type === 'ORPHANED_FOREIGN_KEY').length === 0 ? '0 сломанных связей' : `${audit.issues.filter(i => i.type === 'ORPHANED_FOREIGN_KEY').length} сломанных FK`}
              </span>
            </div>
          </div>

          {/* Invariants */}
          <div className="soft-card" style={{ padding: 22, borderTop: '4px solid #f59e0b' }}>
            <div style={{ fontSize: 12, color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>
              Инварианты бизнес-логики
            </div>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#1e293b', marginTop: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Database size={18} color="#d97706" />
              Полиморфные связи
            </div>
            <div style={{ marginTop: 18 }}>
              <span className={audit.issues.filter(i => i.type !== 'ORPHANED_FOREIGN_KEY').length === 0 ? 'badge-soft badge-soft-emerald' : 'badge-soft badge-soft-amber'}>
                {audit.issues.filter(i => i.type !== 'ORPHANED_FOREIGN_KEY').length === 0 ? '100% инвариантов в норме' : `${audit.issues.filter(i => i.type !== 'ORPHANED_FOREIGN_KEY').length} предупреждений`}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Chaos Simulator & Auto-Repair */}
      <div className="soft-card" style={{ padding: 24, background: 'linear-gradient(135deg, #ffffff 0%, #fffbeb 100%)', border: '1px solid #fde68a' }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 6, color: '#1e293b' }}>
          Тестирование устойчивости (Chaos Test)
        </h3>
        <p style={{ fontSize: 13, color: '#64748b', marginBottom: 18, maxWidth: 800 }}>
          Вы можете намеренно внести сломанную запись в базу, чтобы проверить, как Доктор Целостности её мгновенно обнаружит, и затем нажать кнопку авто-исправления.
        </p>

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <button className="btn-soft btn-soft-danger" onClick={handleInjectChaos} disabled={loading}>
            <Bug size={15} /> Внести сломанную запись (Тест)
          </button>

          <button className="btn-soft btn-soft-success" onClick={handleRepair} disabled={loading || isHealthy}>
            <Wrench size={15} /> Автоматически исправить базу
          </button>
        </div>
      </div>

      {/* Issues List */}
      <div className="soft-card" style={{ padding: 24 }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 14, color: '#1e293b' }}>
          Отчет диагностики базы ({audit?.issues.length || 0} аномалий)
        </h3>

        {audit?.issues.length === 0 ? (
          <div style={{ padding: 32, textAlign: 'center', color: '#059669' }}>
            <CheckCircle size={36} style={{ margin: '0 auto 10px', color: '#10b981' }} />
            <p style={{ fontWeight: 700, fontSize: 16, color: '#1e293b' }}>База данных полностью здорова</p>
            <p style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>
              Все внешние ключи соблюдены, висячих записей нет, физическое хранилище целостно.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {audit?.issues.map((issue, idx) => (
              <div
                key={idx}
                style={{
                  padding: '14px 18px',
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: 10,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 12
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span className={issue.severity === 'CRITICAL' ? 'badge-soft badge-soft-rose' : (issue.severity === 'HIGH' ? 'badge-soft badge-soft-amber' : 'badge-soft badge-soft-slate')}>
                    {issue.type}
                  </span>
                  <span style={{ fontSize: 13, color: '#1e293b' }}>{issue.detail}</span>
                </div>

                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#94a3b8' }}>
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
