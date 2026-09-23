import type { ProfileRef } from '../api/types';
import { Avatar } from './Avatar';

/** Несколько исполнителей одной стопкой: первые max аватаров внахлёст, остальные — «+N».
 *  Полный список имён — в подсказке при наведении. */
export function AvatarStack({ people, max = 3 }: { people: ProfileRef[]; max?: number }) {
  if (people.length === 0) return null;
  const shown = people.slice(0, max);
  const rest = people.length - shown.length;
  return (
    <span className="avatar-stack" title={people.map((p) => p.name).join(', ')}>
      {shown.map((p) => (
        <Avatar key={p.id} name={p.name} color={p.color} />
      ))}
      {rest > 0 ? (
        <span className="avatar avatar-more" aria-hidden="true">
          +{rest}
        </span>
      ) : null}
    </span>
  );
}
