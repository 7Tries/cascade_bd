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
  const [reason, setReason] = useState('Административное каскадное удаление');
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
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        backdropFilter: 'blur(10px)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20
      }}
    >
      <div
        className="editorial-card animate-fade-in"
        style={{
          width: '100%',
          maxWidth: 960,
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          background: '#090909',
          border: '1px solid rgba(255, 255, 255, 0.25)',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.95)'
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '20px 28px',
            borderBottom: '1px solid var(--border-light)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: '#050505'
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span className="badge-tag badge-tag-yellow">СТУДИЯ КАСКАДА</span>
              <span className="mono-tag" style={{ color: 'var(--text-muted)' }}>ЦЕЛЬ:</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#ffffff' }}>
                {table} #{id} ({label})
              </span>
            </div>
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>
              Префлайт-анализ графа, проверка инвариантов бизнес-логики и транзакционное удаление «Листья-Вперёд».
            </p>
          </div>

          <button className="pill-btn" onClick={onClose} style={{ padding: '6px 10px' }}>
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: 28, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 22 }}>
          {/* Strategy Selection */}
          <div>
            <label className="mono-tag" style={{ color: 'var(--text-secondary)', marginBottom: 10, display: 'block' }}>
              ВЫБОР СТРАТЕГИИ КАСКАДНОГО УДАЛЕНИЯ
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 10 }}>
              {[
                {
                  id: 'HARD_CASCADE',
                  title: 'Физический каскад',
                  desc: 'Топологическое удаление листьев с 2-фазным обнулением циклов и проверкой PRAGMA.',
                  icon: Zap,
                  accent: '#ff3344'
                },
                {
                  id: 'ARCHIVE_AND_HARD_DELETE',
                  title: 'Архивация и удаление',
                  desc: 'Полный криптографический снапшот в журнал аудита перед удалением. Откат в 1 клик.',
                  icon: FileText,
                  accent: '#ffd000'
                },
                {
                  id: 'SOFT_CASCADE',
                  title: 'Логический Soft-Delete',
                  desc: 'Рекурсивная простановка флага is_deleted=1. Физические строки сохраняются.',
                  icon: ShieldAlert,
                  accent: '#00e676'
                },
                {
                  id: 'SAFE_NULLIFY',
                  title: 'Безопасный Set Null',
                  desc: 'Обнуление внешних ключей у дочерних строк; удаление только корня.',
                  icon: GitBranch,
                  accent: '#2979ff'
                }
              ].map(opt => {
                const Icon = opt.icon;
                const active = policy === opt.id;
                return (
                  <div
                    key={opt.id}
                    onClick={() => setPolicy(opt.id)}
                    style={{
                      background: active ? '#141414' : '#080808',
                      border: `1px solid ${active ? opt.accent : 'var(--border-subtle)'}`,
                      borderRadius: 4,
                      padding: 14,
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                      <Icon size={16} color={opt.accent} />
                      <span style={{ fontSize: 13, fontWeight: 700, color: active ? '#ffffff' : 'var(--text-secondary)' }}>
                        {opt.title}
                      </span>
                    </div>
                    <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>{opt.desc}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Audit Reason */}
          <div>
            <label className="mono-tag" style={{ color: 'var(--text-secondary)', marginBottom: 6, display: 'block' }}>
              ПРИЧИНА / ОБОСНОВАНИЕ ДЛЯ ЖУРНАЛА АУДИТА
            </label>
            <input
              type="text"
              className="input-editorial"
              style={{ width: '100%' }}
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="Например: GDPR Право на забвение / Реорганизация структуры холдинга #SEC-2026"
            />
          </div>

          {/* Dry Run Simulator Results */}
          {loadingAnalysis ? (
            <div style={{ padding: 36, textAlign: 'center', color: 'var(--text-secondary)' }}>
              <RefreshCw className="animate-spin" size={24} style={{ margin: '0 auto 8px' }} />
              Симуляция каскадного обхода графа зависимостей...
            </div>
          ) : analysisError ? (
            <div style={{ padding: 16, background: 'rgba(255, 51, 68, 0.1)', border: '1px solid #ff3344', borderRadius: 4 }}>
              <AlertTriangle size={18} color="#ff3344" style={{ marginBottom: 4 }} />
              <div style={{ color: '#ff3344', fontWeight: 700 }}>Ошибка префлайт-анализа</div>
              <div style={{ fontSize: 13, color: '#ffffff' }}>{analysisError}</div>
            </div>
          ) : analysis ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              {/* Stat Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
                <div className="editorial-card" style={{ padding: '14px 18px', borderLeft: '3px solid #ff3344' }}>
                  <div className="mono-tag" style={{ color: 'var(--text-muted)' }}>ЗАТРОНУТО СТРОК</div>
                  <div style={{ fontSize: 26, fontWeight: 800, color: '#ffffff', fontFamily: 'var(--font-mono)', marginTop: 4 }}>
                    {analysis.totalAffected}
                  </div>
                </div>

                <div className="editorial-card" style={{ padding: '14px 18px', borderLeft: '3px solid #2979ff' }}>
                  <div className="mono-tag" style={{ color: 'var(--text-muted)' }}>ГЛУБИНА ДЕРЕВА</div>
                  <div style={{ fontSize: 26, fontWeight: 800, color: '#ffffff', fontFamily: 'var(--font-mono)', marginTop: 4 }}>
                    {analysis.maxDepth} уровней
                  </div>
                </div>

                <div className="editorial-card" style={{ padding: '14px 18px', borderLeft: '3px solid #00e676' }}>
                  <div className="mono-tag" style={{ color: 'var(--text-muted)' }}>ТАБЛИЦ В ЦЕПОЧКЕ</div>
                  <div style={{ fontSize: 26, fontWeight: 800, color: '#ffffff', fontFamily: 'var(--font-mono)', marginTop: 4 }}>
                    {analysis.impactedTables.length}
                  </div>
                </div>

                <div className="editorial-card" style={{ padding: '14px 18px', borderLeft: '3px solid #ffd000' }}>
                  <div className="mono-tag" style={{ color: 'var(--text-muted)' }}>ЦИКЛИЧЕСКИХ СВЯЗЕЙ</div>
                  <div style={{ fontSize: 26, fontWeight: 800, color: '#ffffff', fontFamily: 'var(--font-mono)', marginTop: 4 }}>
                    {analysis.cyclicEdgesToUnlink} обнулено
                  </div>
                </div>
              </div>

              {/* Table Breakdown Pills */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
                <span className="mono-tag" style={{ color: 'var(--text-muted)' }}>РАСПРЕДЕЛЕНИЕ:</span>
                {Object.entries(analysis.affectedCounts).map(([tbl, cnt]) => (
                  <span key={tbl} className="badge-tag" style={{ fontSize: 11 }}>
                    {tbl}: <strong style={{ color: '#ffffff', marginLeft: 4 }}>{cnt}</strong>
                  </span>
                ))}
              </div>

              {/* Logical Invariant Compliance Guardrails */}
              {analysis.violations.length > 0 ? (
                <div
                  style={{
                    background: 'rgba(255, 51, 68, 0.08)',
                    border: '1px solid rgba(255, 51, 68, 0.4)',
                    borderRadius: 4,
                    padding: 16
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <ShieldAlert size={18} color="#ff3344" />
                    <span style={{ fontWeight: 700, color: '#ff3344', fontSize: 13 }}>
                      ОБНАРУЖЕНЫ БЛОКЕРЫ ЛОГИЧЕСКОЙ ЦЕЛОСТНОСТИ ({analysis.violations.length})
                    </span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
                    {analysis.violations.map((v, idx) => (
                      <div
                        key={idx}
                        style={{
                          fontSize: 12,
                          background: '#040404',
                          padding: '10px 14px',
                          borderRadius: 4,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 10
                        }}
                      >
                        <span className={v.severity === 'CRITICAL_BLOCKER' ? 'badge-tag badge-tag-red' : 'badge-tag badge-tag-yellow'}>
                          {v.rule}
                        </span>
                        <span style={{ color: '#ededed' }}>{v.message}</span>
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
                        color: '#ffd000',
                        cursor: 'pointer',
                        padding: '8px 12px',
                        background: 'rgba(255, 208, 0, 0.08)',
                        borderRadius: 4
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={overrideViolations}
                        onChange={e => setOverrideViolations(e.target.checked)}
                      />
                      <span>
                        <strong>АВТОРИЗОВАТЬ ОВЕРРАЙД:</strong> Подтверждаю полномочия на принудительное удаление заблокированных документов.
                      </span>
                    </label>
                  )}
                </div>
              ) : (
                <div
                  style={{
                    background: 'rgba(0, 230, 118, 0.08)',
                    border: '1px solid rgba(0, 230, 118, 0.3)',
                    borderRadius: 4,
                    padding: '12px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    fontSize: 13,
                    color: '#00e676'
                  }}
                >
                  <CheckCircle size={16} />
                  <span>100% Соответствие бизнес-правилам: Блокирующих ограничений не обнаружено. Безопасно для исполнения.</span>
                </div>
              )}

              {/* Topological Leaves-First Sequence */}
              <div
                style={{
                  background: '#060606',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 4,
                  padding: 16
                }}
              >
                <div className="mono-tag" style={{ color: 'var(--text-secondary)', marginBottom: 10 }}>
                  ПОРЯДОК УДАЛЕНИЯ «ЛИСТЬЯ-ВПЕРЁД» (ТОПОЛОГИЧЕСКИЙ ГРАФ)
                </div>
                <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
                  {analysis.deletionOrder.map((tbl, idx) => (
                    <React.Fragment key={tbl}>
                      <span className="badge-tag badge-tag-yellow" style={{ fontSize: 11 }}>
                        {idx + 1}. {tbl}
                      </span>
                      {idx < analysis.deletionOrder.length - 1 && (
                        <ArrowRight size={12} color="var(--text-muted)" />
                      )}
                    </React.Fragment>
                  ))}
                </div>
              </div>

              {/* Execution Result Log */}
              {executionResult && (
                <div
                  className="animate-fade-in"
                  style={{
                    background: 'rgba(0, 230, 118, 0.08)',
                    border: '1px solid #00e676',
                    borderRadius: 4,
                    padding: 18
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <CheckCircle size={18} color="#00e676" />
                      <span style={{ fontWeight: 700, color: '#00e676' }}>
                        Каскадное удаление успешно выполнено ({executionResult.executionId})
                      </span>
                    </div>
                    <span className="badge-tag badge-tag-green">
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
                          fontFamily: 'var(--font-mono)',
                          color: 'var(--text-secondary)'
                        }}
                      >
                        <span style={{ color: '#ffd000' }}>[{step.step}]</span>
                        <span style={{ color: '#ededed' }}>{step.action}</span>
                        {step.status && (
                          <span style={{ color: '#00e676', marginLeft: 'auto', fontSize: 11 }}>
                            ✓ {step.status}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {executionError && (
                <div style={{ padding: 14, background: 'rgba(255, 51, 68, 0.2)', border: '1px solid #ff3344', borderRadius: 4, color: '#ff3344', fontSize: 13 }}>
                  <AlertTriangle size={16} style={{ display: 'inline', marginRight: 6 }} />
                  Транзакция отменена (Rollback): {executionError}
                </div>
              )}
            </div>
          ) : null}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '18px 28px',
            borderTop: '1px solid var(--border-light)',
            background: '#050505',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <button className="pill-btn pill-btn-white" onClick={onClose}>
            ЗАКРЫТЬ
          </button>

          {!executionResult && (
            <button
              className="pill-btn pill-btn-danger"
              disabled={!canProceed || executing || loadingAnalysis}
              onClick={handleExecute}
              style={{
                opacity: (!canProceed || executing || loadingAnalysis) ? 0.45 : 1,
                cursor: (!canProceed || executing || loadingAnalysis) ? 'not-allowed' : 'pointer',
                padding: '9px 24px',
                fontSize: 12
              }}
            >
              {executing ? (
                <>
                  <RefreshCw className="animate-spin" size={14} /> ВЫПОЛНЕНИЕ ACID КАСКАДА...
                </>
              ) : (
                <>
                  <Zap size={14} /> ИСПОЛНИТЬ КАСКАД ({policy})
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
