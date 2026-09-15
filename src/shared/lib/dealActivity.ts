import { formatDate } from './dates';
import { formatMoney } from './deals';
import { DEAL_STAGE_LABEL, type DealStage } from './labels';

export type DealActivityLike = {
  id: string;
  kind: string;
  from_value: string | null;
  to_value: string | null;
  actor_id: string | null;
  created_at: string;
};

const NONE = '—';

function stageLabel(value: string | null): string {
  if (value === null) return NONE;
  return value in DEAL_STAGE_LABEL ? DEAL_STAGE_LABEL[value as DealStage] : value;
}

function money(value: string | null): string {
  if (value === null) return 'не оценена';
  const n = Number(value);
  return Number.isNaN(n) ? value : formatMoney(n);
}

/** Строка ленты для записи deal_activity: стадия и сумма хранятся сырыми, подписи и формат здесь. */
export function describeDealActivity(
  a: Pick<DealActivityLike, 'kind' | 'from_value' | 'to_value'>,
  now: Date = new Date(),
): string {
  const from = a.from_value;
  const to = a.to_value;
  switch (a.kind) {
    case 'created':
      return 'Сделка создана';
    case 'stage':
      return `Стадия: ${stageLabel(from)} → ${stageLabel(to)}`;
    case 'amount':
      return `Сумма: ${money(from)} → ${money(to)}`;
    case 'owner':
      return `Ответственный: ${from ?? 'не назначен'} → ${to ?? 'не назначен'}`;
    case 'expected_close':
      return `Закрытие: ${from ? formatDate(from, now) : NONE} → ${to ? formatDate(to, now) : NONE}`;
    case 'title':
      return `Название: «${from ?? ''}» → «${to ?? ''}»`;
    case 'client':
      return `Клиент: ${from ?? NONE} → ${to ?? NONE}`;
    case 'lost_reason':
      return to ? `Причина проигрыша: ${to}` : 'Причина проигрыша убрана';
    default:
      return `Изменение: ${a.kind}`;
  }
}
