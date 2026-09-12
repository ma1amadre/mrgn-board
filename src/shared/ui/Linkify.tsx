import { Fragment } from 'react';

const URL_RE = /(https?:\/\/[^\s<>"']+)/g;
const TRAILING = /[.,;:!?)»”]+$/;

/** Текст с кликабельными http(s)-ссылками; всё остальное остаётся текстом (без HTML). */
export function Linkify({ text }: { text: string }) {
  const parts = text.split(URL_RE);
  return (
    <>
      {parts.map((part, i) => {
        if (i % 2 === 0) return <Fragment key={i}>{part}</Fragment>;
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
