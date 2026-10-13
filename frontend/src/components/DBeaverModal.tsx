import React, { useState } from 'react';
import type { DbInfo } from '../api';
import {
  Database, X, Copy, Check,
  Terminal, ShieldCheck, RefreshCw, Layers
} from 'lucide-react';

interface DBeaverModalProps {
  dbInfo: DbInfo | null;
  onClose: () => void;
  onRefreshInfo?: () => void;
}

export const DBeaverModal: React.FC<DBeaverModalProps> = ({
  dbInfo,
  onClose,
  onRefreshInfo
}) => {
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const copyToClipboard = (text: string, fieldKey: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldKey);
    setTimeout(() => {
      setCopiedField(null);
    }, 2000);
  };

  const isPg = dbInfo?.isPostgres ?? true;
  const host = dbInfo?.host || '127.0.0.1';
  const port = dbInfo?.port?.toString() || '5432';
  const database = dbInfo?.database || 'cascadeguard';
  const user = dbInfo?.user || 'postgres';
  const password = dbInfo?.password || 'postgres';
  const jdbcUrl = dbInfo?.dbeaverJdbcUrl || `jdbc:postgresql://${host}:${port}/${database}`;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.45)',
        backdropFilter: 'blur(5px)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="studio-card animate-enter"
        style={{
          width: '100%',
          maxWidth: 760,
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          background: '#ffffff',
          boxShadow: '0 20px 40px -8px rgba(15, 23, 42, 0.16)',
          border: '1px solid #e2e8f0',
          borderRadius: 14
        }}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 10,
                background: '#0284c7',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                boxShadow: '0 4px 10px rgba(2, 132, 199, 0.25)'
              }}
            >
              <Database size={20} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <h3 style={{ fontSize: 16, fontWeight: 600, color: '#0f172a', margin: 0 }}>
                  Подключение к базе данных через DBeaver
                </h3>
                <span
                  className={`status-pill ${isPg ? 'status-pill-emerald' : 'status-pill-amber'}`}
                  style={{ fontSize: 11 }}
                >
                  <span
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: '50%',
                      background: isPg ? '#10b981' : '#f59e0b',
                      display: 'inline-block',
                      marginRight: 4
                    }}
                  />
                  {dbInfo?.engine || 'PostgreSQL 16'} : {dbInfo?.status || 'ONLINE'}
                </span>
              </div>
              <p style={{ fontSize: 12, color: '#64748b', margin: '4px 0 0' }}>
                Все данные, создаваемые и удаляемые в CascadeGuard, сохраняются в PostgreSQL и доступны для живого мониторинга.
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {onRefreshInfo && (
              <button
                className="btn-ui btn-ui-secondary"
                onClick={onRefreshInfo}
                title="Обновить статус соединения"
                style={{ padding: '6px 10px', fontSize: 12 }}
              >
                <RefreshCw size={13} color="#475569" />
              </button>
            )}
            <button
              onClick={onClose}
              style={{
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                color: '#94a3b8',
                padding: 4,
                borderRadius: 6,
                display: 'flex'
              }}
              aria-label="Закрыть"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div style={{ padding: 24, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Connection Parameters Grid */}
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 10 }}>
              Параметры соединения в DBeaver
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: 10,
                background: '#f8fafc',
                padding: 16,
                borderRadius: 10,
                border: '1px solid #e2e8f0'
              }}
            >
              {/* Host */}
              <ParamRow
                label="Хост (Host)"
                value={host}
                fieldKey="host"
                isCopied={copiedField === 'host'}
                onCopy={() => copyToClipboard(host, 'host')}
              />

              {/* Port */}
              <ParamRow
                label="Порт (Port)"
                value={port}
                fieldKey="port"
                isCopied={copiedField === 'port'}
                onCopy={() => copyToClipboard(port, 'port')}
              />

              {/* Database */}
              <ParamRow
                label="База данных (Database)"
                value={database}
                fieldKey="database"
                isCopied={copiedField === 'database'}
                onCopy={() => copyToClipboard(database, 'database')}
              />

              {/* Username */}
              <ParamRow
                label="Пользователь (Username)"
                value={user}
                fieldKey="user"
                isCopied={copiedField === 'user'}
                onCopy={() => copyToClipboard(user, 'user')}
              />

              {/* Password */}
              <ParamRow
                label="Пароль (Password)"
                value={password}
                fieldKey="password"
                isCopied={copiedField === 'password'}
                onCopy={() => copyToClipboard(password, 'password')}
              />

              {/* Type / Driver */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span style={{ fontSize: 11, color: '#64748b' }}>Тип драйвера в DBeaver</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#0f172a' }}>
                  {isPg ? 'PostgreSQL' : 'SQLite'}
                </span>
              </div>
            </div>

            {/* Quick JDBC URL string */}
            <div
              style={{
                marginTop: 10,
                padding: '8px 12px',
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: 8,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, overflow: 'hidden' }}>
                <Terminal size={14} color="#64748b" />
                <span className="mono-text" style={{ fontSize: 12, color: '#334155', wordBreak: 'break-all' }}>
                  {jdbcUrl}
                </span>
              </div>
              <button
                className="btn-ui btn-ui-secondary"
                onClick={() => copyToClipboard(jdbcUrl, 'jdbc')}
                style={{ padding: '4px 8px', fontSize: 11, flexShrink: 0 }}
              >
                {copiedField === 'jdbc' ? <Check size={12} color="#059669" /> : <Copy size={12} />}
                <span>{copiedField === 'jdbc' ? 'Скопировано' : 'Копировать URL'}</span>
              </button>
            </div>
          </div>

          {/* Step-by-Step Guide for DBeaver */}
          <div
            style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: 10,
              padding: '16px 20px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <Layers size={16} color="#0284c7" />
              <h4 style={{ fontSize: 13, fontWeight: 600, color: '#0f172a', margin: 0 }}>
                Пошаговая инструкция для DBeaver
              </h4>
            </div>

            <ol
              style={{
                margin: 0,
                paddingLeft: 20,
                fontSize: 13,
                color: '#334155',
                lineHeight: 1.6,
                display: 'flex',
                flexDirection: 'column',
                gap: 8
              }}
            >
              <li>
                <strong>Создайте соединение:</strong> В DBeaver нажмите меню <em>База данных → Новое соединение</em> (или иконку вилки с плюсом) и выберите <strong>PostgreSQL</strong>.
              </li>
              <li>
                <strong>Укажите параметры:</strong> В открывшемся окне введите Host: <code className="mono-text" style={{ background: '#e2e8f0', padding: '1px 4px', borderRadius: 4 }}>localhost</code>, Database: <code className="mono-text" style={{ background: '#e2e8f0', padding: '1px 4px', borderRadius: 4 }}>cascadeguard</code>, User: <code className="mono-text" style={{ background: '#e2e8f0', padding: '1px 4px', borderRadius: 4 }}>postgres</code>, Password: <code className="mono-text" style={{ background: '#e2e8f0', padding: '1px 4px', borderRadius: 4 }}>postgres</code>.
              </li>
              <li>
                <strong>Проверьте связь:</strong> Нажмите кнопку <em>Тест соединения</em> (Test Connection). Если DBeaver предложит скачать официальный драйвер PostgreSQL JDBC, подтвердите скачивание (занимает ~2 секунды).
              </li>
              <li>
                <strong>Откройте таблицы:</strong> В дереве навигатора слева разверните: <br />
                <span className="mono-text" style={{ fontSize: 12, color: '#0369a1' }}>
                  cascadeguard → Схемы (Schemas) → public → Таблицы (Tables)
                </span>
              </li>
            </ol>
          </div>

          {/* How to Test and Observe Cascades */}
          <div
            style={{
              background: '#eff6ff',
              border: '1px solid #bfdbfe',
              borderRadius: 10,
              padding: '16px 20px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <ShieldCheck size={16} color="#1d4ed8" />
              <h4 style={{ fontSize: 13, fontWeight: 600, color: '#1e3a8a', margin: 0 }}>
                Как наблюдать каскадное удаление в реальном времени
              </h4>
            </div>

            <div style={{ fontSize: 12, color: '#1e40af', lineHeight: 1.6, display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div>
                <strong>1. Откройте таблицу в DBeaver:</strong> Дважды щелкните по таблице <code className="mono-text" style={{ background: '#dbeafe', padding: '1px 4px', borderRadius: 4 }}>tasks</code>, <code className="mono-text" style={{ background: '#dbeafe', padding: '1px 4px', borderRadius: 4 }}>work_logs</code> или <code className="mono-text" style={{ background: '#dbeafe', padding: '1px 4px', borderRadius: 4 }}>departments</code> и перейдите на вкладку «Данные».
              </div>
              <div>
                <strong>2. Запустите удаление в веб-интерфейсе:</strong> В симуляторе CascadeGuard удалите любой департамент (например, «Cloud Infrastructure & SRE»).
              </div>
              <div>
                <strong>3. Нажмите F5 (Обновить) в DBeaver:</strong> Вы сразу увидите, как удалились не только сам департамент, но и все сотрудники, проекты, задачи и рабочие логи!
              </div>
              <div>
                <strong>4. Восстановите данные в 1 клик:</strong> В веб-интерфейсе откройте «Журнал аудита», нажмите «Восстановить» и снова нажмите F5 в DBeaver — все записи вернутся на свои места с исходными ID и внешними ключами.
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div
          style={{
            padding: '14px 24px',
            borderTop: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: '#ffffff'
          }}
        >
          <div style={{ fontSize: 12, color: '#64748b' }}>
            Фоновый демон PostgreSQL запущен на локальном порту <strong>5432</strong>
          </div>
          <button
            className="btn-ui btn-ui-primary"
            onClick={onClose}
            style={{ padding: '7px 18px' }}
          >
            Понятно
          </button>
        </div>
      </div>
    </div>
  );
};

interface ParamRowProps {
  label: string;
  value: string;
  fieldKey: string;
  isCopied: boolean;
  onCopy: () => void;
}

const ParamRow: React.FC<ParamRowProps> = ({ label, value, isCopied, onCopy }) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <span style={{ fontSize: 11, color: '#64748b' }}>{label}</span>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
        <span className="mono-text" style={{ fontSize: 13, fontWeight: 600, color: '#0f172a' }}>
          {value}
        </span>
        <button
          onClick={onCopy}
          title="Скопировать"
          style={{
            border: 'none',
            background: isCopied ? '#ecfdf5' : 'transparent',
            color: isCopied ? '#059669' : '#64748b',
            cursor: 'pointer',
            padding: '2px 5px',
            borderRadius: 4,
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            fontSize: 10
          }}
        >
          {isCopied ? <Check size={11} /> : <Copy size={11} />}
        </button>
      </div>
    </div>
  );
};
