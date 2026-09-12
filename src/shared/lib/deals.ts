import type { DealStage } from './labels';

export type DealLike = {
  id: string;
  stage: DealStage;
  amount: number | null;
  owner_id: string | null;
  expected_close: string | null;
  created_at: string;
};

export const OPEN_DEAL_STAGES: readonly DealStage[] = ['new', 'contact', 'proposal', 'negotiation'];

export function isOpenDeal(d: Pick<DealLike, 'stage'>): boolean {
  return d.stage !== 'won' && d.stage !== 'lost';
}

/** Просрочена: ожидаемая дата закрытия прошла, а сделка всё ещё открыта. */
export function isDealOverdue(
  d: Pick<DealLike, 'stage' | 'expected_close'>,
  today: string,
): boolean {
  return isOpenDeal(d) && d.expected_close !== null && d.expected_close < today;
}

/** «1 200 000 ₽», копейки только если они есть. Разделитель разрядов — узкий неразрывный пробел. */
export function formatMoney(amount: number): string {
  const [int, frac] = (Math.round(amount * 100) / 100).toFixed(2).split('.');
  const grouped = (int ?? '0').replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return frac === '00' ? `${grouped} ₽` : `${grouped},${frac} ₽`;
}

/** Внутри колонки: сначала с ближайшей датой, без даты — в конец, при равенстве — старые выше. */
export function sortDeals<T extends DealLike>(deals: T[]): T[] {
  return [...deals].sort((a, b) => {
    if (a.expected_close !== b.expected_close) {
      if (a.expected_close === null) return 1;
      if (b.expected_close === null) return -1;
      return a.expected_close.localeCompare(b.expected_close);
    }
    return a.created_at.localeCompare(b.created_at);
  });
}

export type FunnelRow = { count: number; amount: number };

/** Сколько сделок и на какую сумму в каждой стадии. */
export function funnel<T extends DealLike>(deals: T[]): Record<DealStage, FunnelRow> {
  const out = {
    new: { count: 0, amount: 0 },
    contact: { count: 0, amount: 0 },
    proposal: { count: 0, amount: 0 },
    negotiation: { count: 0, amount: 0 },
    won: { count: 0, amount: 0 },
    lost: { count: 0, amount: 0 },
  } satisfies Record<DealStage, FunnelRow>;
  for (const d of deals) {
    out[d.stage].count += 1;
    out[d.stage].amount += d.amount ?? 0;
  }
  return out;
}

/** Следующая открытая стадия; после переговоров — выиграна. У закрытых следующей нет. */
export function nextDealStage(stage: DealStage): DealStage | undefined {
  const i = OPEN_DEAL_STAGES.indexOf(stage);
  if (i < 0) return undefined;
  return OPEN_DEAL_STAGES[i + 1] ?? 'won';
}

export type DealQuickAction = {
  key: string;
  label: string;
  patch: { stage?: DealStage; owner_id?: string | null };
};

/** Меню «⋯» на карточке сделки; подписи стадий подставляет вызывающий. */
export function dealQuickActions(
  deal: Pick<DealLike, 'stage' | 'owner_id'>,
  meId: string,
  stageLabel: (s: DealStage) => string,
): DealQuickAction[] {
  const out: DealQuickAction[] = [];
  if (deal.owner_id === meId) {
    out.push({ key: 'unassign', label: 'Снять с себя', patch: { owner_id: null } });
  } else {
    out.push({ key: 'assign_me', label: 'Взять себе', patch: { owner_id: meId } });
  }
  const next = nextDealStage(deal.stage);
  if (next) {
    out.push({ key: 'next', label: `Дальше: ${stageLabel(next)}`, patch: { stage: next } });
  }
  if (isOpenDeal(deal)) {
    if (next !== 'won') out.push({ key: 'won', label: stageLabel('won'), patch: { stage: 'won' } });
    out.push({ key: 'lost', label: stageLabel('lost'), patch: { stage: 'lost' } });
  } else {
    out.push({ key: 'reopen', label: `Вернуть: ${stageLabel('new')}`, patch: { stage: 'new' } });
  }
  return out;
}

/** Сумма из поля формы: «1 200 000,50» → 1200000.5; пусто → null; мусор → NaN. */
export function parseAmount(raw: string): number | null {
  const s = raw.replace(/\s/g, '').replace(',', '.');
  if (s === '') return null;
  return Number(s);
}
