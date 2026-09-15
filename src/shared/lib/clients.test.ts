import { describe, expect, it } from 'vitest';
import { contactLine, primaryContact, withCurrentClient } from './clients';

const c = (over: Partial<Parameters<typeof contactLine>[0] & object> & { name: string }) => ({
  role: null,
  phone: null,
  email: null,
  telegram: null,
  is_primary: false,
  created_at: '2026-09-01T00:00:00Z',
  ...over,
});

describe('primaryContact', () => {
  it('помеченный основным важнее порядка, иначе самый ранний', () => {
    const early = c({ name: 'Ранний', created_at: '2026-01-01T00:00:00Z' });
    const main = c({ name: 'Главный', is_primary: true });
    expect(primaryContact([early, main])?.name).toBe('Главный');
    expect(primaryContact([c({ name: 'Поздний' }), early])?.name).toBe('Ранний');
    expect(primaryContact([])).toBeUndefined();
  });
});

describe('contactLine', () => {
  it('склеивает только заполненное, Telegram с @', () => {
    expect(contactLine(c({ name: 'Ирина', phone: '+7 900', telegram: 'irina' }))).toBe(
      'Ирина · +7 900 · @irina',
    );
    expect(contactLine(c({ name: 'Дмитрий' }))).toBe('Дмитрий');
    expect(contactLine(undefined)).toBe('');
  });
});

describe('withCurrentClient', () => {
  const list = [{ id: 'a', name: 'Альфа' }];
  it('текущего клиента из списка не дублирует, архивного добавляет с пометкой', () => {
    expect(withCurrentClient(list, { id: 'a', name: 'Альфа' })).toEqual(list);
    expect(withCurrentClient(list, null)).toEqual(list);
    expect(withCurrentClient(list, { id: 'z', name: 'Старый' })).toEqual([
      ...list,
      { id: 'z', name: 'Старый (в архиве)' },
    ]);
    expect(withCurrentClient(list, { id: 'z', name: '' })[1]?.name).toBe('Клиент из архива');
  });
});
