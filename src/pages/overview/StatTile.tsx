import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

export function StatTile({
  label,
  value,
  hint,
  hintClass,
  to,
  children,
}: {
  label: string;
  value?: number;
  hint?: string;
  hintClass?: string;
  to?: string;
  children?: ReactNode;
}) {
  const body = (
    <>
      <div className="tile-label">{label}</div>
      {value !== undefined ? <div className="tile-value">{value}</div> : null}
      {hint ? <div className={`small ${hintClass ?? 'muted'}`}>{hint}</div> : null}
      {children}
    </>
  );
  return to ? (
    <Link className="card card-interactive" to={to}>
      {body}
    </Link>
  ) : (
    <div className="card">{body}</div>
  );
}
