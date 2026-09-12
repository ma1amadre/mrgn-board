import { Fragment, type ReactNode } from 'react';
import { mentionPattern } from '../lib/mentions';

const URL_RE = /(https?:\/\/[^\s<>"']+)/g;
const TRAILING = /[.,;:!?)»”]+$/;

function withMentions(text: string, re: RegExp | null): ReactNode {
  if (!re) return text;
  return text.split(re).map((part, i) =>
    i % 2 === 1 ? (
      <span key={i} className="mention">
        {part}
      </span>
    ) : (
      <Fragment key={i}>{part}</Fragment>
    ),
  );
}

/** Текст с кликабельными http(s)-ссылками и подсвеченными @упоминаниями известных имён;
 *  всё остальное остаётся текстом (без HTML). */
export function Linkify({ text, mentions }: { text: string; mentions?: readonly string[] }) {
  const mention = mentions ? mentionPattern(mentions) : null;
  const parts = text.split(URL_RE);
  return (
    <>
      {parts.map((part, i) => {
        if (i % 2 === 0) return <Fragment key={i}>{withMentions(part, mention)}</Fragment>;
        // Знаки препинания после ссылки — не часть адреса.
        const tail = part.match(TRAILING)?.[0] ?? '';
        const url = tail ? part.slice(0, -tail.length) : part;
        return (
          <Fragment key={i}>
            <a className="link" href={url} target="_blank" rel="noopener noreferrer">
              {url}
            </a>
            {tail}
          </Fragment>
        );
      })}
    </>
  );
}
