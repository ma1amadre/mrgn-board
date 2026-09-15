import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useDeals } from '../../shared/api/deals';
import { useProfiles } from '../../shared/api/profiles';
import { useTasks } from '../../shared/api/tasks';
import { today as todayIso } from '../../shared/lib/dates';
import { formatMoney, funnel, isOpenDeal } from '../../shared/lib/deals';
import { DEAL_STAGES, DEAL_STAGE_LABEL } from '../../shared/lib/labels';
import {
  avgDays,
  countByWeek,
  dealConversion,
  formatDays,
  lostReasons,
  weekBuckets,
} from '../../shared/lib/reports';
import { isOpen } from '../../shared/lib/tasks';
import { plural } from '../../shared/lib/text';
import { Avatar } from '../../shared/ui/Avatar';
import { EmptyState } from '../../shared/ui/EmptyState';
import { PageHead } from '../../shared/ui/PageHead';
import { SkeletonCard } from '../../shared/ui/Skeleton';
import { useDocumentTitle } from '../../shared/ui/useDocumentTitle';

const WEEKS_OPTIONS = [4, 8, 12] as const;

/** Горизонтальная полоса: ширина — доля от максимума, число справа. */
function Bars({ rows }: { rows: Array<{ label: string; value: number; hint?: string }> }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <div className="bars">
      {rows.map((r) => (
        <div key={r.label} className="bar-row">
          <span className="bar-label">{r.label}</span>
          <span className="bar-track">
            <i style={{ width: `${(r.value / max) * 100}%` }} />
          </span>
          <span className="bar-value">
            {r.value}
            {r.hint ? <span className="muted small"> {r.hint}</span> : null}
          </span>
        </div>
      ))}
    </div>
  );
}

export function ReportsPage() {
  const [sp, setSp] = useSearchParams();
  const tasks = useTasks();
  const deals = useDeals();
  const profiles = useProfiles();
  const today = todayIso();
  useDocumentTitle('Отчёты');

  const weeksParam = Number(sp.get('weeks'));
  const weeks = (WEEKS_OPTIONS as readonly number[]).includes(weeksParam) ? weeksParam : 8;
  const setWeeks = (n: number) => {
    const next = new URLSearchParams(sp);
    next.set('weeks', String(n));
    setSp(next, { replace: true });
  };

  const report = useMemo(() => {
    const all = tasks.data ?? [];
    const buckets = weekBuckets(today, weeks);
    const since = buckets[0]?.start ?? today;
    const closedInPeriod = all.filter((t) => t.done_at !== null && t.done_at.slice(0, 10) >= since);
    const byAssignee = new Map<string | null, { open: number; closed: number }>();
    for (const t of all) {
      const key = t.assignee_id;
      const row = byAssignee.get(key) ?? { open: 0, closed: 0 };
      if (isOpen(t)) row.open += 1;
      else if (t.done_at !== null && t.done_at.slice(0, 10) >= since) row.closed += 1;
      byAssignee.set(key, row);
    }
    const allDeals = deals.data ?? [];
    const wonInPeriod = allDeals.filter(
      (d) => d.stage === 'won' && d.closed_at !== null && d.closed_at.slice(0, 10) >= since,
    );
    return {
      buckets,
      created: countByWeek(all, (t) => t.created_at, buckets),
      closed: countByWeek(all, (t) => t.done_at, buckets),
      cycle: avgDays(closedInPeriod.map((t) => ({ from: t.created_at, to: t.done_at as string }))),
      byAssignee,
      funnel: funnel(allDeals),
      conversion: dealConversion(allDeals),
      lostReasons: lostReasons(allDeals),
      wonAmount: wonInPeriod.reduce((s, d) => s + (d.amount ?? 0), 0),
      wonCount: wonInPeriod.length,
      dealCycle: avgDays(
        allDeals
          .filter((d) => d.stage === 'won' && d.closed_at !== null)
          .map((d) => ({ from: d.created_at, to: d.closed_at as string })),
      ),
      openDeals: allDeals.filter(isOpenDeal).length,
    };
  }, [tasks.data, deals.data, today, weeks]);

  const loading = tasks.isPending || deals.isPending || profiles.isPending;
  if (loading) {
    return (
      <>
        <PageHead title="Отчёты" />
        <div className="tiles" aria-busy="true">
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </>
    );
  }
  if (tasks.isError || deals.isError || profiles.isError) {
    return (
      <>
        <PageHead title="Отчёты" />
        <EmptyState>Не удалось загрузить данные.</EmptyState>
      </>
    );
  }

  const profileById = new Map((profiles.data ?? []).map((p) => [p.id, p]));
  const assigneeRows = [...report.byAssignee.entries()]
    .map(([id, row]) => ({
      id,
      name: id ? (profileById.get(id)?.name ?? '—') : 'Без исполнителя',
      ...row,
    }))
    .sort((a, b) => b.closed - a.closed || b.open - a.open);

  return (
    <>
      <PageHead
        title="Отчёты"
        actions={
          <div className="row" role="group" aria-label="Период">
            {WEEKS_OPTIONS.map((n) => (
              <button
                key={n}
                type="button"
                className={n === weeks ? 'btn btn-secondary btn-sm' : 'btn btn-ghost btn-sm'}
                aria-pressed={n === weeks}
                onClick={() => setWeeks(n)}
              >
                {n} {plural(n, ['неделя', 'недели', 'недель'])}
              </button>
            ))}
          </div>
        }
      />
      <div className="tiles">
        <section className="card stack">
          <h3 className="card-title">Задачи по неделям</h3>
          <p className="muted small">Создано и закрыто, неделя начинается с понедельника.</p>
          <Bars
            rows={report.buckets.map((b, i) => ({
              label: b.label,
              value: report.closed[i] ?? 0,
              hint: `закрыто · создано ${report.created[i] ?? 0}`,
            }))}
          />
          <p className="small">
            Среднее время от создания до закрытия за период:{' '}
            <strong>{formatDays(report.cycle)}</strong>
          </p>
        </section>
        <section className="card stack">
          <h3 className="card-title">Исполнители</h3>
          <p className="muted small">Открытых сейчас и закрытых за период.</p>
          <div className="bars">
            {assigneeRows.map((r) => (
              <div key={r.id ?? 'none'} className="bar-row">
                <span className="bar-label row">
                  {r.id && profileById.get(r.id) ? (
                    <Avatar
                      name={profileById.get(r.id)?.name ?? ''}
                      color={profileById.get(r.id)?.color ?? '#6e7576'}
                    />
                  ) : null}
                  {r.name}
                </span>
                <span className="bar-track">
                  <i
                    style={{
                      width: `${(r.closed / Math.max(1, ...assigneeRows.map((x) => x.closed))) * 100}%`,
                    }}
                  />
                </span>
                <span className="bar-value">
                  {r.closed}
                  <span className="muted small"> закрыто · {r.open} в работе</span>
                </span>
              </div>
            ))}
          </div>
        </section>
        <section className="card stack">
          <h3 className="card-title">Воронка сделок</h3>
          <p className="muted small">Все сделки по стадиям, сумма в рублях.</p>
          <Bars
            rows={DEAL_STAGES.map((s) => ({
              label: DEAL_STAGE_LABEL[s],
              value: report.funnel[s].count,
              hint: report.funnel[s].amount > 0 ? formatMoney(report.funnel[s].amount) : undefined,
            }))}
          />
          <p className="small">
            Конверсия закрытых в выигранные:{' '}
            <strong>{report.conversion.rate === null ? '—' : `${report.conversion.rate} %`}</strong>{' '}
            <span className="muted">
              ({report.conversion.won} выиграно, {report.conversion.lost} проиграно)
            </span>
          </p>
          {report.lostReasons.length > 0 ? (
            <>
              <h4 className="small muted" style={{ margin: 0 }}>
                Почему проигрываем
              </h4>
              <Bars rows={report.lostReasons} />
            </>
          ) : null}
          <p className="small">
            Выиграно за период: <strong>{report.wonCount}</strong>
            {report.wonAmount > 0 ? <> на {formatMoney(report.wonAmount)}</> : null} · средний срок
            сделки <strong>{formatDays(report.dealCycle)}</strong> · открытых сейчас{' '}
            <strong>{report.openDeals}</strong>
          </p>
        </section>
      </div>
    </>
  );
}
