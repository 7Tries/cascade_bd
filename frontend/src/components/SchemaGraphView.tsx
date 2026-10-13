import React, { useRef, useEffect, useState } from 'react';
import type { SchemaGraph } from '../api';
import { TABLE_TRANSLATIONS } from '../i18n';
import { Database, ArrowRight, ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';

interface SchemaGraphViewProps {
  graph: SchemaGraph;
  onSelectTable: (tableName: string) => void;
  selectedTable: string | null;
}

const CATEGORY_COLORS: Record<string, { border: string; text: string; bg: string }> = {
  'Root Enterprise': { border: '#cbd5e1', text: '#2563eb', bg: '#eff6ff' },
  'Division': { border: '#cbd5e1', text: '#059669', bg: '#ecfdf5' },
  'Personnel': { border: '#cbd5e1', text: '#7c3aed', bg: '#f5f3ff' },
  'Operation': { border: '#cbd5e1', text: '#0284c7', bg: '#f0f9ff' },
  'Junction': { border: '#cbd5e1', text: '#475569', bg: '#f1f5f9' },
  'Execution': { border: '#cbd5e1', text: '#e11d48', bg: '#fff1f2' },
  'Telemetry': { border: '#cbd5e1', text: '#0891b2', bg: '#ecfeff' },
  'Finance': { border: '#cbd5e1', text: '#d97706', bg: '#fffbeb' },
  'Evidence': { border: '#cbd5e1', text: '#64748b', bg: '#f8fafc' },
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

    // Studio grid background
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
        ctx.strokeStyle = '#dc2626';
        ctx.lineWidth = 2.2;
      } else if (isCyclic) {
        ctx.strokeStyle = '#7c3aed';
        ctx.lineWidth = 1.4;
      } else {
        ctx.strokeStyle = '#cbd5e1';
        ctx.lineWidth = 1.2;
      }

      const cpY = (p1.y + p2.y) / 2;
      ctx.moveTo(p1.x, p1.y + 25);
      ctx.bezierCurveTo(p1.x, cpY, p2.x, cpY, p2.x, p2.y - 25);
      ctx.stroke();

      // Sharp directional arrow
      const arrowX = p2.x;
      const arrowY = p2.y - 25;
      ctx.save();
      ctx.translate(arrowX, arrowY);
      ctx.fillStyle = isCascadingPath ? '#dc2626' : (isCyclic ? '#7c3aed' : '#94a3b8');
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(-4, -7);
      ctx.lineTo(4, -7);
      ctx.closePath();
      ctx.fill();
      ctx.restore();

      if (isCascadingPath || edge.onDelete !== 'CASCADE') {
        const midX = (p1.x + p2.x) / 2;
        const midY = (p1.y + p2.y) / 2;
        ctx.save();
        ctx.fillStyle = edge.onDelete === 'RESTRICT' ? '#d97706' : (edge.onDelete === 'SET NULL' ? '#0284c7' : '#475569');
        ctx.font = '500 10px JetBrains Mono, monospace';
        ctx.textAlign = 'center';
        ctx.fillText(`${edge.onDelete}`, midX, midY - 4);
        ctx.restore();
      }
    });

    ctx.setLineDash([]);

    // Draw Nodes (Studio Cards)
    graph.nodes.forEach(node => {
      const pos = nodePositions[node.id];
      if (!pos) return;

      const isSelected = selectedTable === node.id;
      const isHovered = hoveredNode === node.id;
      const isDescendant = cascadeDescendants.has(node.id);
      const catColors = CATEGORY_COLORS[node.category] || CATEGORY_COLORS['Evidence'];

      const nodeW = 196;
      const nodeH = 54;
      const rx = pos.x - nodeW / 2;
      const ry = pos.y - nodeH / 2;

      ctx.save();

      // Card Fill & Stroke
      if (isDescendant) {
        ctx.fillStyle = '#fef2f2';
        ctx.strokeStyle = '#f87171';
        ctx.lineWidth = 1.5;
      } else if (isSelected) {
        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 2;
      } else if (isHovered) {
        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = '#475569';
        ctx.lineWidth = 1.5;
      } else {
        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = '#e2e8f0';
        ctx.lineWidth = 1;
      }

      ctx.beginPath();
      ctx.roundRect(rx, ry, nodeW, nodeH, 8);
      ctx.fill();
      ctx.stroke();

      // Category Pill
      const russianCategory = TABLE_TRANSLATIONS[node.id]?.category || node.category;
      ctx.fillStyle = isDescendant ? '#dc2626' : catColors.text;
      ctx.font = '600 9px Inter, -apple-system, sans-serif';
      ctx.fillText(russianCategory.toUpperCase(), rx + 12, ry + 16);

      // Table Name
      ctx.fillStyle = isDescendant ? '#991b1b' : (isSelected ? '#0f172a' : '#1e293b');
      ctx.font = '600 13px Inter, -apple-system, sans-serif';
      ctx.fillText(node.label, rx + 12, ry + 36);

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
          mouseY >= pos.y - 27 &&
          mouseY <= pos.y + 27
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Header Controls */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontSize: 16, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8, color: '#0f172a' }}>
            <Database size={16} color="#0f172a" /> Карта связей реляционной схемы (DAG)
          </h2>
          <p style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
            Наведите курсор на таблицу для симуляции пути каскада. Кликните для фильтрации данных таблицы.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <button className="btn-ui btn-ui-secondary" onClick={() => setScale(s => Math.min(s + 0.15, 2))}>
            <ZoomIn size={13} /> Увеличить
          </button>
          <button className="btn-ui btn-ui-secondary" onClick={() => setScale(s => Math.max(s - 0.15, 0.5))}>
            <ZoomOut size={13} /> Уменьшить
          </button>
          <button className="btn-ui btn-ui-secondary" onClick={() => { setScale(1); setOffset({ x: 30, y: 25 }); }}>
            <Maximize2 size={13} /> Сбросить вид
          </button>
        </div>
      </div>

      {/* Canvas Card */}
      <div
        className="studio-card"
        style={{
          position: 'relative',
          overflow: 'hidden',
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
            bottom: 14,
            left: 14,
            background: 'rgba(255, 255, 255, 0.94)',
            backdropFilter: 'blur(8px)',
            border: '1px solid var(--border-light)',
            padding: '10px 14px',
            borderRadius: 8,
            boxShadow: 'var(--shadow-xs)',
            fontSize: 11,
            display: 'flex',
            flexDirection: 'column',
            gap: 5
          }}
        >
          <div style={{ fontWeight: 600, fontSize: 10, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Легенда связей схемы
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 14, height: 2, background: '#dc2626', display: 'inline-block' }} />
            <span style={{ color: '#334155' }}>Цепочка каскада (затронутые таблицы)</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 14, height: 2, borderBottom: '2px dashed #7c3aed', display: 'inline-block' }} />
            <span style={{ color: '#334155' }}>Циклическая связь (авто-расцепление)</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 6, height: 6, borderRadius: 2, background: '#d97706', display: 'inline-block' }} />
            <span style={{ color: '#334155' }}>Ограничение RESTRICT (бизнес-правило)</span>
          </div>
        </div>

        {/* Selected Table Inspector Card */}
        {selectedTable && (
          <div
            className="studio-card animate-enter"
            style={{
              position: 'absolute',
              top: 14,
              right: 14,
              width: 310,
              padding: 16,
              background: 'rgba(255, 255, 255, 0.96)',
              backdropFilter: 'blur(8px)',
              boxShadow: 'var(--shadow-card-hover)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <span className="status-pill status-pill-neutral mono-text" style={{ fontSize: 10 }}>
                {selectedMeta?.category || 'TABLE'}
              </span>
              <button
                className="btn-ui btn-ui-ghost"
                style={{ padding: '2px 6px', fontSize: 12 }}
                onClick={() => onSelectTable('')}
              >
                ✕
              </button>
            </div>
            <div style={{ fontSize: 15, fontWeight: 600, color: '#0f172a' }}>
              {selectedTable}
            </div>
            <div style={{ fontSize: 12, color: '#64748b', marginTop: 4, marginBottom: 12, lineHeight: 1.4 }}>
              {selectedMeta?.desc || graph.nodes.find(n => n.id === selectedTable)?.description}
            </div>

            <div style={{ fontSize: 12, marginBottom: 8, color: '#475569' }}>
              <span>Зависимых таблиц: </span>
              <strong style={{ color: cascadeDescendants.size > 0 ? '#dc2626' : '#059669' }}>
                {cascadeDescendants.size}
              </strong>
            </div>

            {cascadeDescendants.size > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 14 }}>
                {Array.from(cascadeDescendants).map(d => (
                  <span key={d} className="status-pill status-pill-rose mono-text" style={{ fontSize: 10 }}>
                    {d}
                  </span>
                ))}
              </div>
            )}

            <button
              className="btn-ui btn-ui-primary"
              style={{ width: '100%', fontSize: 12 }}
              onClick={() => onSelectTable(selectedTable)}
            >
              Перейти к строкам таблицы <ArrowRight size={13} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
