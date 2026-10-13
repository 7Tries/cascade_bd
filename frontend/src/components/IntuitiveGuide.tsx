import React, { useState } from 'react';
import { BookOpen, ChevronDown, ChevronUp, Layers, CheckCircle2, ShieldAlert, RotateCcw } from 'lucide-react';

export const IntuitiveGuide: React.FC = () => {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div
      className="studio-card"
      style={{
        padding: '16px 20px',
        marginBottom: 20,
        background: '#ffffff'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: '#f1f5f9',
              border: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#0f172a'
            }}
          >
            <BookOpen size={16} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, color: '#0f172a' }}>
                Справка: архитектура каскада и безопасность данных
              </h3>
              <span className="status-pill status-pill-neutral mono-text" style={{ fontSize: 10 }}>
                RFC-9241
              </span>
            </div>
            <p style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
              Регламент каскадных операций: топологический обход DAG, проверка инвариантов и протоколирование транзакций.
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsOpen(!isOpen)}
          className="btn-ui btn-ui-secondary"
          style={{ fontSize: 12, padding: '5px 10px' }}
        >
          {isOpen ? (
            <>
              Скрыть справку <ChevronUp size={13} />
            </>
          ) : (
            <>
              Показать справку <ChevronDown size={13} />
            </>
          )}
        </button>
      </div>

      {isOpen && (
        <div
          className="animate-enter"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: 12,
            marginTop: 14,
            paddingTop: 14,
            borderTop: '1px solid #f1f5f9'
          }}
        >
          {/* Step 1 */}
          <div
            style={{
              padding: 12,
              borderRadius: 8,
              background: '#f8fafc',
              border: '1px solid #e2e8f0'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              <span className="mono-text" style={{ fontSize: 11, fontWeight: 600, color: '#2563eb' }}>
                01
              </span>
              <Layers size={13} color="#2563eb" />
              <strong style={{ fontSize: 12, color: '#0f172a' }}>Выбор корневой сущности</strong>
            </div>
            <p style={{ fontSize: 12, color: '#475569', lineHeight: 1.45 }}>
              Во вкладке <strong>«Таблицы данных»</strong> найдите целевую запись. Кнопка «Удалить» инициирует симуляцию каскадного графа.
            </p>
          </div>

          {/* Step 2 */}
          <div
            style={{
              padding: 12,
              borderRadius: 8,
              background: '#f8fafc',
              border: '1px solid #e2e8f0'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              <span className="mono-text" style={{ fontSize: 11, fontWeight: 600, color: '#7c3aed' }}>
                02
              </span>
              <CheckCircle2 size={13} color="#7c3aed" />
              <strong style={{ fontSize: 12, color: '#0f172a' }}>Предварительный Dry-Run</strong>
            </div>
            <p style={{ fontSize: 12, color: '#475569', lineHeight: 1.45 }}>
              Движок строит топологический порядок листьев дерева и вычисляет точный список затронутых строк без физической модификации БД.
            </p>
          </div>

          {/* Step 3 */}
          <div
            style={{
              padding: 12,
              borderRadius: 8,
              background: '#f8fafc',
              border: '1px solid #e2e8f0'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              <span className="mono-text" style={{ fontSize: 11, fontWeight: 600, color: '#d97706' }}>
                03
              </span>
              <ShieldAlert size={13} color="#d97706" />
              <strong style={{ fontSize: 12, color: '#0f172a' }}>Контроль инвариантов</strong>
            </div>
            <p style={{ fontSize: 12, color: '#475569', lineHeight: 1.45 }}>
              Бизнес-правила блокируют удаление защищенных объектов (например, инвойсы со статусом <code>PAID</code>) для предотвращения финансовых ошибок.
            </p>
          </div>

          {/* Step 4 */}
          <div
            style={{
              padding: 12,
              borderRadius: 8,
              background: '#f8fafc',
              border: '1px solid #e2e8f0'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              <span className="mono-text" style={{ fontSize: 11, fontWeight: 600, color: '#059669' }}>
                04
              </span>
              <RotateCcw size={13} color="#059669" />
              <strong style={{ fontSize: 12, color: '#0f172a' }}>Point-in-Time откат</strong>
            </div>
            <p style={{ fontSize: 12, color: '#475569', lineHeight: 1.45 }}>
              Снимки поддерева сериализуются в таблицу аудита. В любой момент каскадное удаление можно десериализовать обратно в БД.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
