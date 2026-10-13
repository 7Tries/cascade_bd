import React, { useState, useEffect } from 'react';
import type { TableInfo } from '../api';
import { api } from '../api';
import { TABLE_TRANSLATIONS, STATUS_TRANSLATIONS } from '../i18n';
import { Table, Search, Trash2, Eye, EyeOff, AlertCircle } from 'lucide-react';

interface DataExplorerProps {
  tables: TableInfo[];
  selectedTable: string;
  onSelectTable: (table: string) => void;
  onOpenCascadeModal: (table: string, id: number, label: string) => void;
}

export const DataExplorer: React.FC<DataExplorerProps> = ({
  tables,
  selectedTable,
  onSelectTable,
  onOpenCascadeModal
}) => {
  const [tableData, setTableData] = useState<any[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showDeleted, setShowDeleted] = useState(false);

  useEffect(() => {
    if (!selectedTable) return;
    loadData();
  }, [selectedTable, showDeleted]);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await api.getTableData(selectedTable, showDeleted);
      setTableData(data.rows);
      if (data.rows.length > 0) {
        setColumns(Object.keys(data.rows[0]));
      } else {
        setColumns([]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const currentTableMeta = tables.find(t => t.name === selectedTable);
  const russianMeta = TABLE_TRANSLATIONS[selectedTable];

  const filteredRows = tableData.filter(row => {
    if (!searchQuery) return true;
    return Object.values(row).some(val =>
      String(val).toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      {/* Table Selector Pills */}
      <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 6 }}>
        {tables.map(tbl => {
          const isSelected = tbl.name === selectedTable;
          const tr = TABLE_TRANSLATIONS[tbl.name];
          return (
            <button
              key={tbl.name}
              onClick={() => onSelectTable(tbl.name)}
              className={isSelected ? 'btn-soft btn-soft-primary' : 'btn-soft btn-soft-secondary'}
              style={{
                fontSize: 12,
                whiteSpace: 'nowrap',
                padding: '8px 14px',
                borderRadius: 12
              }}
            >
              <Table size={14} />
              <span>{tr ? tr.title.split(' ')[0] : tbl.name}</span>
              <span
                style={{
                  background: isSelected ? 'rgba(255, 255, 255, 0.25)' : '#f1f5f9',
                  color: isSelected ? '#ffffff' : '#64748b',
                  padding: '2px 7px',
                  borderRadius: 9999,
                  fontSize: 11,
                  fontWeight: 700
                }}
              >
                {tbl.activeCount}
              </span>
            </button>
          );
        })}
      </div>

      {/* Table Header & Search Filter */}
      <div className="soft-card" style={{ padding: '20px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: '#1e293b' }}>
                {russianMeta?.title || selectedTable}
              </h3>
              <span className="badge-soft badge-soft-indigo">
                {russianMeta?.category || currentTableMeta?.category}
              </span>
            </div>
            <p style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>
              {russianMeta?.desc || currentTableMeta?.description}
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ position: 'relative', minWidth: 260 }}>
              <Search size={15} style={{ position: 'absolute', left: 12, top: 12, color: '#94a3b8' }} />
              <input
                type="text"
                placeholder="Поиск по строкам..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="input-soft"
                style={{ paddingLeft: 34, width: '100%' }}
              />
            </div>

            <button
              className={showDeleted ? 'btn-soft btn-soft-amber' : 'btn-soft btn-soft-secondary'}
              onClick={() => setShowDeleted(!showDeleted)}
            >
              {showDeleted ? <Eye size={14} /> : <EyeOff size={14} />}
              {showDeleted ? 'Скрыть мягко удаленные' : 'Показать скрытые'}
            </button>
          </div>
        </div>
      </div>

      {/* Records Table */}
      <div className="soft-card" style={{ overflowX: 'auto', maxHeight: 540 }}>
        {loading ? (
          <div style={{ padding: 48, textAlign: 'center', color: '#64748b' }}>
            Загрузка записей из базы данных...
          </div>
        ) : filteredRows.length === 0 ? (
          <div style={{ padding: 48, textAlign: 'center', color: '#64748b' }}>
            <AlertCircle size={32} style={{ margin: '0 auto 10px', opacity: 0.4 }} />
            <p>Записи в таблице {selectedTable} не найдены.</p>
          </div>
        ) : (
          <table className="soft-table">
            <thead>
              <tr>
                <th style={{ width: 140 }}>ДЕЙСТВИЕ</th>
                {columns.map(col => (
                  <th key={col}>{col.toUpperCase()}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((row, idx) => {
                const pkVal = row[currentTableMeta?.pk || 'id'];
                const displayVal = row[currentTableMeta?.displayCol || 'name'] || `ID ${pkVal}`;
                const isSoftDeleted = row.is_deleted === 1;

                return (
                  <tr key={idx} style={{ opacity: isSoftDeleted ? 0.45 : 1 }}>
                    <td>
                      <button
                        className="btn-soft btn-soft-danger"
                        style={{ padding: '5px 12px', fontSize: 11, width: '100%', borderRadius: 8 }}
                        onClick={() => onOpenCascadeModal(selectedTable, pkVal, String(displayVal))}
                        title="Запустить безопасное каскадное удаление"
                      >
                        <Trash2 size={12} /> Удалить
                      </button>
                    </td>
                    {columns.map(col => {
                      const val = row[col];
                      let displayContent = String(val);

                      if (val === null || val === undefined) {
                        displayContent = '—';
                      }

                      if (col === 'status') {
                        const trStatus = STATUS_TRANSLATIONS[String(val)] || String(val);
                        return (
                          <td key={col}>
                            <span className={val === 'PAID' ? 'badge-soft badge-soft-emerald' : (val === 'LOCKED_AUDIT' ? 'badge-soft badge-soft-rose' : 'badge-soft badge-soft-amber')}>
                              {trStatus}
                            </span>
                          </td>
                        );
                      }

                      if (col === 'is_deleted') {
                        return (
                          <td key={col}>
                            <span className={val === 1 ? 'badge-soft badge-soft-rose' : 'badge-soft badge-soft-emerald'}>
                              {val === 1 ? 'Удалено' : 'Активно'}
                            </span>
                          </td>
                        );
                      }

                      return (
                        <td key={col} style={{ fontFamily: typeof val === 'number' || col.endsWith('_id') ? 'var(--font-mono)' : 'inherit' }}>
                          <span style={{ color: val === null ? '#94a3b8' : 'inherit' }}>
                            {displayContent}
                          </span>
                        </td>
                      );
                    })}
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
