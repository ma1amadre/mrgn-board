import { Fragment, type ReactNode } from 'react';
import { parseMarkdown, type Inline } from '../lib/markdown';
import { Linkify } from './Linkify';

function renderInline(nodes: Inline[], mentions: readonly string[] | undefined): ReactNode {
  return nodes.map((n, i) => {
    switch (n.t) {
      case 'text':
        return <Linkify key={i} text={n.v} mentions={mentions} />;
      case 'code':
        return <code key={i}>{n.v}</code>;
      case 'strong':
        return <strong key={i}>{renderInline(n.c, mentions)}</strong>;
      case 'em':
        return <em key={i}>{renderInline(n.c, mentions)}</em>;
      case 'del':
        return <del key={i}>{renderInline(n.c, mentions)}</del>;
      case 'link':
        return (
          <a key={i} className="link" href={n.href} target="_blank" rel="noopener noreferrer">
            {renderInline(n.c, mentions)}
          </a>
        );
    }
  });
}

/** Описание, комментарий, заметка: подмножество markdown плюс автоссылки и @упоминания. */
export function Markdown({ text, mentions }: { text: string; mentions?: readonly string[] }) {
  const blocks = parseMarkdown(text);
  return (
    <div className="md">
      {blocks.map((b, i) => {
        switch (b.t) {
          case 'p':
            return (
              <p key={i}>
                {b.lines.map((line, j) => (
                  <Fragment key={j}>
                    {j > 0 ? <br /> : null}
                    {renderInline(line, mentions)}
                  </Fragment>
                ))}
              </p>
            );
          case 'ul':
          case 'ol': {
            const Tag = b.t;
            return (
              <Tag key={i}>
                {b.items.map((item, j) => (
                  <li key={j}>{renderInline(item, mentions)}</li>
                ))}
              </Tag>
            );
          }
          case 'code':
            return (
              <pre key={i}>
                <code>{b.v}</code>
              </pre>
            );
        }
      })}
    </div>
  );
}
