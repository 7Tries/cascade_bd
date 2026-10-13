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
          <h2 style={{ fontSize: 18, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8, color: '#1e293b' }}>
            <History size={20} color="#6366f1" /> Журнал аудита и откат (Rollback)
          </h2>
          <p style={{ fontSize: 13, color: '#64748b' }}>
            Каждая операция сохраняет полный снимок поддерева. Любое каскадное удаление можно отменить в один клик.
          </p>
        </div>

        <button className="btn-soft btn-soft-secondary" onClick={loadLedger} disabled={loading}>
          <RefreshCw className={loading ? 'animate-spin' : ''} size={13} /> Обновить журнал
        </button>
      </div>

      {/* Restore Success Banner */}
      {restoreResult && (
        <div
          className="animate-soft-in"
          style={{
            background: '#ecfdf5',
            border: '1px solid #a7f3d0',
            borderRadius: 14,
            padding: 18
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <CheckCircle size={18} color="#059669" />
              <strong style={{ color: '#065f46' }}>
                Данные успешно восстановлены ({restoreResult.executionId})
              </strong>
            </div>
            <span className="badge-soft badge-soft-emerald">{restoreResult.durationMs} мс</span>
          </div>
          <p style={{ fontSize: 13, color: '#047857' }}>
            Восстановлено {restoreResult.totalRestored} связанных сущностей. База данных полностью целостна!
          </p>
        </div>
      )}

      {restoreError && (
        <div style={{ padding: 14, background: '#fff1f2', border: '1px solid #fecdd3', borderRadius: 12, color: '#e11d48', fontSize: 13 }}>
          <AlertCircle size={16} style={{ display: 'inline', marginRight: 6 }} />
          Ошибка отката: {restoreError}
        </div>
      )}

      {/* Table */}
      <div className="soft-card" style={{ overflowX: 'auto' }}>
        {loading && ledger.length === 0 ? (
          <div style={{ padding: 48, textAlign: 'center', color: '#64748b' }}>
            Загрузка журнала аудита...
          </div>
        ) : ledger.length === 0 ? (
          <div style={{ padding: 48, textAlign: 'center', color: '#64748b' }}>
            <FileText size={32} style={{ margin: '0 auto 10px', opacity: 0.3 }} />
            <p style={{ fontWeight: 600, color: '#1e293b' }}>Журнал пока пуст</p>
            <p style={{ fontSize: 13, color: '#94a3b8', marginTop: 4 }}>
              Удалите любую запись в Проводнике данных, чтобы здесь появился снимок для отката.
            </p>
          </div>
        ) : (
          <table className="soft-table">
            <thead>
              <tr>
                <th>ID ОПЕРАЦИИ</th>
                <th>СПОСОБ</th>
                <th>УДАЛЕННЫЙ ОБЪЕКТ</th>
                <th>ЗАТРОНУТО СТРОК</th>
                <th>ПРИЧИНА</th>
                <th>ВРЕМЯ</th>
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
                    <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: '#4f46e5' }}>
                      {item.execution_id}
                    </td>
                    <td>
                      <span className="badge-soft badge-soft-indigo">{item.policy}</span>
                    </td>
                    <td>
                      <strong style={{ color: '#1e293b' }}>{item.root_table}</strong> #{item.root_id}
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                        <span className="badge-soft badge-soft-rose" style={{ fontSize: 10 }}>
                          Всего: {totalRows}
                        </span>
                        {Object.entries(summaryObj).map(([tbl, cnt]) => (
                          <span key={tbl} style={{ fontSize: 11, color: '#64748b' }}>
                            {tbl}:{cnt}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td style={{ fontSize: 12, color: '#475569' }}>
                      {item.reason || 'Ручное удаление'}
                    </td>
                    <td style={{ fontSize: 11, color: '#94a3b8', fontFamily: 'var(--font-mono)' }}>
                      {item.created_at}
                    </td>
                    <td>
                      {item.restored === 1 ? (
                        <span className="badge-soft badge-soft-emerald">Восстановлено</span>
                      ) : (
                        <span className="badge-soft badge-soft-slate">В архиве</span>
                      )}
                    </td>
                    <td>
                      {item.restored === 1 ? (
                        <span style={{ fontSize: 11, color: '#94a3b8' }}>Уже в базе</span>
                      ) : (
                        <button
                          className="btn-soft btn-soft-success"
                          style={{ padding: '5px 12px', fontSize: 11, borderRadius: 8 }}
                          disabled={restoringId === item.id}
                          onClick={() => handleRestore(item.id)}
                        >
                          <RotateCcw size={12} className={restoringId === item.id ? 'animate-spin' : ''} />
                          {restoringId === item.id ? 'Откат...' : 'Восстановить'}
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
