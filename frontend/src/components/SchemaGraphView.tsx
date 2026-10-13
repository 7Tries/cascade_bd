import React, { useRef, useEffect, useState } from 'react';
import type { SchemaGraph } from '../api';
import { TABLE_TRANSLATIONS } from '../i18n';
import { Database, ArrowRight, ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';

interface SchemaGraphViewProps {
  graph: SchemaGraph;
  onSelectTable: (tableName: string) => void;
  selectedTable: string | null;
}

const CATEGORY_COLORS: Record<string, { bg: string; border: string; text: string; headerBg: string }> = {
  'Root Enterprise': { bg: '#ffffff', border: '#c7d2fe', text: '#4f46e5', headerBg: '#eef2ff' },
  'Division': { bg: '#ffffff', border: '#a7f3d0', text: '#059669', headerBg: '#ecfdf5' },
  'Personnel': { bg: '#ffffff', border: '#ddd6fe', text: '#7c3aed', headerBg: '#f5f3ff' },
  'Operation': { bg: '#ffffff', border: '#bae6fd', text: '#0284c7', headerBg: '#f0f9ff' },
  'Junction': { bg: '#ffffff', border: '#cbd5e1', text: '#475569', headerBg: '#f1f5f9' },
  'Execution': { bg: '#ffffff', border: '#fecdd3', text: '#e11d48', headerBg: '#fff1f2' },
  'Telemetry': { bg: '#ffffff', border: '#a5f3fc', text: '#0891b2', headerBg: '#ecfeff' },
  'Finance': { bg: '#ffffff', border: '#fde68a', text: '#d97706', headerBg: '#fffbeb' },
  'Evidence': { bg: '#ffffff', border: '#e2e8f0', text: '#64748b', headerBg: '#f8fafc' },
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
    const height = 720;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, width, height);

    // Soft warm subtle background grid
    ctx.fillStyle = '#fafbfc';
    ctx.fillRect(0, 0, width, height);

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
        ctx.strokeStyle = '#f43f5e';
        ctx.lineWidth = 2.5;
        ctx.shadowColor = 'rgba(244, 63, 94, 0.3)';
        ctx.shadowBlur = 6;
      } else if (isCyclic) {
        ctx.strokeStyle = '#a855f7';
        ctx.lineWidth = 1.6;
        ctx.shadowBlur = 0;
      } else {
        ctx.strokeStyle = '#cbd5e1';
        ctx.lineWidth = 1.3;
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
      ctx.fillStyle = isCascadingPath ? '#f43f5e' : (isCyclic ? '#a855f7' : '#94a3b8');
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
        ctx.fillStyle = edge.onDelete === 'RESTRICT' ? '#d97706' : (edge.onDelete === 'SET NULL' ? '#0284c7' : '#64748b');
        ctx.font = '10px JetBrains Mono, monospace';
        ctx.textAlign = 'center';
        ctx.fillText(`${edge.onDelete}`, midX, midY - 4);
        ctx.restore();
      }
    });

    ctx.setLineDash([]);
    ctx.shadowBlur = 0;

    // Draw Nodes (Soft Rounded Cards)
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

      // Card shadow
      if (isSelected || isHovered) {
        ctx.shadowColor = 'rgba(99, 102, 241, 0.25)';
        ctx.shadowBlur = 12;
      } else if (isDescendant) {
        ctx.shadowColor = 'rgba(244, 63, 94, 0.25)';
        ctx.shadowBlur = 10;
      } else {
        ctx.shadowColor = 'rgba(0, 0, 0, 0.04)';
        ctx.shadowBlur = 6;
      }

      ctx.fillStyle = isDescendant ? '#fff1f2' : (isSelected ? '#eef2ff' : '#ffffff');
      ctx.strokeStyle = isDescendant ? '#f43f5e' : (isSelected ? '#6366f1' : catColors.border);
      ctx.lineWidth = isSelected || isDescendant ? 2 : 1.2;

      ctx.beginPath();
      ctx.roundRect(rx, ry, nodeW, nodeH, 10);
      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Category top badge
      const russianCategory = TABLE_TRANSLATIONS[node.id]?.category || node.category;
      ctx.fillStyle = isDescendant ? '#e11d48' : catColors.text;
      ctx.font = '600 9px Plus Jakarta Sans, sans-serif';
      ctx.fillText(russianCategory.toUpperCase(), rx + 12, ry + 17);

      // Table Name
      ctx.fillStyle = isDescendant ? '#9f1239' : (isSelected ? '#3730a3' : '#1e293b');
      ctx.font = 'bold 13px Plus Jakarta Sans, sans-serif';
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
          <h2 style={{ fontSize: 18, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8, color: '#1e293b' }}>
            <Database size={20} color="#6366f1" /> Интерактивная карта зависимостей (DAG)
          </h2>
          <p style={{ fontSize: 13, color: '#64748b' }}>
            Наведите курсор на таблицу, чтобы подсветить цепочку каскадного удаления, или кликните для перехода к её данным.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button className="btn-soft btn-soft-secondary" onClick={() => setScale(s => Math.min(s + 0.15, 2))}>
            <ZoomIn size={14} /> Приблизить
          </button>
          <button className="btn-soft btn-soft-secondary" onClick={() => setScale(s => Math.max(s - 0.15, 0.5))}>
            <ZoomOut size={14} /> Отдалить
          </button>
          <button className="btn-soft btn-soft-secondary" onClick={() => { setScale(1); setOffset({ x: 30, y: 25 }); }}>
            <Maximize2 size={14} /> Сбросить вид
          </button>
        </div>
      </div>

      {/* Canvas Area */}
      <div
        className="soft-card"
        style={{
          position: 'relative',
          overflow: 'hidden',
          borderRadius: 16,
          background: '#fafbfc',
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
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(8px)',
            border: '1px solid #e2e8f0',
            padding: '12px 16px',
            borderRadius: 12,
            boxShadow: 'var(--shadow-sm)',
            fontSize: 12,
            display: 'flex',
            flexDirection: 'column',
            gap: 6
          }}
        >
          <div style={{ fontWeight: 700, fontSize: 11, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Подсказка по связям
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 14, height: 3, borderRadius: 2, background: '#f43f5e', display: 'inline-block' }} />
            <span style={{ color: '#334155' }}>Цепочка каскада (затронутые таблицы)</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 14, height: 2, borderBottom: '2px dashed #a855f7', display: 'inline-block' }} />
            <span style={{ color: '#334155' }}>Циклическая связь (безопасное расцепление)</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 8, height: 8, borderRadius: 2, background: '#d97706', display: 'inline-block' }} />
            <span style={{ color: '#334155' }}>Защита RESTRICT (оплаченные инвойсы)</span>
          </div>
        </div>

        {/* Selected Table Inspector Card */}
        {selectedTable && (
          <div
            className="animate-soft-in"
            style={{
              position: 'absolute',
              top: 16,
              right: 16,
              width: 320,
              background: 'rgba(255, 255, 255, 0.98)',
              backdropFilter: 'blur(12px)',
              border: '1px solid #c7d2fe',
              padding: 18,
              borderRadius: 14,
              boxShadow: 'var(--shadow-card-hover)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <span className="badge-soft badge-soft-indigo">Выбранная таблица</span>
              <button
                className="btn-soft btn-soft-secondary"
                style={{ padding: '2px 8px', fontSize: 11, borderRadius: 6 }}
                onClick={() => onSelectTable('')}
              >
                ✕
              </button>
            </div>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#1e293b' }}>
              {selectedTable}
            </div>
            <div style={{ fontSize: 12, color: '#64748b', marginTop: 4, marginBottom: 12 }}>
              {selectedMeta?.desc || graph.nodes.find(n => n.id === selectedTable)?.description}
            </div>

            <div style={{ fontSize: 12, marginBottom: 8, color: '#475569' }}>
              <span>Зависимых таблиц: </span>
              <strong style={{ color: cascadeDescendants.size > 0 ? '#e11d48' : '#059669' }}>
                {cascadeDescendants.size}
              </strong>
            </div>

            {cascadeDescendants.size > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 16 }}>
                {Array.from(cascadeDescendants).map(d => (
                  <span key={d} className="badge-soft badge-soft-rose" style={{ fontSize: 10 }}>
                    {d}
                  </span>
                ))}
              </div>
            )}

            <button
              className="btn-soft btn-soft-primary"
              style={{ width: '100%', fontSize: 12 }}
              onClick={() => onSelectTable(selectedTable)}
            >
              Открыть строки таблицы <ArrowRight size={14} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
