import React, { useState, useEffect } from 'react';
import type { LedgerItem, RestoreResult } from '../api';
import { api } from '../api';
import { History, RotateCcw, CheckCircle, AlertCircle, RefreshCw, FileText } from 'lucide-react';

interface AuditLedgerProps {
  onRestored: () => void;
}

export const AuditLedger: React.FC<AuditLedgerProps> = ({ onRestored }) => {
  const [ledger, setLedger] = useState<LedgerItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [restoringId, setRestoringId] = useState<number | null>(null);
  const [restoreResult, setRestoreResult] = useState<RestoreResult | null>(null);
  const [restoreError, setRestoreError] = useState<string | null>(null);

  useEffect(() => {
    loadLedger();
  }, []);

  const loadLedger = async () => {
    setLoading(true);
    try {
      const data = await api.getLedgerHistory();
      setLedger(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async (id: number) => {
    setRestoringId(id);
    setRestoreError(null);
    setRestoreResult(null);
    try {
      const res = await api.restoreLedger(id);
      setRestoreResult(res);
      await loadLedger();
      onRestored();
    } catch (err: any) {
      setRestoreError(err.message || 'Ошибка восстановления');
    } finally {
      setRestoringId(null);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14 }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'var(--font-headline)' }}>
            <History size={20} color="#ffd000" /> НЕИЗМЕНЯЕМЫЙ ЖУРНАЛ АУДИТА И ОТКАТ (ROLLBACK)
          </h2>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
            Каждая каскадная операция сохраняет полный криптографический снимок поддерева для безопасного обратного восстановления.
          </p>
        </div>

        <button className="pill-btn pill-btn-white" onClick={loadLedger} disabled={loading}>
          <RefreshCw className={loading ? 'animate-spin' : ''} size={13} /> ОБНОВИТЬ ЖУРНАЛ
        </button>
      </div>

      {/* Restore Success Banner */}
      {restoreResult && (
        <div
          className="animate-fade-in"
          style={{
            background: 'rgba(0, 230, 118, 0.08)',
            border: '1px solid #00e676',
            borderRadius: 4,
            padding: 18
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <CheckCircle size={18} color="#00e676" />
              <span style={{ fontWeight: 700, color: '#00e676' }}>
                Восстановление успешно завершено ({restoreResult.executionId})
              </span>
            </div>
            <span className="badge-tag badge-tag-green">{restoreResult.durationMs} мс</span>
          </div>
          <p style={{ fontSize: 13, color: '#ededed' }}>
            Восстановлено {restoreResult.totalRestored} сущностей с полной физической верификацией связей.
          </p>
        </div>
      )}

      {restoreError && (
        <div style={{ padding: 14, background: 'rgba(255, 51, 68, 0.2)', border: '1px solid #ff3344', borderRadius: 4, color: '#ff3344', fontSize: 13 }}>
          <AlertCircle size={16} style={{ display: 'inline', marginRight: 6 }} />
          Ошибка отката: {restoreError}
        </div>
      )}

      {/* Table */}
      <div className="editorial-card" style={{ overflowX: 'auto' }}>
        {loading && ledger.length === 0 ? (
          <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-secondary)' }}>
            Загрузка журнала аудита...
          </div>
        ) : ledger.length === 0 ? (
          <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-secondary)' }}>
            <FileText size={32} style={{ margin: '0 auto 10px', opacity: 0.4 }} />
            <p>Журнал пуст. Запустите каскадное удаление в Проводнике данных для создания первого снапшота.</p>
          </div>
        ) : (
          <table className="editorial-table">
            <thead>
              <tr>
                <th>ID ОПЕРАЦИИ</th>
                <th>СТРАТЕГИЯ</th>
                <th>КОРНЕВАЯ СУЩНОСТЬ</th>
                <th>РАСПРЕДЕЛЕНИЕ УДАЛЕНИЯ</th>
                <th>ОБОСНОВАНИЕ</th>
                <th>ДАТА И ВРЕМЯ</th>
                <th>СТАТУС</th>
                <th>ДЕЙСТВИЕ</th>
              </tr>
            </thead>
            <tbody>
              {ledger.map(item => {
                let summaryObj: Record<string, number> = {};
                try {
                  summaryObj = JSON.parse(item.affected_summary);
                } catch (e) {}

                const totalRows = Object.values(summaryObj).reduce((a, b) => a + b, 0);

                return (
                  <tr key={item.id}>
                    <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#ffd000' }}>
                      {item.execution_id}
                    </td>
                    <td>
                      <span className="badge-tag">{item.policy}</span>
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)' }}>
                      {item.root_table} #{item.root_id}
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                        <span className="badge-tag badge-tag-red" style={{ fontSize: 10 }}>
                          ИТОГО: {totalRows}
                        </span>
                        {Object.entries(summaryObj).map(([tbl, cnt]) => (
                          <span key={tbl} style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                            {tbl}:{cnt}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                      {item.reason || 'Ручное удаление'}
                    </td>
                    <td style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                      {item.created_at}
                    </td>
                    <td>
                      {item.restored === 1 ? (
                        <span className="badge-tag badge-tag-green">ВОССТАНОВЛЕНО</span>
                      ) : (
                        <span className="badge-tag badge-tag-blue">В АРХИВЕ</span>
                      )}
                    </td>
                    <td>
                      {item.restored === 1 ? (
                        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Уже восстановлено</span>
                      ) : (
                        <button
                          className="pill-btn pill-btn-yellow"
                          style={{ padding: '3px 12px', fontSize: 10 }}
                          disabled={restoringId === item.id}
                          onClick={() => handleRestore(item.id)}
                        >
                          <RotateCcw size={11} className={restoringId === item.id ? 'animate-spin' : ''} />
                          {restoringId === item.id ? 'ОТКАТ...' : 'ВОССТАНОВИТЬ'}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
