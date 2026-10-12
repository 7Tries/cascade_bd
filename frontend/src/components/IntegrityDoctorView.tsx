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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
      {/* Top Banner */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14 }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'var(--font-headline)' }}>
            <Activity size={20} color={isHealthy ? '#00e676' : '#ff3344'} />
            ДОКТОР ЦЕЛОСТНОСТИ БАЗЫ ДАННЫХ
          </h2>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
            Непрерывный физический аудит страниц B-Tree, внешних ключей ядра SQLite и бизнес-инвариантов.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button className="pill-btn pill-btn-white" onClick={runAudit} disabled={loading}>
            <RefreshCw className={loading ? 'animate-spin' : ''} size={13} /> ПОВТОРНЫЙ АУДИТ
          </button>
          <button className="pill-btn pill-btn-yellow" onClick={handleResetSeed} disabled={loading}>
            <RotateCcw size={13} /> СБРОСИТЬ И НАПОЛНИТЬ
          </button>
        </div>
      </div>

      {actionMessage && (
        <div
          className="animate-fade-in"
          style={{
            padding: '14px 18px',
            background: 'rgba(255, 208, 0, 0.08)',
            border: '1px solid #ffd000',
            borderRadius: 4,
            fontSize: 13,
            color: '#ffd000'
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
            className="editorial-card"
            style={{
              padding: 22,
              borderTop: `3px solid ${isHealthy ? '#00e676' : '#ff3344'}`,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between'
            }}
          >
            <div>
              <div className="mono-tag" style={{ color: 'var(--text-muted)' }}>
                ИНДЕКС ЗДОРОВЬЯ БАЗЫ
              </div>
              <div
                style={{
                  fontSize: 44,
                  fontWeight: 800,
                  fontFamily: 'var(--font-mono)',
                  color: isHealthy ? '#00e676' : '#ff3344',
                  marginTop: 6
                }}
              >
                {audit.score}%
              </div>
            </div>
            <div style={{ marginTop: 14 }}>
              <span className={isHealthy ? 'badge-tag badge-tag-green' : 'badge-tag badge-tag-red'}>
                {isHealthy ? 'БЕЗУПРЕЧНО' : 'ОБНАРУЖЕНЫ АНОМАЛИИ'} ({audit.totalIssues} проблем)
              </span>
            </div>
          </div>

          {/* Physical Storage */}
          <div className="editorial-card" style={{ padding: 22, borderTop: '3px solid #ffffff' }}>
            <div className="mono-tag" style={{ color: 'var(--text-muted)' }}>
              ФИЗИЧЕСКОЕ ХРАНИЛИЩЕ B-TREE
            </div>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#ffffff', marginTop: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Server size={18} color="#ffffff" />
              PRAGMA integrity_check
            </div>
            <div style={{ marginTop: 18 }}>
              <span className={audit.physicalStatus === 'OK' ? 'badge-tag badge-tag-green' : 'badge-tag badge-tag-red'}>
                СТАТУС СТРАНИЦ: {audit.physicalStatus}
              </span>
            </div>
          </div>

          {/* Referential Integrity */}
          <div className="editorial-card" style={{ padding: 22, borderTop: '3px solid #00e676' }}>
            <div className="mono-tag" style={{ color: 'var(--text-muted)' }}>
              ССЫЛОЧНАЯ ЦЕЛОСТНОСТЬ ВНЕШНИХ КЛЮЧЕЙ
            </div>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#ffffff', marginTop: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
              <ShieldCheck size={18} color="#00e676" />
              PRAGMA foreign_key_check
            </div>
            <div style={{ marginTop: 18 }}>
              <span className={audit.issues.filter(i => i.type === 'ORPHANED_FOREIGN_KEY').length === 0 ? 'badge-tag badge-tag-green' : 'badge-tag badge-tag-red'}>
                {audit.issues.filter(i => i.type === 'ORPHANED_FOREIGN_KEY').length === 0 ? '0 ПОВРЕЖДЕННЫХ СВЯЗЕЙ' : `${audit.issues.filter(i => i.type === 'ORPHANED_FOREIGN_KEY').length} СЛОМАННЫХ FK`}
              </span>
            </div>
          </div>

          {/* Invariants */}
          <div className="editorial-card" style={{ padding: 22, borderTop: '3px solid #ffd000' }}>
            <div className="mono-tag" style={{ color: 'var(--text-muted)' }}>
              ИНВАРИАНТЫ БИЗНЕС-ЛОГИКИ
            </div>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#ffffff', marginTop: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Database size={18} color="#ffd000" />
              Полиморфные и логические связи
            </div>
            <div style={{ marginTop: 18 }}>
              <span className={audit.issues.filter(i => i.type !== 'ORPHANED_FOREIGN_KEY').length === 0 ? 'badge-tag badge-tag-green' : 'badge-tag badge-tag-yellow'}>
                {audit.issues.filter(i => i.type !== 'ORPHANED_FOREIGN_KEY').length === 0 ? '100% ИНВАРИАНТОВ В НОРМЕ' : `${audit.issues.filter(i => i.type !== 'ORPHANED_FOREIGN_KEY').length} НАРУШЕНИЙ`}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Chaos Simulator & Auto-Repair */}
      <div className="editorial-card" style={{ padding: 24 }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 6, color: '#ffffff', fontFamily: 'var(--font-headline)' }}>
          ЛАБОРАТОРИЯ ТЕСТИРОВАНИЯ ХАОСА И АВТО-РЕМОНТ
        </h3>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 18 }}>
          Намеренно внедрите поврежденную сиротскую запись в обход ограничений базы, чтобы наглядно убедиться в работе детектора Доктора Целостности и механизма автоматического исправления.
        </p>

        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
          <button className="pill-btn pill-btn-danger" onClick={handleInjectChaos} disabled={loading}>
            <Bug size={14} /> ТЕСТ ХАОСА: ВНЕДРИТЬ СИРОТСКУЮ ЗАПИСЬ
          </button>

          <button className="pill-btn pill-btn-success" onClick={handleRepair} disabled={loading || isHealthy}>
            <Wrench size={14} /> АВТО-РЕМОНТ И ОЧИСТКА БАЗЫ
          </button>
        </div>
      </div>

      {/* Issues List */}
      <div className="editorial-card" style={{ padding: 24 }}>
        <h3 className="mono-tag" style={{ fontSize: 12, marginBottom: 14, color: '#ffffff' }}>
          ОТЧЕТ ДИАГНОСТИКИ СУБД ({audit?.issues.length || 0} АНОМАЛИЙ)
        </h3>

        {audit?.issues.length === 0 ? (
          <div style={{ padding: 32, textAlign: 'center', color: '#00e676' }}>
            <CheckCircle size={36} style={{ margin: '0 auto 10px' }} />
            <p style={{ fontWeight: 700, fontSize: 16 }}>Целостность базы данных идеальна</p>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>
              Физическое хранилище целостно, все внешние ключи соблюдены, бизнес-инварианты выполняются на 100%.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {audit?.issues.map((issue, idx) => (
              <div
                key={idx}
                style={{
                  padding: '14px 18px',
                  background: '#040404',
                  border: '1px solid var(--border-light)',
                  borderRadius: 4,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 12
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span className={issue.severity === 'CRITICAL' ? 'badge-tag badge-tag-red' : (issue.severity === 'HIGH' ? 'badge-tag badge-tag-yellow' : 'badge-tag')}>
                    {issue.type}
                  </span>
                  <span style={{ fontSize: 13, color: '#ffffff' }}>{issue.detail}</span>
                </div>

                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)' }}>
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
