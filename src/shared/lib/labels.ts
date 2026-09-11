/** Подписи для enum-значений из БД. Ключи — точные значения enum в Postgres. */

export type Priority = 'low' | 'normal' | 'high' | 'urgent';
export type ClientDirection = 'cdn' | 'site' | 'bot' | 'app' | 'other';
export type ClientStatus = 'lead' | 'active' | 'support' | 'closed';
export type IdeaStatus = 'new' | 'discussing' | 'accepted' | 'rejected';
export type ProfileRole = 'admin' | 'member';

export const PRIORITIES: Priority[] = ['urgent', 'high', 'normal', 'low'];
export const PRIORITY_LABEL: Record<Priority, string> = {
  urgent: 'Срочно',
  high: 'Высокий',
  normal: 'Обычный',
  low: 'Низкий',
};
/** Класс бейджа из design-kit для приоритета; обычный — без цвета. */
export const PRIORITY_BADGE: Record<Priority, string> = {
  urgent: 'badge badge-danger',
  high: 'badge badge-warning',
  normal: 'badge',
  low: 'badge',
};
export const PRIORITY_ORDER: Record<Priority, number> = { urgent: 0, high: 1, normal: 2, low: 3 };

export const CLIENT_DIRECTIONS: ClientDirection[] = ['cdn', 'site', 'bot', 'app', 'other'];
export const CLIENT_DIRECTION_LABEL: Record<ClientDirection, string> = {
  cdn: 'CDN / защита',
  site: 'Сайт',
  bot: 'Бот',
  app: 'Приложение',
  other: 'Другое',
};

export const CLIENT_STATUSES: ClientStatus[] = ['lead', 'active', 'support', 'closed'];
export const CLIENT_STATUS_LABEL: Record<ClientStatus, string> = {
  lead: 'Лид',
  active: 'В работе',
  support: 'Сопровождение',
  closed: 'Закрыт',
};
export const CLIENT_STATUS_BADGE: Record<ClientStatus, string> = {
  lead: 'badge badge-info',
  active: 'badge badge-accent',
  support: 'badge badge-success',
  closed: 'badge',
};

export const IDEA_STATUSES: IdeaStatus[] = ['new', 'discussing', 'accepted', 'rejected'];
export const IDEA_STATUS_LABEL: Record<IdeaStatus, string> = {
  new: 'Новая',
  discussing: 'Обсуждаем',
  accepted: 'Принята',
  rejected: 'Отклонена',
};
export const IDEA_STATUS_BADGE: Record<IdeaStatus, string> = {
  new: 'badge badge-info',
  discussing: 'badge badge-warning',
  accepted: 'badge badge-success',
  rejected: 'badge',
};

export const ROLE_LABEL: Record<ProfileRole, string> = { admin: 'Админ', member: 'Участник' };
