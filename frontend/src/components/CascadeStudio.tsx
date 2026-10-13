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
  const [reason, setReason] = useState('Плановое каскадное удаление записи');
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
      setAnalysisError(err.message || 'Ошибка симуляции каскада');
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
      setExecutionError(err.message || 'Ошибка выполнения транзакции');
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
        backgroundColor: 'rgba(15, 23, 42, 0.45)',
        backdropFilter: 'blur(8px)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20
      }}
    >
      <div
        className="soft-card animate-soft-in"
        style={{
          width: '100%',
          maxWidth: 920,
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          background: '#ffffff',
          boxShadow: 'var(--shadow-modal)',
          border: '1px solid #cbd5e1'
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '20px 28px',
            borderBottom: '1px solid #f1f5f9',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)'
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span className="badge-soft badge-soft-indigo">Симулятор каскада</span>
              <span style={{ fontSize: 13, color: '#64748b' }}>Объект:</span>
              <strong style={{ color: '#1e293b' }}>
                {table} #{id} ({label})
              </strong>
            </div>
            <p style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
              Предварительный расчет цепочки удалений, проверка бизнес-правил и безопасное выполнение транзакции.
            </p>
          </div>

          <button className="btn-soft btn-soft-secondary" onClick={onClose} style={{ padding: '6px 10px', borderRadius: 8 }}>
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: 26, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Strategy Selection */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: '#475569', textTransform: 'uppercase', marginBottom: 10, display: 'block', letterSpacing: '0.04em' }}>
              Выберите способ удаления
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
              {[
                {
                  id: 'HARD_CASCADE',
                  title: 'Физический каскад',
                  desc: 'Удаляет связанные записи снизу вверх с автоматическим расцеплением циклов.',
                  icon: Zap,
                  bg: '#fff1f2',
                  border: '#fecdd3',
                  accent: '#e11d48'
                },
                {
                  id: 'ARCHIVE_AND_HARD_DELETE',
                  title: 'Архив и удаление',
                  desc: 'Сохраняет снимок всех записей в журнал перед удалением. Позволяет откат в 1 клик.',
                  icon: FileText,
                  bg: '#f5f3ff',
                  border: '#ddd6fe',
                  accent: '#7c3aed'
                },
                {
                  id: 'SOFT_CASCADE',
                  title: 'Мягкое скрытие (Soft)',
                  desc: 'Помечает все записи как скрытые (is_deleted=1). Физически ничего не удаляется.',
                  icon: ShieldAlert,
                  bg: '#ecfdf5',
                  border: '#a7f3d0',
                  accent: '#059669'
                },
                {
                  id: 'SAFE_NULLIFY',
                  title: 'Отвязать (Set Null)',
                  desc: 'Обнуляет ссылки у дочерних записей, удаляя только саму выбранную запись.',
                  icon: GitBranch,
                  bg: '#f0f9ff',
                  border: '#bae6fd',
                  accent: '#0284c7'
                }
              ].map(opt => {
                const Icon = opt.icon;
                const active = policy === opt.id;
                return (
                  <div
                    key={opt.id}
                    onClick={() => setPolicy(opt.id)}
                    style={{
                      background: active ? opt.bg : '#ffffff',
                      border: `1.5px solid ${active ? opt.accent : '#e2e8f0'}`,
                      borderRadius: 12,
                      padding: 14,
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      boxShadow: active ? '0 4px 12px rgba(0, 0, 0, 0.05)' : 'none'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                      <div
                        style={{
                          width: 26,
                          height: 26,
                          borderRadius: 6,
                          background: opt.bg,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: opt.accent
                        }}
                      >
                        <Icon size={15} />
                      </div>
                      <span style={{ fontSize: 13, fontWeight: 700, color: '#1e293b' }}>
                        {opt.title}
                      </span>
                    </div>
                    <p style={{ fontSize: 11, color: '#64748b', lineHeight: 1.4 }}>{opt.desc}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Audit Reason */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: '#475569', textTransform: 'uppercase', marginBottom: 6, display: 'block', letterSpacing: '0.04em' }}>
              Причина удаления (для журнала)
            </label>
            <input
              type="text"
              className="input-soft"
              style={{ width: '100%' }}
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="Например: Плановая очистка завершенного проекта"
            />
          </div>

          {/* Dry Run Simulator Results */}
          {loadingAnalysis ? (
            <div style={{ padding: 36, textAlign: 'center', color: '#64748b' }}>
              <RefreshCw className="animate-spin" size={24} style={{ margin: '0 auto 8px', color: '#6366f1' }} />
              Симуляция каскадного обхода графа...
            </div>
          ) : analysisError ? (
            <div style={{ padding: 16, background: '#fff1f2', border: '1px solid #fecdd3', borderRadius: 12 }}>
              <AlertTriangle size={18} color="#e11d48" style={{ marginBottom: 4 }} />
              <div style={{ color: '#e11d48', fontWeight: 700 }}>Ошибка расчета</div>
              <div style={{ fontSize: 13, color: '#9f1239' }}>{analysisError}</div>
            </div>
          ) : analysis ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Stat Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
                <div style={{ padding: '12px 16px', borderRadius: 12, background: '#fff1f2', border: '1px solid #fecdd3' }}>
                  <div style={{ fontSize: 11, color: '#e11d48', fontWeight: 600 }}>ЗАТРОНУТО СТРОК</div>
                  <div style={{ fontSize: 24, fontWeight: 800, color: '#9f1239', marginTop: 2 }}>
                    {analysis.totalAffected}
                  </div>
                </div>

                <div style={{ padding: '12px 16px', borderRadius: 12, background: '#eef2ff', border: '1px solid #c7d2fe' }}>
                  <div style={{ fontSize: 11, color: '#4f46e5', fontWeight: 600 }}>ГЛУБИНА СВЯЗЕЙ</div>
                  <div style={{ fontSize: 24, fontWeight: 800, color: '#3730a3', marginTop: 2 }}>
                    {analysis.maxDepth} уровня
                  </div>
                </div>

                <div style={{ padding: '12px 16px', borderRadius: 12, background: '#ecfdf5', border: '1px solid #a7f3d0' }}>
                  <div style={{ fontSize: 11, color: '#059669', fontWeight: 600 }}>ТАБЛИЦ В ЦЕПОЧКЕ</div>
                  <div style={{ fontSize: 24, fontWeight: 800, color: '#065f46', marginTop: 2 }}>
                    {analysis.impactedTables.length}
                  </div>
                </div>

                <div style={{ padding: '12px 16px', borderRadius: 12, background: '#fffbeb', border: '1px solid #fde68a' }}>
                  <div style={{ fontSize: 11, color: '#d97706', fontWeight: 600 }}>ЦИКЛИЧЕСКИХ СВЯЗЕЙ</div>
                  <div style={{ fontSize: 24, fontWeight: 800, color: '#92400e', marginTop: 2 }}>
                    {analysis.cyclicEdgesToUnlink} расцеплено
                  </div>
                </div>
              </div>

              {/* Table Breakdown */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
                <span style={{ fontSize: 12, color: '#64748b' }}>Будет удалено по таблицам:</span>
                {Object.entries(analysis.affectedCounts).map(([tbl, cnt]) => (
                  <span key={tbl} className="badge-soft badge-soft-slate">
                    {tbl}: <strong style={{ color: '#1e293b', marginLeft: 4 }}>{cnt}</strong>
                  </span>
                ))}
              </div>

              {/* Logical Invariant Compliance Guardrails */}
              {analysis.violations.length > 0 ? (
                <div
                  style={{
                    background: '#fff1f2',
                    border: '1px solid #fecdd3',
                    borderRadius: 12,
                    padding: 16
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <ShieldAlert size={18} color="#e11d48" />
                    <span style={{ fontWeight: 700, color: '#e11d48', fontSize: 13 }}>
                      Защита бизнес-правил: обнаружены ограничения ({analysis.violations.length})
                    </span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
                    {analysis.violations.map((v, idx) => (
                      <div
                        key={idx}
                        style={{
                          fontSize: 12,
                          background: '#ffffff',
                          padding: '10px 14px',
                          borderRadius: 8,
                          border: '1px solid #fecdd3',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 10
                        }}
                      >
                        <span className={v.severity === 'CRITICAL_BLOCKER' ? 'badge-soft badge-soft-rose' : 'badge-soft badge-soft-amber'}>
                          {v.rule === 'FINANCIAL_COMPLIANCE_LOCK' ? 'ОПЛАЧЕННЫЙ СЧЕТ' : v.rule}
                        </span>
                        <span style={{ color: '#475569' }}>{v.message}</span>
                      </div>
                    ))}
                  </div>

                  {criticalBlockers.length > 0 && (
                    <label
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        fontSize: 12,
                        color: '#92400e',
                        cursor: 'pointer',
                        padding: '10px 14px',
                        background: '#fef3c7',
                        borderRadius: 8,
                        border: '1px solid #fde68a'
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={overrideViolations}
                        onChange={e => setOverrideViolations(e.target.checked)}
                      />
                      <span>
                        <strong>Подтверждаю принудительное удаление:</strong> Я понимаю, что в цепочке есть оплаченные счета, и беру ответственность за их удаление.
                      </span>
                    </label>
                  )}
                </div>
              ) : (
                <div
                  style={{
                    background: '#ecfdf5',
                    border: '1px solid #a7f3d0',
                    borderRadius: 12,
                    padding: '12px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    fontSize: 13,
                    color: '#065f46'
                  }}
                >
                  <CheckCircle size={16} color="#059669" />
                  <span>Правила соблюдены: Никаких препятствий нет. Данные готовы к безопасному удалению.</span>
                </div>
              )}

              {/* Topological Leaves-First Sequence */}
              <div
                style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: 12,
                  padding: 14
                }}
              >
                <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: 8 }}>
                  Безопасный порядок удаления (снизу вверх)
                </div>
                <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
                  {analysis.deletionOrder.map((tbl, idx) => (
                    <React.Fragment key={tbl}>
                      <span className="badge-soft badge-soft-indigo" style={{ fontSize: 11 }}>
                        {idx + 1}. {tbl}
                      </span>
                      {idx < analysis.deletionOrder.length - 1 && (
                        <ArrowRight size={12} color="#94a3b8" />
                      )}
                    </React.Fragment>
                  ))}
                </div>
              </div>

              {/* Execution Result Log */}
              {executionResult && (
                <div
                  className="animate-soft-in"
                  style={{
                    background: '#ecfdf5',
                    border: '1px solid #a7f3d0',
                    borderRadius: 12,
                    padding: 18
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <CheckCircle size={18} color="#059669" />
                      <span style={{ fontWeight: 700, color: '#065f46' }}>
                        Каскадное удаление успешно выполнено ({executionResult.executionId})
                      </span>
                    </div>
                    <span className="badge-soft badge-soft-emerald">
                      {executionResult.durationMs} мс
                    </span>
                  </div>

                  <div style={{ fontSize: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {executionResult.traceSteps.map(step => (
                      <div
                        key={step.step}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 10,
                          color: '#475569'
                        }}
                      >
                        <span style={{ color: '#6366f1', fontWeight: 600 }}>[{step.step}]</span>
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
                <div style={{ padding: 14, background: '#fff1f2', border: '1px solid #fecdd3', borderRadius: 8, color: '#e11d48', fontSize: 13 }}>
                  <AlertTriangle size={16} style={{ display: 'inline', marginRight: 6 }} />
                  Транзакция отменена: {executionError}
                </div>
              )}
            </div>
          ) : null}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '16px 28px',
            borderTop: '1px solid #f1f5f9',
            background: '#f8fafc',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <button className="btn-soft btn-soft-secondary" onClick={onClose}>
            Закрыть
          </button>

          {!executionResult && (
            <button
              className="btn-soft btn-soft-danger"
              disabled={!canProceed || executing || loadingAnalysis}
              onClick={handleExecute}
              style={{
                opacity: (!canProceed || executing || loadingAnalysis) ? 0.45 : 1,
                cursor: (!canProceed || executing || loadingAnalysis) ? 'not-allowed' : 'pointer',
                padding: '10px 24px',
                fontSize: 13
              }}
            >
              {executing ? (
                <>
                  <RefreshCw className="animate-spin" size={14} /> Выполнение каскада...
                </>
              ) : (
                <>
                  <Zap size={14} /> Подтвердить и удалить
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
