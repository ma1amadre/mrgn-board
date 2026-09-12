/** Серые заготовки под будущий контент: страница не прыгает, когда данные приедут. */
export function SkeletonLine({ width = '100%' }: { width?: string | number }) {
  return <span className="skeleton skeleton-line" style={{ width }} aria-hidden="true" />;
}

/** Несколько строк разной длины — под список или текст. */
export function SkeletonRows({ rows = 3 }: { rows?: number }) {
  const widths = ['70%', '55%', '80%', '45%', '65%'];
  return (
    <div className="stack" role="status" aria-label="Загрузка">
      {Array.from({ length: rows }, (_, i) => (
        <SkeletonLine key={i} width={widths[i % widths.length]} />
      ))}
    </div>
  );
}

/** Карточка-заготовка: заголовок и две строки. */
export function SkeletonCard() {
  return (
    <div className="card" aria-hidden="true">
      <SkeletonLine width="40%" />
      <SkeletonLine width="85%" />
      <SkeletonLine width="60%" />
    </div>
  );
}
