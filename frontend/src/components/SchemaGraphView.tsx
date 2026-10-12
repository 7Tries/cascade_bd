import React, { useRef, useEffect, useState } from 'react';
import type { SchemaGraph } from '../api';
import { TABLE_TRANSLATIONS } from '../i18n';
import { Database, ArrowRight, ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';

interface SchemaGraphViewProps {
  graph: SchemaGraph;
  onSelectTable: (tableName: string) => void;
  selectedTable: string | null;
}

const CATEGORY_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  'Root Enterprise': { bg: '#000000', border: '#ffffff', text: '#ffffff' },
  'Division': { bg: '#080808', border: '#00e676', text: '#00e676' },
  'Personnel': { bg: '#080808', border: '#ffd000', text: '#ffd000' },
  'Operation': { bg: '#080808', border: '#2979ff', text: '#2979ff' },
  'Junction': { bg: '#080808', border: '#e040fb', text: '#e040fb' },
  'Execution': { bg: '#080808', border: '#ff6d00', text: '#ff6d00' },
  'Telemetry': { bg: '#080808', border: '#00b0ff', text: '#00b0ff' },
  'Finance': { bg: '#080808', border: '#ffd000', text: '#ffd000' },
  'Evidence': { bg: '#080808', border: '#9e9e9e', text: '#e0e0e0' },
};

export const SchemaGraphView: React.FC<SchemaGraphViewProps> = ({ graph, onSelectTable, selectedTable }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 30, y: 25 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const [nodePositions, setNodePositions] = useState<Record<string, { x: number; y: number }>>({});

  useEffect(() => {
    const layers: string[][] = [
      ['organizations'],
      ['departments'],
      ['employees', 'projects'],
      ['project_assignments', 'tasks', 'invoices'],
      ['work_logs', 'payments', 'audit_attachments']
    ];

    const pos: Record<string, { x: number; y: number }> = {};
    const colSpacing = 280;
    const rowSpacing = 160;

    layers.forEach((layer, layerIdx) => {
      const startX = (1000 - (layer.length - 1) * colSpacing) / 2;
      layer.forEach((tbl, idx) => {
        pos[tbl] = {
          x: startX + idx * colSpacing,
          y: 70 + layerIdx * rowSpacing
        };
      });
    });

    let unplacedIdx = 0;
    graph.nodes.forEach(n => {
      if (!pos[n.id]) {
        pos[n.id] = { x: 100 + unplacedIdx * 250, y: 700 };
        unplacedIdx++;
      }
    });

    setNodePositions(pos);
  }, [graph]);

  const cascadeDescendants = React.useMemo(() => {
    const target = hoveredNode || selectedTable;
    if (!target) return new Set<string>();

    const descendants = new Set<string>();
    const queue = [target];
    while (queue.length > 0) {
      const curr = queue.shift()!;
      graph.edges.forEach(e => {
        if (e.source === curr && !descendants.has(e.target)) {
          descendants.add(e.target);
          queue.push(e.target);
        }
      });
    }
    return descendants;
  }, [hoveredNode, selectedTable, graph]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const width = canvas.parentElement?.clientWidth || 950;
    const height = 750;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, width, height);

    ctx.save();
    ctx.translate(offset.x, offset.y);
    ctx.scale(scale, scale);

    const activeTarget = hoveredNode || selectedTable;

    // Draw Edges
    graph.edges.forEach(edge => {
      const p1 = nodePositions[edge.source];
      const p2 = nodePositions[edge.target];
      if (!p1 || !p2) return;

      const isCascadingPath = activeTarget && (edge.source === activeTarget || cascadeDescendants.has(edge.source)) && cascadeDescendants.has(edge.target);
      const isCyclic = edge.isCyclic;

      ctx.beginPath();
      if (isCyclic) {
        ctx.setLineDash([4, 4]);
      } else {
        ctx.setLineDash([]);
      }

      if (isCascadingPath) {
        ctx.strokeStyle = '#ff3344';
        ctx.lineWidth = 2.5;
        ctx.shadowColor = '#ff3344';
        ctx.shadowBlur = 10;
      } else if (isCyclic) {
        ctx.strokeStyle = '#ffd000';
        ctx.lineWidth = 1.6;
        ctx.shadowBlur = 0;
      } else {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
        ctx.lineWidth = 1.2;
        ctx.shadowBlur = 0;
      }

      const cpY = (p1.y + p2.y) / 2;
      ctx.moveTo(p1.x, p1.y + 25);
      ctx.bezierCurveTo(p1.x, cpY, p2.x, cpY, p2.x, p2.y - 25);
      ctx.stroke();

      // Arrow
      const arrowX = p2.x;
      const arrowY = p2.y - 25;
      ctx.save();
      ctx.translate(arrowX, arrowY);
      ctx.fillStyle = isCascadingPath ? '#ff3344' : (isCyclic ? '#ffd000' : 'rgba(255, 255, 255, 0.5)');
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(-4, -8);
      ctx.lineTo(4, -8);
      ctx.closePath();
      ctx.fill();
      ctx.restore();

      if (isCascadingPath || edge.onDelete !== 'CASCADE') {
        const midX = (p1.x + p2.x) / 2;
        const midY = (p1.y + p2.y) / 2;
        ctx.save();
        ctx.fillStyle = edge.onDelete === 'RESTRICT' ? '#ffd000' : (edge.onDelete === 'SET NULL' ? '#2979ff' : '#999999');
        ctx.font = '10px JetBrains Mono';
        ctx.textAlign = 'center';
        ctx.fillText(`${edge.onDelete}`, midX, midY - 4);
        ctx.restore();
      }
    });

    ctx.setLineDash([]);
    ctx.shadowBlur = 0;

    // Draw Nodes
    graph.nodes.forEach(node => {
      const pos = nodePositions[node.id];
      if (!pos) return;

      const isSelected = selectedTable === node.id;
      const isHovered = hoveredNode === node.id;
      const isDescendant = cascadeDescendants.has(node.id);
      const catColors = CATEGORY_COLORS[node.category] || CATEGORY_COLORS['Evidence'];

      const nodeW = 196;
      const nodeH = 56;
      const rx = pos.x - nodeW / 2;
      const ry = pos.y - nodeH / 2;

      ctx.save();

      if (isSelected || isHovered) {
        ctx.shadowColor = '#ffffff';
        ctx.shadowBlur = 14;
      } else if (isDescendant) {
        ctx.shadowColor = '#ff3344';
        ctx.shadowBlur = 12;
      }

      ctx.fillStyle = isDescendant ? '#25080c' : (isSelected ? '#1c1c1c' : '#080808');
      ctx.strokeStyle = isDescendant ? '#ff3344' : (isSelected ? '#ffffff' : catColors.border);
      ctx.lineWidth = isSelected || isDescendant ? 2 : 1;

      ctx.beginPath();
      ctx.roundRect(rx, ry, nodeW, nodeH, 4);
      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Category top badge
      const russianCategory = TABLE_TRANSLATIONS[node.id]?.category || node.category;
      ctx.fillStyle = isDescendant ? '#ff8080' : catColors.text;
      ctx.font = '9px JetBrains Mono, monospace';
      ctx.fillText(russianCategory.toUpperCase(), rx + 12, ry + 17);

      // Table Name
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 13px JetBrains Mono, monospace';
      ctx.fillText(node.label, rx + 12, ry + 38);

      ctx.restore();
    });

    ctx.restore();
  }, [graph, nodePositions, selectedTable, hoveredNode, cascadeDescendants, scale, offset]);

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mouseX = (e.clientX - rect.left - offset.x) / scale;
    const mouseY = (e.clientY - rect.top - offset.y) / scale;

    if (isDragging) {
      setOffset({
        x: offset.x + (e.clientX - dragStart.x),
        y: offset.y + (e.clientY - dragStart.y)
      });
      setDragStart({ x: e.clientX, y: e.clientY });
      return;
    }

    let found: string | null = null;
    for (const node of graph.nodes) {
      const pos = nodePositions[node.id];
      if (pos) {
        if (
          mouseX >= pos.x - 98 &&
          mouseX <= pos.x + 98 &&
          mouseY >= pos.y - 28 &&
          mouseY <= pos.y + 28
        ) {
          found = node.id;
          break;
        }
      }
    }
    setHoveredNode(found);
  };

  const handleClick = () => {
    if (hoveredNode) {
      onSelectTable(hoveredNode);
    }
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const selectedMeta = selectedTable ? TABLE_TRANSLATIONS[selectedTable] : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Top Banner & Controls */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'var(--font-headline)' }}>
            <Database size={20} color="#ffd000" /> РЕЛЯЦИОННЫЙ ГРАФ ЗАВИСИМОСТЕЙ (DAG)
          </h2>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
            Наведите курсор для подсветки нисходящих каскадных путей или кликните для перехода к строкам таблицы.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button className="pill-btn pill-btn-white" onClick={() => setScale(s => Math.min(s + 0.15, 2))}>
            <ZoomIn size={14} /> МАСШТАБ +
          </button>
          <button className="pill-btn pill-btn-white" onClick={() => setScale(s => Math.max(s - 0.15, 0.5))}>
            <ZoomOut size={14} /> МАСШТАБ -
          </button>
          <button className="pill-btn pill-btn-white" onClick={() => { setScale(1); setOffset({ x: 30, y: 25 }); }}>
            <Maximize2 size={14} /> СБРОС
          </button>
        </div>
      </div>

      {/* Canvas Area */}
      <div
        className="editorial-card"
        style={{
          position: 'relative',
          overflow: 'hidden',
          background: '#040404',
          cursor: isDragging ? 'grabbing' : (hoveredNode ? 'pointer' : 'grab')
        }}
      >
        <canvas
          ref={canvasRef}
          onMouseMove={handleMouseMove}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onClick={handleClick}
          style={{ display: 'block', width: '100%', height: 680 }}
        />

        {/* Legend Overlay */}
        <div
          style={{
            position: 'absolute',
            bottom: 16,
            left: 16,
            background: 'rgba(0, 0, 0, 0.9)',
            border: '1px solid var(--border-light)',
            padding: '12px 16px',
            borderRadius: 4,
            fontSize: 11,
            display: 'flex',
            flexDirection: 'column',
            gap: 6
          }}
        >
          <div className="mono-tag" style={{ color: '#ffffff', marginBottom: 2 }}>
            ЛЕГЕНДА КАСКАДНЫХ СВЯЗЕЙ
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 14, height: 3, background: '#ff3344', display: 'inline-block' }} />
            <span>Путь каскадного удаления (Descendant Path)</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 14, height: 2, borderBottom: '2px dashed #ffd000', display: 'inline-block' }} />
            <span>Циклическая связь (2-фазное расцепление SET NULL)</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 8, height: 8, background: '#ffd000', display: 'inline-block' }} />
            <span>Ограничение RESTRICT (Финансовая защита)</span>
          </div>
        </div>

        {/* Selected Table Inspector Card */}
        {selectedTable && (
          <div
            style={{
              position: 'absolute',
              top: 16,
              right: 16,
              width: 320,
              background: '#0a0a0a',
              border: '1px solid rgba(255, 255, 255, 0.4)',
              padding: 18,
              borderRadius: 4,
              boxShadow: '0 10px 40px rgba(0, 0, 0, 0.9)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <span className="badge-tag badge-tag-yellow">ВЫБРАННАЯ СУЩНОСТЬ</span>
              <button
                className="pill-btn"
                style={{ padding: '2px 8px', fontSize: 11 }}
                onClick={() => onSelectTable('')}
              >
                ✕
              </button>
            </div>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#ffffff', fontFamily: 'var(--font-mono)' }}>
              {selectedTable}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4, marginBottom: 12 }}>
              {selectedMeta?.desc || graph.nodes.find(n => n.id === selectedTable)?.description}
            </div>

            <div style={{ fontSize: 12, marginBottom: 8 }}>
              <span style={{ color: 'var(--text-muted)' }}>Каскадных потомков: </span>
              <span style={{ fontWeight: 700, color: cascadeDescendants.size > 0 ? '#ff3344' : '#00e676' }}>
                {cascadeDescendants.size} таблиц(ы)
              </span>
            </div>

            {cascadeDescendants.size > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 16 }}>
                {Array.from(cascadeDescendants).map(d => (
                  <span key={d} className="badge-tag badge-tag-red" style={{ fontSize: 10 }}>
                    {d}
                  </span>
                ))}
              </div>
            )}

            <button
              className="pill-btn pill-btn-filled-white"
              style={{ width: '100%', fontSize: 12 }}
              onClick={() => onSelectTable(selectedTable)}
            >
              ОТКРЫТЬ СТРОКИ ТАБЛИЦЫ <ArrowRight size={14} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
