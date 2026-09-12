import { describe, expect, it } from 'vitest';
import { hasMarkdown, parseInline, parseMarkdown } from './markdown';

describe('parseInline', () => {
  it('код, жирный, курсив, зачёркнутый, ссылка', () => {
    expect(parseInline('a `x` b')).toEqual([
      { t: 'text', v: 'a ' },
      { t: 'code', v: 'x' },
      { t: 'text', v: ' b' },
    ]);
    expect(parseInline('**жирный *и курсив* внутри**')).toEqual([
      {
        t: 'strong',
        c: [
          { t: 'text', v: 'жирный ' },
          { t: 'em', c: [{ t: 'text', v: 'и курсив' }] },
          { t: 'text', v: ' внутри' },
        ],
      },
    ]);
    expect(parseInline('~~нет~~ _да_')).toEqual([
      { t: 'del', c: [{ t: 'text', v: 'нет' }] },
      { t: 'text', v: ' ' },
      { t: 'em', c: [{ t: 'text', v: 'да' }] },
    ]);
    expect(parseInline('см. [док](https://ex.com/a?b=1)')).toEqual([
      { t: 'text', v: 'см. ' },
      { t: 'link', href: 'https://ex.com/a?b=1', c: [{ t: 'text', v: 'док' }] },
    ]);
  });
  it('подчёркивание внутри слова — не курсив; javascript-ссылки не распознаются', () => {
    expect(parseInline('snake_case_name')).toEqual([{ t: 'text', v: 'snake_case_name' }]);
    expect(parseInline('[x](javascript:alert(1))')).toEqual([
      { t: 'text', v: '[x](javascript:alert(1))' },
    ]);
  });
  it('незакрытая разметка остаётся текстом', () => {
    expect(parseInline('**открыто')).toEqual([{ t: 'text', v: '**открыто' }]);
  });
});

describe('parseMarkdown', () => {
  it('абзацы с переносами, списки, блок кода', () => {
    const blocks = parseMarkdown(
      'Первый\nвторая строка\n\n- один\n- два\n\n1. раз\n2) два\n\n```\ncode here\n```\nхвост',
    );
    expect(blocks.map((b) => b.t)).toEqual(['p', 'ul', 'ol', 'code', 'p']);
    expect(blocks[0]?.t === 'p' && blocks[0].lines.length).toBe(2);
    expect(blocks[1]?.t === 'ul' && blocks[1].items.length).toBe(2);
    expect(blocks[3]?.t === 'code' && blocks[3].v).toBe('code here');
  });
  it('пустой текст — без блоков; CRLF нормализуется', () => {
    expect(parseMarkdown('')).toEqual([]);
    expect(parseMarkdown('a\r\nb').length).toBe(1);
  });
});

describe('hasMarkdown', () => {
  it('обычный текст без разметки', () => {
    expect(hasMarkdown('просто текст с https://ссылкой и @Именем')).toBe(false);
    expect(hasMarkdown('- пункт')).toBe(true);
    expect(hasMarkdown('это **важно**')).toBe(true);
  });
});
