import { initials } from '../lib/text';

export function Avatar({ name, color, large }: { name: string; color: string; large?: boolean }) {
  return (
    <span
      className={large ? 'avatar avatar-lg' : 'avatar'}
      style={{ background: color }}
      title={name}
      aria-hidden="true"
    >
      {initials(name)}
    </span>
  );
}
