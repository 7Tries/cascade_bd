/**
 * CascadeGuard: Русская локализация и терминология
 */

export const TABLE_TRANSLATIONS: Record<string, { title: string; category: string; desc: string }> = {
  organizations: {
    title: 'Организации (Холдинги)',
    category: 'Корпоративный корень',
    desc: 'Головные юридические лица и корпоративные структуры холдинга'
  },
  departments: {
    title: 'Подразделения и отделы',
    category: 'Дивизионы',
    desc: 'Операционные дирекции и подразделения внутри организации'
  },
  employees: {
    title: 'Сотрудники и менеджеры',
    category: 'Персонал',
    desc: 'Специалисты с поддержкой циклической иерархии подчинения (manager_id)'
  },
  projects: {
    title: 'Проекты и инициативы',
    category: 'Операции',
    desc: 'Бизнес-проекты со ссылкой на отдел и тимлида (lead_id)'
  },
  project_assignments: {
    title: 'Назначения в проекты',
    category: 'M2M Связи',
    desc: 'Многие-ко-многим распределение сотрудников по активным проектам'
  },
  tasks: {
    title: 'Задачи и подзадачи',
    category: 'Исполнение',
    desc: 'Иерархическое дерево задач с поддержкой вложенных подзадач (parent_task_id)'
  },
  work_logs: {
    title: 'Журнал трудозатрат',
    category: 'Телеметрия',
    desc: 'Неизменяемый трекинг отработанных часов по задачам'
  },
  invoices: {
    title: 'Финансовые счета (Инвойсы)',
    category: 'Финансы',
    desc: 'Платежные документы с юридической защитой от удаления (PAID, LOCKED_AUDIT)'
  },
  payments: {
    title: 'Проведенные платежи',
    category: 'Финансы',
    desc: 'Безотзывные финансовые транзакции, привязанные к инвойсам'
  },
  audit_attachments: {
    title: 'Полиморфные вложения',
    category: 'Аудит',
    desc: 'Документы и акты соответствия, прикрепленные к проектам, задачам или счетам'
  }
};

export const POLICY_TRANSLATIONS: Record<string, { title: string; desc: string; badge: string }> = {
  HARD_CASCADE: {
    title: 'Физический каскад (Листья-вперёд)',
    desc: 'Топологическое удаление дочерних записей перед родительскими с расцеплением циклов.',
    badge: 'LEAVES-FIRST ACID'
  },
  ARCHIVE_AND_HARD_DELETE: {
    title: 'Архивация и удаление (С возможностью отката)',
    desc: 'Фиксация полного снимка поддерева в неизменяемый журнал с поддержкой отката в 1 клик.',
    badge: 'СНАПШОТ + ОТКАТ'
  },
  SOFT_CASCADE: {
    title: 'Логическое каскадное удаление (Soft Delete)',
    desc: 'Рекурсивная простановка флага is_deleted=1 и метки времени без потери физических строк.',
    badge: 'ЛОГИЧЕСКИЙ SOFT'
  },
  SAFE_NULLIFY: {
    title: 'Безопасное обнуление (Set Null)',
    desc: 'Обнуление nullable внешних ключей у дочерних строк с удалением только целевого корня.',
    badge: 'SET NULL'
  }
};

export const STATUS_TRANSLATIONS: Record<string, string> = {
  ACTIVE: 'АКТИВНО',
  DELETED: 'УДАЛЕНО',
  DRAFT: 'ЧЕРНОВИК',
  PAID: 'ОПЛАЧЕН',
  LOCKED_AUDIT: 'ЗАБЛОКИРОВАН АУДИТОМ',
  LOCKED: 'ЗАБЛОКИРОВАН',
  IN_PROGRESS: 'В РАБОТЕ',
  PLANNING: 'ПЛАНИРОВАНИЕ',
  COMPLETED: 'ЗАВЕРШЕН',
  TODO: 'К ВЫПОЛНЕНИЮ',
  REVIEW: 'НА ПРОВЕРКЕ',
  DONE: 'ВЫПОЛНЕНО',
  CRITICAL: 'КРИТИЧЕСКИЙ',
  HIGH: 'ВЫСОКИЙ',
  MEDIUM: 'СРЕДНИЙ',
  LOW: 'НИЗКИЙ',
  RESTORED: 'ВОССТАНОВЛЕНО',
  ARCHIVED: 'В АРХИВЕ',
  HEALTHY: 'БЕЗУПРЕЧНО',
  WARNING: 'ПРЕДУПРЕЖДЕНИЕ'
};
