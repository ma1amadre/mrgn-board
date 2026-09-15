import { describe, expect, it } from 'vitest';
import { contactLine, primaryContact } from './clients';

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
