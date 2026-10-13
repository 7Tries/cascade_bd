import React from 'react';
import type { DbInfo } from '../api';
import { Zap, GitGraph, RotateCcw, CheckCircle2, ShieldCheck, Database, Layers } from 'lucide-react';

interface ParallaxHeroProps {
  onOpenSimulator: () => void;
  onExploreGraph: () => void;
  onOpenDbModal?: () => void;
  healthScore: number;
  totalTables: number;
  dbInfo?: DbInfo | null;
}

export const ParallaxHero: React.FC<ParallaxHeroProps> = ({
  onOpenSimulator,
  onExploreGraph,
  onOpenDbModal,
  healthScore,
  totalTables,
  dbInfo
}) => {
  return (
    <section
      style={{
        maxWidth: 1400,
        margin: '0 auto',
        padding: '24px 24px 16px',
        width: '100%'
      }}
    >
      <div
        className="studio-card"
        style={{
          padding: '24px 28px',
          background: 'linear-gradient(180deg, #ffffff 0%, #fafafa 100%)',
          display: 'flex',
          flexDirection: 'column',
          gap: 20
        }}
      >
        {/* Top Header Row */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
          <div style={{ maxWidth: 760 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <span className="status-pill status-pill-neutral mono-text" style={{ fontSize: 11 }}>
                v1.0.4-prod
              </span>
              <span className="status-pill status-pill-emerald">
                <CheckCircle2 size={12} /> Физическая целостность подтверждена
              </span>
            </div>

            <h1 style={{ fontSize: 22, fontWeight: 600, color: '#0f172a', marginBottom: 6 }}>
              Инженерная консоль каскадного удаления
            </h1>
            <p style={{ fontSize: 13, color: '#475569', lineHeight: 1.5 }}>
              Инструмент для безопасного иерархического удаления данных в реляционных базах. Автоматически строит граф зависимостей, расцепляет циклические связи и предотвращает появление записей-сирот.
            </p>
          </div>

          {/* Quick Utility Actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {onOpenDbModal && (
              <button
                className="btn-ui btn-ui-secondary"
                onClick={onOpenDbModal}
                title="Параметры подключения и инструкция для DBeaver"
              >
                <Database size={14} color="#0284c7" /> DBeaver (Postgres)
              </button>
            )}
            <button className="btn-ui btn-ui-secondary" onClick={onExploreGraph}>
              <GitGraph size={14} color="#475569" /> Карта связей
            </button>
            <button className="btn-ui btn-ui-primary" onClick={onOpenSimulator}>
              <Zap size={14} color="#f59e0b" /> Запустить симулятор
            </button>
          </div>
        </div>

        {/* Live System Metrics Bar */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: 12,
            paddingTop: 16,
            borderTop: '1px solid #f1f5f9'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
            <ShieldCheck size={18} color="#059669" />
            <div>
              <div style={{ fontSize: 11, color: '#64748b' }}>Индекс целостности</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#0f172a' }}>{healthScore}% Норма</div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
            <Layers size={18} color="#2563eb" />
            <div>
              <div style={{ fontSize: 11, color: '#64748b' }}>Контроль схемы</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#0f172a' }}>{totalTables} связанных таблиц</div>
            </div>
          </div>

          <div
            onClick={onOpenDbModal}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '8px 12px',
              background: '#f8fafc',
              borderRadius: 8,
              border: '1px solid #e2e8f0',
              cursor: onOpenDbModal ? 'pointer' : 'default',
              transition: 'border-color 0.15s ease'
            }}
            title={onOpenDbModal ? 'Открыть параметры DBeaver' : undefined}
          >
            <Database size={18} color="#0284c7" />
            <div>
              <div style={{ fontSize: 11, color: '#64748b' }}>База данных (СУБД)</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 6 }}>
                <span>{dbInfo?.engine || 'PostgreSQL 16'}</span>
                <span className="status-pill status-pill-sky" style={{ fontSize: 10, padding: '1px 6px' }}>
                  {dbInfo?.isPostgres ? 'DBeaver' : 'WAL'}
                </span>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
            <RotateCcw size={18} color="#d97706" />
            <div>
              <div style={{ fontSize: 11, color: '#64748b' }}>Защита от потери</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#0f172a' }}>Point-in-Time откат</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
