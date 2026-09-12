/**
 * Маленькое подмножество markdown для описаний и комментариев: абзацы, списки, блоки кода,
 * `код`, **жирный**, *курсив*, ~~зачёркнутый~~, [ссылка](https://…). Никакого HTML на входе —
 * всё, что не распознано, остаётся текстом. Автоссылки и @упоминания добавляет Linkify поверх.
 */

export type Inline =
  | { t: 'text'; v: string }
  | { t: 'code'; v: string }
  | { t: 'strong'; c: Inline[] }
  | { t: 'em'; c: Inline[] }
  | { t: 'del'; c: Inline[] }
  | { t: 'link'; href: string; c: Inline[] };

export type Block =
  | { t: 'p'; lines: Inline[][] }
  | { t: 'ul'; items: Inline[][] }
  | { t: 'ol'; items: Inline[][] }
  | { t: 'code'; v: string };

const INLINE_RE =
  /(`[^`\n]+`)|(\*\*(.+?)\*\*)|(~~(.+?)~~)|(\[([^\]\n]+)\]\((https?:\/\/[^\s)]+)\))|(\*([^*\n]+)\*)|(?<![\p{L}\p{N}])_([^_\n]+)_(?![\p{L}\p{N}])/su;

export function parseInline(text: string): Inline[] {
  const out: Inline[] = [];
  let rest = text;
  while (rest.length > 0) {
    const m = INLINE_RE.exec(rest);
    if (!m) {
      out.push({ t: 'text', v: rest });
      break;
    }
    if (m.index > 0) out.push({ t: 'text', v: rest.slice(0, m.index) });
    if (m[1] !== undefined) out.push({ t: 'code', v: m[1].slice(1, -1) });
    else if (m[3] !== undefined) out.push({ t: 'strong', c: parseInline(m[3]) });
    else if (m[5] !== undefined) out.push({ t: 'del', c: parseInline(m[5]) });
    else if (m[7] !== undefined && m[8] !== undefined) {
      out.push({ t: 'link', href: m[8], c: parseInline(m[7]) });
    } else if (m[10] !== undefined) out.push({ t: 'em', c: parseInline(m[10]) });
    else if (m[11] !== undefined) out.push({ t: 'em', c: parseInline(m[11]) });
    rest = rest.slice(m.index + m[0].length);
  }
  return out;
}

const UL_RE = /^\s*[-*•]\s+(.*)$/;
const OL_RE = /^\s*\d+[.)]\s+(.*)$/;
const FENCE_RE = /^\s*```/;

export function parseMarkdown(text: string): Block[] {
  const lines = text.replace(/\r\n?/g, '\n').split('\n');
  const blocks: Block[] = [];
  let para: Inline[][] = [];
  const flushPara = () => {
    if (para.length > 0) blocks.push({ t: 'p', lines: para });
    para = [];
  };

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i] ?? '';
    if (FENCE_RE.test(line)) {
      flushPara();
      const code: string[] = [];
      i += 1;
      while (i < lines.length && !FENCE_RE.test(lines[i] ?? '')) {
        code.push(lines[i] ?? '');
        i += 1;
      }
      blocks.push({ t: 'code', v: code.join('\n') });
      continue;
    }
    const ul = UL_RE.exec(line);
    const ol = ul ? null : OL_RE.exec(line);
    if (ul || ol) {
      flushPara();
      const kind = ul ? 'ul' : 'ol';
      const re = ul ? UL_RE : OL_RE;
      const items: Inline[][] = [];
      let j = i;
      for (; j < lines.length; j += 1) {
        const item = re.exec(lines[j] ?? '');
        if (!item) break;
        items.push(parseInline(item[1] ?? ''));
      }
      blocks.push({ t: kind, items });
      i = j - 1;
      continue;
    }
    if (line.trim() === '') {
      flushPara();
      continue;
    }
    para.push(parseInline(line));
  }
  flushPara();
  return blocks;
}

/** Есть ли в тексте хоть какая-то разметка — иначе можно рисовать как обычный текст. */
export function hasMarkdown(text: string): boolean {
  return /(^|\n)\s*([-*•]|\d+[.)])\s+|```|\*\*|~~|`[^`\n]+`|\[[^\]]+\]\(https?:\/\//.test(text);
}
