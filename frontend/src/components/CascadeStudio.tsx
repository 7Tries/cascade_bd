import React, { useState, useEffect } from 'react';
import type { AnalysisResult, ExecutionResult } from '../api';
import { api } from '../api';
import {
  AlertTriangle, CheckCircle, ShieldAlert, Zap,
  GitBranch, ArrowRight, RefreshCw, X, FileText
} from 'lucide-react';

interface CascadeStudioProps {
  table: string;
  id: number;
  label: string;
  onClose: () => void;
  onExecutionComplete: () => void;
}

export const CascadeStudio: React.FC<CascadeStudioProps> = ({
  table,
  id,
  label,
  onClose,
  onExecutionComplete
}) => {
  const [policy, setPolicy] = useState('HARD_CASCADE');
  const [reason, setReason] = useState('Плановое каскадное удаление');
  const [overrideViolations, setOverrideViolations] = useState(false);

  const [loadingAnalysis, setLoadingAnalysis] = useState(true);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  const [executing, setExecuting] = useState(false);
  const [executionResult, setExecutionResult] = useState<ExecutionResult | null>(null);
  const [executionError, setExecutionError] = useState<string | null>(null);

  useEffect(() => {
    runAnalysis();
  }, [table, id, policy]);

  const runAnalysis = async () => {
    setLoadingAnalysis(true);
    setAnalysisError(null);
    try {
      const res = await api.dryRunCascade(table, id, policy);
      setAnalysis(res);
    } catch (err: any) {
      setAnalysisError(err.message || 'Ошибка анализа графа');
    } finally {
      setLoadingAnalysis(false);
    }
  };

  const handleExecute = async () => {
    setExecuting(true);
    setExecutionError(null);
    try {
      const res = await api.executeCascade(table, id, policy, reason, overrideViolations);
      setExecutionResult(res);
      onExecutionComplete();
    } catch (err: any) {
      setExecutionError(err.message || 'Транзакция отменена сервером');
    } finally {
      setExecuting(false);
    }
  };

  const criticalBlockers = analysis?.violations.filter(v => v.severity === 'CRITICAL_BLOCKER') || [];
  const canProceed = analysis?.canProceed || overrideViolations;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.5)',
        backdropFilter: 'blur(4px)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20
      }}
    >
      <div
        className="studio-card animate-enter"
        style={{
          width: '100%',
          maxWidth: 880,
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          background: '#ffffff',
          boxShadow: 'var(--shadow-modal)',
          border: '1px solid var(--border-medium)'
        }}
      >
        {/* Header Bar */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid var(--border-light)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: '#ffffff'
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="status-pill status-pill-rose mono-text" style={{ fontSize: 10 }}>
                CASCADE SIMULATOR
              </span>
              <span style={{ fontSize: 13, color: '#64748b' }}>Цель:</span>
              <strong className="mono-text" style={{ color: '#0f172a', fontSize: 13 }}>
                {table} #{id} ({label})
              </strong>
            </div>
            <p style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
              Топологический расчет каскада, проверка целостности внешних ключей и контроль блокировок.
            </p>
          </div>

          <button className="btn-ui btn-ui-ghost" onClick={onClose} style={{ padding: '4px 8px' }}>
            <X size={15} />
          </button>
        </div>

        {/* Modal Scroll Body */}
        <div style={{ padding: 20, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 18 }}>
          {/* Strategy Options */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#475569', textTransform: 'uppercase', marginBottom: 8, letterSpacing: '0.03em' }}>
              Стратегия каскадного удаления
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10 }}>
              {[
                {
                  id: 'HARD_CASCADE',
                  title: 'Физический каскад',
                  desc: 'Удаляет зависимые записи снизу вверх с расцеплением циклов.',
                  icon: Zap,
                  accent: '#dc2626'
                },
                {
                  id: 'ARCHIVE_AND_HARD_DELETE',
                  title: 'Архив + Удаление',
                  desc: 'Сохраняет снимок сущностей в аудит перед удалением для отката.',
                  icon: FileText,
                  accent: '#7c3aed'
                },
                {
                  id: 'SOFT_CASCADE',
                  title: 'Мягкое скрытие (Soft)',
                  desc: 'Помечает все записи как is_deleted=1 без удаления из SQLite.',
                  icon: ShieldAlert,
                  accent: '#059669'
                },
                {
                  id: 'SAFE_NULLIFY',
                  title: 'Отвязка (Set Null)',
                  desc: 'Обнуляет ссылки дочерних записей, удаляя только корень.',
                  icon: GitBranch,
                  accent: '#2563eb'
                }
              ].map(opt => {
                const Icon = opt.icon;
                const active = policy === opt.id;
                return (
                  <div
                    key={opt.id}
                    onClick={() => setPolicy(opt.id)}
                    style={{
                      background: active ? '#f8fafc' : '#ffffff',
                      border: `1.5px solid ${active ? '#0f172a' : 'var(--border-light)'}`,
                      borderRadius: 8,
                      padding: 12,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                      <Icon size={14} color={active ? '#0f172a' : opt.accent} />
                      <span style={{ fontSize: 12, fontWeight: 600, color: '#0f172a' }}>
                        {opt.title}
                      </span>
                    </div>
                    <p style={{ fontSize: 11, color: '#64748b', lineHeight: 1.4 }}>{opt.desc}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Reason Input */}
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: '#475569', textTransform: 'uppercase', marginBottom: 4, display: 'block', letterSpacing: '0.03em' }}>
              Обоснование операции (записывается в журнал аудита)
            </label>
            <input
              type="text"
              className="ui-input"
              style={{ width: '100%' }}
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="Причина операции для журнала аудита..."
            />
          </div>

          {/* Simulator Dry Run Output */}
          {loadingAnalysis ? (
            <div style={{ padding: 32, textAlign: 'center', color: '#64748b', fontSize: 13 }}>
              <RefreshCw className="animate-spin" size={20} style={{ margin: '0 auto 8px', color: '#0f172a' }} />
              Расчет зависимостей графа (Dry-Run)...
            </div>
          ) : analysisError ? (
            <div style={{ padding: 14, background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8 }}>
              <div style={{ color: '#dc2626', fontWeight: 600, fontSize: 13 }}>Ошибка расчета графа</div>
              <div style={{ fontSize: 12, color: '#991b1b', marginTop: 2 }}>{analysisError}</div>
            </div>
          ) : analysis ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* Stat Boxes */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
                <div style={{ padding: '10px 14px', borderRadius: 8, background: '#f8fafc', border: '1px solid var(--border-light)' }}>
                  <div style={{ fontSize: 10, color: '#dc2626', fontWeight: 600, letterSpacing: '0.04em' }}>ЗАТРОНУТО СТРОК</div>
                  <div className="mono-text" style={{ fontSize: 20, fontWeight: 700, color: '#0f172a', marginTop: 2 }}>
                    {analysis.totalAffected}
                  </div>
                </div>

                <div style={{ padding: '10px 14px', borderRadius: 8, background: '#f8fafc', border: '1px solid var(--border-light)' }}>
                  <div style={{ fontSize: 10, color: '#2563eb', fontWeight: 600, letterSpacing: '0.04em' }}>ГЛУБИНА СВЯЗЕЙ</div>
                  <div className="mono-text" style={{ fontSize: 20, fontWeight: 700, color: '#0f172a', marginTop: 2 }}>
                    {analysis.maxDepth} ур.
                  </div>
                </div>

                <div style={{ padding: '10px 14px', borderRadius: 8, background: '#f8fafc', border: '1px solid var(--border-light)' }}>
                  <div style={{ fontSize: 10, color: '#059669', fontWeight: 600, letterSpacing: '0.04em' }}>ТАБЛИЦ В ЦЕПИ</div>
                  <div className="mono-text" style={{ fontSize: 20, fontWeight: 700, color: '#0f172a', marginTop: 2 }}>
                    {analysis.impactedTables.length}
                  </div>
                </div>

                <div style={{ padding: '10px 14px', borderRadius: 8, background: '#f8fafc', border: '1px solid var(--border-light)' }}>
                  <div style={{ fontSize: 10, color: '#d97706', fontWeight: 600, letterSpacing: '0.04em' }}>ЦИКЛОВ</div>
                  <div className="mono-text" style={{ fontSize: 20, fontWeight: 700, color: '#0f172a', marginTop: 2 }}>
                    {analysis.cyclicEdgesToUnlink}
                  </div>
                </div>
              </div>

              {/* Table Breakdown */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
                <span style={{ fontSize: 12, color: '#64748b' }}>Удаление по таблицам:</span>
                {Object.entries(analysis.affectedCounts).map(([tbl, cnt]) => (
                  <span key={tbl} className="status-pill status-pill-neutral mono-text" style={{ fontSize: 11 }}>
                    {tbl}: <strong style={{ color: '#0f172a', marginLeft: 3 }}>{cnt}</strong>
                  </span>
                ))}
              </div>

              {/* Violations / Guardrails */}
              {analysis.violations.length > 0 ? (
                <div
                  style={{
                    background: '#fef2f2',
                    border: '1px solid #fecaca',
                    borderRadius: 8,
                    padding: 14
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <ShieldAlert size={16} color="#dc2626" />
                    <span style={{ fontWeight: 600, color: '#dc2626', fontSize: 13 }}>
                      Ограничения целостности ({analysis.violations.length})
                    </span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 10 }}>
                    {analysis.violations.map((v, idx) => (
                      <div
                        key={idx}
                        style={{
                          fontSize: 12,
                          background: '#ffffff',
                          padding: '8px 12px',
                          borderRadius: 6,
                          border: '1px solid #fecaca',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8
                        }}
                      >
                        <span className="status-pill status-pill-rose mono-text" style={{ fontSize: 10 }}>
                          {v.rule}
                        </span>
                        <span style={{ color: '#334155' }}>{v.message}</span>
                      </div>
                    ))}
                  </div>

                  {criticalBlockers.length > 0 && (
                    <label
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        fontSize: 12,
                        color: '#991b1b',
                        cursor: 'pointer',
                        padding: '8px 12px',
                        background: '#fee2e2',
                        borderRadius: 6
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={overrideViolations}
                        onChange={e => setOverrideViolations(e.target.checked)}
                      />
                      <span>
                        <strong>Принудительное подтверждение:</strong> я подтверждаю снятие блокировки для удаления защищенных записей.
                      </span>
                    </label>
                  )}
                </div>
              ) : (
                <div
                  style={{
                    background: '#ecfdf5',
                    border: '1px solid #a7f3d0',
                    borderRadius: 8,
                    padding: '10px 14px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    fontSize: 12,
                    color: '#065f46'
                  }}
                >
                  <CheckCircle size={15} color="#059669" />
                  <span>Инварианты соблюдены: препятствий для каскадного удаления нет.</span>
                </div>
              )}

              {/* Topological leaves-first sequence */}
              <div
                style={{
                  background: '#f8fafc',
                  border: '1px solid var(--border-light)',
                  borderRadius: 8,
                  padding: 12
                }}
              >
                <div style={{ fontSize: 10, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', marginBottom: 6, letterSpacing: '0.03em' }}>
                  Топологический порядок удаления (листья → корень)
                </div>
                <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
                  {analysis.deletionOrder.map((tbl, idx) => (
                    <React.Fragment key={tbl}>
                      <span className="status-pill status-pill-neutral mono-text" style={{ fontSize: 11 }}>
                        {idx + 1}. {tbl}
                      </span>
                      {idx < analysis.deletionOrder.length - 1 && (
                        <ArrowRight size={11} color="#94a3b8" />
                      )}
                    </React.Fragment>
                  ))}
                </div>
              </div>

              {/* Execution Trace */}
              {executionResult && (
                <div
                  className="animate-enter"
                  style={{
                    background: '#ecfdf5',
                    border: '1px solid #a7f3d0',
                    borderRadius: 8,
                    padding: 14
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <CheckCircle size={16} color="#059669" />
                      <strong style={{ color: '#065f46', fontSize: 13 }}>
                        Каскад выполнен ({executionResult.executionId})
                      </strong>
                    </div>
                    <span className="status-pill status-pill-emerald mono-text" style={{ fontSize: 10 }}>
                      {executionResult.durationMs} мс
                    </span>
                  </div>

                  <div style={{ fontSize: 12, display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {executionResult.traceSteps.map(step => (
                      <div
                        key={step.step}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          color: '#334155'
                        }}
                      >
                        <span className="mono-text" style={{ color: '#2563eb', fontWeight: 600 }}>
                          [{step.step}]
                        </span>
                        <span>{step.action}</span>
                        {step.status && (
                          <span style={{ color: '#059669', marginLeft: 'auto', fontSize: 11, fontWeight: 600 }}>
                            ✓ {step.status}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {executionError && (
                <div style={{ padding: 12, background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, color: '#dc2626', fontSize: 12 }}>
                  <AlertTriangle size={14} style={{ display: 'inline', marginRight: 6 }} />
                  Транзакция отменена: {executionError}
                </div>
              )}
            </div>
          ) : null}
        </div>

        {/* Footer Actions */}
        <div
          style={{
            padding: '12px 20px',
            borderTop: '1px solid var(--border-light)',
            background: '#f8fafc',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <button className="btn-ui btn-ui-secondary" onClick={onClose}>
            {executionResult ? 'Готово' : 'Отмена'}
          </button>

          {!executionResult && (
            <button
              className="btn-ui btn-ui-danger-filled"
              disabled={!canProceed || executing || loadingAnalysis}
              onClick={handleExecute}
              style={{
                opacity: (!canProceed || executing || loadingAnalysis) ? 0.45 : 1,
                cursor: (!canProceed || executing || loadingAnalysis) ? 'not-allowed' : 'pointer'
              }}
            >
              {executing ? (
                <>
                  <RefreshCw className="animate-spin" size={13} /> Фиксация транзакции...
                </>
              ) : (
                <>
                  <Zap size={13} /> Выполнить удаление
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
