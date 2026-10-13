import React, { useState } from 'react';
import { Sparkles, ChevronDown, ChevronUp } from 'lucide-react';

export const IntuitiveGuide: React.FC = () => {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div
      className="soft-card"
      style={{
        padding: '18px 24px',
        marginBottom: 24,
        background: 'linear-gradient(135deg, #ffffff 0%, #fdfbf7 100%)',
        border: '1px solid #e2e8f0'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 10,
              background: '#eef2ff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#6366f1'
            }}
          >
            <Sparkles size={18} />
          </div>
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: '#1e293b' }}>
              Как это работает? Простое руководство
            </h3>
            <p style={{ fontSize: 12, color: '#64748b' }}>
              Каскадное удаление позволяет безопасно удалять данные вместе со всеми зависимостями без риска сломать базу данных.
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsOpen(!isOpen)}
          className="btn-soft btn-soft-secondary"
          style={{ padding: '6px 12px', fontSize: 12 }}
        >
          {isOpen ? (
            <>
              Свернуть <ChevronUp size={14} />
            </>
          ) : (
            <>
              Подробнее <ChevronDown size={14} />
            </>
          )}
        </button>
      </div>

      {isOpen && (
        <div
          className="animate-soft-in"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: 16,
            marginTop: 18,
            paddingTop: 18,
            borderTop: '1px solid #f1f5f9'
          }}
        >
          {/* Step 1 */}
          <div
            style={{
              padding: 14,
              borderRadius: 12,
              background: '#f8fafc',
              border: '1px solid #e2e8f0'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <span className="badge-soft badge-soft-indigo">Шаг 1</span>
              <strong style={{ fontSize: 13, color: '#1e293b' }}>Выбор объекта</strong>
            </div>
            <p style={{ fontSize: 12, color: '#64748b', lineHeight: 1.4 }}>
              Вкладка <strong>«Таблицы данных»</strong>: выберите любую запись (например, отдел или задачу) и нажмите красную кнопку <strong>«Удалить»</strong>.
            </p>
          </div>

          {/* Step 2 */}
          <div
            style={{
              padding: 14,
              borderRadius: 12,
              background: '#f8fafc',
              border: '1px solid #e2e8f0'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <span className="badge-soft badge-soft-purple">Шаг 2</span>
              <strong style={{ fontSize: 13, color: '#1e293b' }}>Предпросмотр (Dry-Run)</strong>
            </div>
            <p style={{ fontSize: 12, color: '#64748b', lineHeight: 1.4 }}>
              Симулятор заранее построит дерево и покажет, сколько связанных задач, документов и логов будет затронуто, еще до удаления.
            </p>
          </div>

          {/* Step 3 */}
          <div
            style={{
              padding: 14,
              borderRadius: 12,
              background: '#f8fafc',
              border: '1px solid #e2e8f0'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <span className="badge-soft badge-soft-amber">Шаг 3</span>
              <strong style={{ fontSize: 13, color: '#1e293b' }}>Защита правил</strong>
            </div>
            <p style={{ fontSize: 12, color: '#64748b', lineHeight: 1.4 }}>
              Если проект содержит оплаченные счета (статус <strong>ОПЛАЧЕН</strong>), система заблокирует удаление для защиты налоговых данных.
            </p>
          </div>

          {/* Step 4 */}
          <div
            style={{
              padding: 14,
              borderRadius: 12,
              background: '#f8fafc',
              border: '1px solid #e2e8f0'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <span className="badge-soft badge-soft-emerald">Шаг 4</span>
              <strong style={{ fontSize: 13, color: '#1e293b' }}>Откат в 1 клик</strong>
            </div>
            <p style={{ fontSize: 12, color: '#64748b', lineHeight: 1.4 }}>
              Случайно удалили важное? Вкладка <strong>«Журнал аудита»</strong> позволяет моментально вернуть все удаленные записи назад!
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
