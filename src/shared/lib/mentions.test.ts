import { describe, expect, it } from 'vitest';
import {
  applyMention,
  extractMentions,
  findMentionQuery,
  matchProfiles,
  mentionPattern,
} from './mentions';

describe('findMentionQuery', () => {
  it('«@» в начале и после пробела открывает набор, внутри слова — нет', () => {
    expect(findMentionQuery('@Ал', 3)).toEqual({ start: 0, query: 'Ал' });
    expect(findMentionQuery('смотри @Ал', 10)).toEqual({ start: 7, query: 'Ал' });
    expect(findMentionQuery('mail@ex', 7)).toBeNull();
  });
  it('пробел внутри имени допустим, перенос строки закрывает', () => {
    expect(findMentionQuery('@Алик Га', 8)?.query).toBe('Алик Га');
    expect(findMentionQuery('@Алик\nдалее', 11)).toBeNull();
  });
  it('каретка левее «@» — набора нет', () => {
    expect(findMentionQuery('текст @Алик', 3)).toBeNull();
  });
});

describe('matchProfiles', () => {
  const people = [{ name: 'Алик' }, { name: 'Руслан' }, { name: 'Женя' }, { name: 'Малик' }];
  it('сначала по началу имени, потом по вхождению, без учёта регистра', () => {
    expect(matchProfiles(people, 'ал').map((p) => p.name)).toEqual(['Алик', 'Малик']);
    expect(matchProfiles(people, 'ЛИК').map((p) => p.name)).toEqual(['Алик', 'Малик']);
  });
  it('пустой запрос — все, но не больше лимита', () => {
    expect(matchProfiles(people, '', 2)).toHaveLength(2);
  });
});

describe('applyMention', () => {
  it('заменяет набранное на имя с пробелом и ставит каретку после', () => {
    const text = 'привет @Ал и всем';
    const m = findMentionQuery(text, 10);
    expect(m).not.toBeNull();
    const out = applyMention(text, m as NonNullable<typeof m>, 10, 'Алик');
    expect(out.text).toBe('привет @Алик  и всем');
    expect(out.caret).toBe('привет @Алик '.length);
  });
});

describe('mentionPattern / extractMentions', () => {
  const names = ['Алик', 'Алик Гаджибогандов', 'Женя'];
  it('длинное имя выигрывает, имя внутри слова не считается', () => {
    expect(extractMentions('@Алик Гаджибогандов и @Женя', names)).toEqual([
      'Алик Гаджибогандов',
      'Женя',
    ]);
    expect(extractMentions('@Аликс тут', names)).toEqual([]);
    expect(extractMentions('@Алик, привет', names)).toEqual(['Алик']);
  });
  it('без имён паттерна нет, спецсимволы в именах экранируются', () => {
    expect(mentionPattern([])).toBeNull();
    expect(extractMentions('@Иван (ИП) здесь', ['Иван (ИП)'])).toEqual(['Иван (ИП)']);
  });
});
