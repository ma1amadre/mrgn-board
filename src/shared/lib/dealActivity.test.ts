import { describe, expect, it } from 'vitest';
import { describeDealActivity } from './dealActivity';
import { formatMoney } from './deals';

const now = new Date('2026-09-16T12:00:00');

describe('describeDealActivity', () => {
  it('стадия и сумма переводятся в подписи, даты — в короткий формат', () => {
    expect(describeDealActivity({ kind: 'created', from_value: null, to_value: null })).toBe(
      'Сделка создана',
    );
    expect(describeDealActivity({ kind: 'stage', from_value: 'proposal', to_value: 'lost' })).toBe(
      'Стадия: КП отправлено → Проиграна',
    );
    expect(describeDealActivity({ kind: 'amount', from_value: null, to_value: '95000.00' })).toBe(
      `Сумма: не оценена → ${formatMoney(95000)}`,
    );
    expect(
      describeDealActivity(
        { kind: 'expected_close', from_value: '2026-09-14', to_value: null },
        now,
      ),
    ).toBe('Закрытие: 14 сен → —');
    expect(
      describeDealActivity({ kind: 'lost_reason', from_value: null, to_value: 'Дорого' }),
    ).toBe('Причина проигрыша: Дорого');
    expect(describeDealActivity({ kind: 'owner', from_value: null, to_value: 'Женя' })).toBe(
      'Ответственный: не назначен → Женя',
    );
  });
  it('неизвестный вид не ломает ленту', () => {
    expect(describeDealActivity({ kind: 'x', from_value: null, to_value: null })).toBe(
      'Изменение: x',
    );
  });
});
