import React from 'react';
import { Zap, Database, ShieldCheck, Sparkles, Layers, History, CheckCircle2 } from 'lucide-react';

interface ParallaxHeroProps {
  onOpenSimulator: () => void;
  onExploreGraph: () => void;
  healthScore: number;
  totalTables: number;
}

export const ParallaxHero: React.FC<ParallaxHeroProps> = ({
  onOpenSimulator,
  onExploreGraph,
  healthScore,
  totalTables
}) => {
  return (
    <section
      style={{
        padding: '36px 24px 28px',
        maxWidth: 1400,
        margin: '0 auto',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: 28
      }}
    >
      {/* Gentle Welcome Banner */}
      <div
        className="soft-card"
        style={{
          padding: '32px 36px',
          background: 'linear-gradient(135deg, #ffffff 0%, #f5f3ff 50%, #eff6ff 100%)',
          border: '1px solid #e0e7ff',
          display: 'flex',
          flexDirection: 'column',
          gap: 24,
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        <div style={{ maxWidth: 820, zIndex: 1 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
            <span className="badge-soft badge-soft-indigo">
              <Sparkles size={13} /> Интеллектуальный каскадный движок
            </span>
            <span className="badge-soft badge-soft-emerald">
              <ShieldCheck size={13} /> ACID Гарантия целостности
            </span>
          </div>

          <h1
            style={{
              fontSize: 'clamp(28px, 4vw, 42px)',
              fontWeight: 800,
              color: '#1e293b',
              lineHeight: 1.2,
              marginBottom: 12
            }}
          >
            Безопасное каскадное удаление данных
          </h1>

          <p style={{ fontSize: 15, color: '#64748b', lineHeight: 1.6, maxWidth: 700 }}>
            Удаляйте сложные цепочки связанных сущностей (отделы, проекты, задачи и документы) без риска сломать базу данных. 
            Система заранее проверит зависимости, защитит оплаченные счета и позволит отменить удаление в один клик.
          </p>

          {/* Action Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 22, flexWrap: 'wrap' }}>
            <button className="btn-soft btn-soft-primary" onClick={onOpenSimulator}>
              <Zap size={16} /> Проверить в симуляторе
            </button>

            <button className="btn-soft btn-soft-secondary" onClick={onExploreGraph}>
              <Database size={16} color="#6366f1" /> Посмотреть граф связей
            </button>
          </div>
        </div>

        {/* Floating Metrics Cards */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: 14,
            paddingTop: 20,
            borderTop: '1px solid rgba(226, 232, 240, 0.8)',
            zIndex: 1
          }}
        >
          <div
            style={{
              padding: '12px 16px',
              borderRadius: 12,
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              boxShadow: 'var(--shadow-sm)'
            }}
          >
            <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase' }}>
              Состояние базы
            </div>
            <div style={{ fontSize: 20, fontWeight: 700, color: '#059669', display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
              <CheckCircle2 size={18} /> {healthScore}% Здорова
            </div>
          </div>

          <div
            style={{
              padding: '12px 16px',
              borderRadius: 12,
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              boxShadow: 'var(--shadow-sm)'
            }}
          >
            <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase' }}>
              Таблиц в системе
            </div>
            <div style={{ fontSize: 20, fontWeight: 700, color: '#4f46e5', display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
              <Layers size={18} /> {totalTables} связанных
            </div>
          </div>

          <div
            style={{
              padding: '12px 16px',
              borderRadius: 12,
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              boxShadow: 'var(--shadow-sm)'
            }}
          >
            <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase' }}>
              Защита от ошибок
            </div>
            <div style={{ fontSize: 20, fontWeight: 700, color: '#0284c7', display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
              <ShieldCheck size={18} /> 0 сломанных связей
            </div>
          </div>

          <div
            style={{
              padding: '12px 16px',
              borderRadius: 12,
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              boxShadow: 'var(--shadow-sm)'
            }}
          >
            <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase' }}>
              Безопасность
            </div>
            <div style={{ fontSize: 20, fontWeight: 700, color: '#d97706', display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
              <History size={18} /> Откат в 1 клик
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
