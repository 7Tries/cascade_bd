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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Table Selector Pills */}
      <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4 }}>
        {tables.map(tbl => {
          const isSelected = tbl.name === selectedTable;
          const tr = TABLE_TRANSLATIONS[tbl.name];
          return (
            <button
              key={tbl.name}
              onClick={() => onSelectTable(tbl.name)}
              className={isSelected ? 'btn-ui btn-ui-primary' : 'btn-ui btn-ui-secondary'}
              style={{
                fontSize: 12,
                whiteSpace: 'nowrap',
                padding: '6px 12px',
                borderRadius: 7
              }}
            >
              <Table size={13} />
              <span>{tr ? tr.title.split(' ')[0] : tbl.name}</span>
              <span
                className="mono-text"
                style={{
                  background: isSelected ? 'rgba(255, 255, 255, 0.2)' : '#f1f5f9',
                  color: isSelected ? '#ffffff' : '#475569',
                  padding: '1px 6px',
                  borderRadius: 4,
                  fontSize: 10,
                  fontWeight: 600,
                  marginLeft: 2
                }}
              >
                {tbl.activeCount}
              </span>
            </button>
          );
        })}
      </div>

      {/* Table Information & Filter Bar */}
      <div className="studio-card" style={{ padding: '16px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <h3 style={{ fontSize: 16, fontWeight: 600, color: '#0f172a' }}>
                {russianMeta?.title || selectedTable}
              </h3>
              <span className="status-pill status-pill-neutral mono-text" style={{ fontSize: 10 }}>
                {russianMeta?.category || currentTableMeta?.category}
              </span>
            </div>
            <p style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
              {russianMeta?.desc || currentTableMeta?.description}
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ position: 'relative', minWidth: 240 }}>
              <Search size={14} style={{ position: 'absolute', left: 10, top: 9, color: '#94a3b8' }} />
              <input
                type="text"
                placeholder="Поиск по строкам..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="ui-input"
                style={{ paddingLeft: 30, width: '100%' }}
              />
            </div>

            <button
              className="btn-ui btn-ui-secondary"
              onClick={() => setShowDeleted(!showDeleted)}
              title="Показать или скрыть записи с признаком soft-delete"
            >
              {showDeleted ? <Eye size={13} /> : <EyeOff size={13} />}
              {showDeleted ? 'Скрыть удаленные' : 'Показать скрытые'}
            </button>
          </div>
        </div>
      </div>

      {/* Records Studio Grid */}
      <div className="studio-card" style={{ overflowX: 'auto', maxHeight: 560, position: 'relative' }}>
        {loading ? (
          <div style={{ padding: 48, textAlign: 'center', color: '#64748b', fontSize: 13 }}>
            Чтение данных таблицы...
          </div>
        ) : filteredRows.length === 0 ? (
          <div style={{ padding: 48, textAlign: 'center', color: '#64748b' }}>
            <AlertCircle size={28} style={{ margin: '0 auto 8px', color: '#94a3b8' }} />
            <p style={{ fontSize: 13 }}>Записи в таблице <code>{selectedTable}</code> не найдены.</p>
          </div>
        ) : (
          <table className="studio-grid">
            <thead>
              <tr>
                <th style={{ width: 100 }}>ДЕЙСТВИЕ</th>
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
                        className="btn-ui btn-ui-danger"
                        style={{ padding: '3px 8px', fontSize: 11 }}
                        onClick={() => onOpenCascadeModal(selectedTable, pkVal, String(displayVal))}
                        title="Запустить безопасное каскадное удаление"
                      >
                        <Trash2 size={11} /> Удалить
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
                            <span className={`status-pill ${val === 'PAID' ? 'status-pill-emerald' : (val === 'LOCKED_AUDIT' ? 'status-pill-rose' : 'status-pill-amber')}`}>
                              {trStatus}
                            </span>
                          </td>
                        );
                      }

                      if (col === 'is_deleted') {
                        return (
                          <td key={col}>
                            <span className={`status-pill ${val === 1 ? 'status-pill-rose' : 'status-pill-emerald'}`}>
                              {val === 1 ? 'Удалено' : 'Активно'}
                            </span>
                          </td>
                        );
                      }

                      const isMono = typeof val === 'number' || col.endsWith('_id') || col === 'id';

                      return (
                        <td key={col} className={isMono ? 'mono-text' : ''}>
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
