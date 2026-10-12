import React, { useState, useEffect } from 'react';
import { ArrowDown, Zap, Database, ShieldCheck } from 'lucide-react';

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
  const [scrollY, setScrollY] = useState(0);
  const [touchOffset, setTouchOffset] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const [touchStartY, setTouchStartY] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Touch Swipe gestures
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStartY(e.touches[0].clientY);
    setIsSwiping(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isSwiping) return;
    const currentY = e.touches[0].clientY;
    const delta = currentY - touchStartY;
    // Dampen touch offset
    setTouchOffset(delta * 0.4);
  };

  const handleTouchEnd = () => {
    setIsSwiping(false);
    // Smooth reset or snap
    setTouchOffset(0);
  };

  // Combined parallax offset
  const parallaxBase = scrollY * 0.4 + touchOffset;
  const watermarkOffset = scrollY * -0.2 - touchOffset * 0.3;
  const badgesOffset = scrollY * 0.65;

  return (
    <section
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{
        position: 'relative',
        minHeight: '82vh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '30px 24px 48px',
        maxWidth: 1400,
        margin: '0 auto',
        width: '100%',
        overflow: 'hidden',
        userSelect: 'none'
      }}
    >
      {/* Background Parallax Watermark Typography */}
      <div
        style={{
          position: 'absolute',
          top: '20%',
          left: '-5%',
          right: '-5%',
          pointerEvents: 'none',
          fontFamily: 'var(--font-headline)',
          fontSize: 'clamp(90px, 20vw, 240px)',
          fontWeight: 900,
          textTransform: 'uppercase',
          color: 'rgba(255, 255, 255, 0.02)',
          lineHeight: 0.8,
          whiteSpace: 'nowrap',
          transform: `translateY(${watermarkOffset}px)`,
          transition: isSwiping ? 'none' : 'transform 0.15s ease-out',
          zIndex: 0
        }}
      >
        CASCADE ACID 100%
      </div>

      {/* Top Small Meta Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          zIndex: 2,
          paddingTop: 10
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <span className="mono-tag" style={{ color: 'var(--text-muted)' }}>
            [ МЫ ОБЕСПЕЧИВАЕМ ]
          </span>
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '0.04em' }}>
            ACID РЕЛЯЦИОННЫЙ ДВИЖОК
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span className="mono-tag" style={{ color: 'var(--text-muted)' }}>
            [ СУБД 2026 © ]
          </span>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '4px 12px',
              borderRadius: 9999,
              border: '1px solid rgba(0, 230, 118, 0.35)',
              background: 'rgba(0, 230, 118, 0.06)',
              fontSize: 11,
              fontFamily: 'var(--font-mono)',
              color: '#00e676',
              fontWeight: 700
            }}
          >
            <ShieldCheck size={13} />
            <span>ЗДОРОВЬЕ: {healthScore}%</span>
          </div>
        </div>
      </div>

      {/* Massive Editorial Headline with Parallax Offset */}
      <div
        style={{
          transform: `translateY(${parallaxBase}px)`,
          transition: isSwiping ? 'none' : 'transform 0.1s ease-out',
          zIndex: 2,
          margin: '36px 0 24px'
        }}
      >
        <h1
          className="display-title"
          style={{
            fontSize: 'clamp(54px, 12.5vw, 150px)',
            letterSpacing: '-0.035em',
            lineHeight: 0.86,
            textShadow: '0 10px 40px rgba(0, 0, 0, 0.8)'
          }}
        >
          КАСКАДНОЕ
          <br />
          УДАЛЕНИЕ
        </h1>
      </div>

      {/* Lower Subtitle, Copy & Yellow Pill Action (Styled like Reference) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          alignItems: 'flex-end',
          gap: 28,
          zIndex: 2,
          borderTop: '1px solid var(--border-subtle)',
          paddingTop: 24,
          transform: `translateY(${badgesOffset * 0.25}px)`,
          transition: 'transform 0.2s ease-out'
        }}
      >
        {/* Left Tag */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <span className="mono-tag" style={{ color: '#ffffff' }}>
            [ EST. '26 КАСКАД / ACID ]
          </span>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', maxWidth: 360 }}>
            Автоматическое построение графа зависимостей, расцепление циклов и гарантия 0 висячих внешних ключей.
          </p>
        </div>

        {/* Center/Right Statement & Signature Yellow Pill CTA */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <p style={{ fontSize: 14, color: 'var(--text-primary)', lineHeight: 1.5, maxWidth: 520 }}>
            Мы работаем со сложными циклическими и полиморфными иерархиями данных. Никаких orphan-записей, lock deadlocks или утечки бизнес-правил.
          </p>

          <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
            {/* The signature Yellow Pill from the user screenshot */}
            <button className="pill-btn pill-btn-yellow" onClick={onOpenSimulator}>
              <Zap size={14} /> СИМУЛЯТОР УДАЛЕНИЯ
            </button>

            <button className="pill-btn pill-btn-white" onClick={onExploreGraph}>
              <Database size={14} /> ГРАФ БД ({totalTables} ТАБЛИЦ)
            </button>
          </div>
        </div>
      </div>

      {/* Subtle Swipe Down Indicator */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          marginTop: 20,
          opacity: Math.max(0.2, 1 - scrollY / 150),
          transition: 'opacity 0.2s ease'
        }}
      >
        <ArrowDown size={14} style={{ color: 'var(--text-muted)' }} />
        <span className="mono-tag" style={{ fontSize: 10, color: 'var(--text-muted)' }}>
          ЛИСТАЙТЕ ВНИЗ ДЛЯ ДОСТУПА К ТАБЛИЦАМ И АУДИТУ
        </span>
      </div>
    </section>
  );
};
