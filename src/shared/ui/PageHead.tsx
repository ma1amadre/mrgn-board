import type { ReactNode } from 'react';

export function PageHead({ title, actions }: { title: string; actions?: ReactNode }) {
  return (
    <header className="page-head">
      <h1>{title}</h1>
      {actions ? <div className="actions">{actions}</div> : null}
    </header>
  );
}
