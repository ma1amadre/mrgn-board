import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useProfile } from '../../app/auth/authContext';
import { useDeals } from '../../shared/api/deals';
import { useProfiles } from '../../shared/api/profiles';
import { useStages } from '../../shared/api/stages';
import { useTasks } from '../../shared/api/tasks';
import { formatDate, today as todayIso } from '../../shared/lib/dates';
import { formatMoney, isDealOverdue, isOpenDeal, sortDeals } from '../../shared/lib/deals';
import { UNASSIGNED } from '../../shared/lib/filters';
import {
  countByStage,
  isOpen,
  isOverdue,
  upcomingDeadlines,
  workloadByAssignee,
} from '../../shared/lib/tasks';
import { plural } from '../../shared/lib/text';
import { Avatar } from '../../shared/ui/Avatar';
import { EmptyState } from '../../shared/ui/EmptyState';
import { PageHead } from '../../shared/ui/PageHead';
import { SkeletonCard, SkeletonRows } from '../../shared/ui/Skeleton';
import { useDocumentTitle } from '../../shared/ui/useDocumentTitle';
import { DeadlinesList } from './DeadlinesList';
import { StatTile } from './StatTile';

export function OverviewPage() {
  const me = useProfile();
  const tasks = useTasks();
  const stages = useStages();
  const profiles = useProfiles();
  const today = todayIso();
  useDocumentTitle('Обзор');

  // Сделки на обзоре: открытые, их сумма и ближайшие закрытия; загрузка не блокирует остальное.
  const deals = useDeals();
  const pipeline = useMemo(() => {
    const open = (deals.data ?? []).filter(isOpenDeal);
    return {
      count: open.length,
      amount: open.reduce((s, d) => s + (d.amount ?? 0), 0),
      soon: sortDeals(open.filter((d) => d.expected_close !== null)).slice(0, 3),
    };
  }, [deals.data]);

  const stats = useMemo(() => {
    const all = tasks.data ?? [];
    const open = all.filter(isOpen);
    const mine = open.filter((t) => t.assignee_ids.includes(me.id));
    const activeProfiles = (profiles.data ?? []).filter((p) => p.is_active);
    const workload = workloadByAssignee(
      open,
      activeProfiles.map((p) => p.id),
      today,
    ).sort((a, b) => b.open - a.open);
    return {
      open,
      mine,
      mineOverdue: mine.filter((t) => isOverdue(t, today)).length,
      overdue: open.filter((t) => isOverdue(t, today)).length,
      byStage: countByStage(all),
      workload,
      maxLoad: Math.max(1, ...workload.map((w) => w.open)),
      deadlines: upcomingDeadlines(all, today, 7),
    };
  }, [tasks.data, profiles.data, me.id, today]);

  if (tasks.isPending || stages.isPending || profiles.isPending) {
    return (
      <>
        <PageHead title="Обзор" />
        <div className="tiles" aria-busy="true">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
        <div className="card">
          <SkeletonRows rows={3} />
        </div>
      </>
    );
  }
  if (tasks.isError || stages.isError || profiles.isError) {
    return (
      <>
        <PageHead title="Обзор" />
        <EmptyState>Не удалось загрузить данные.</EmptyState>
      </>
    );
  }

  const profileById = new Map((profiles.data ?? []).map((p) => [p.id, p]));

  return (
    <>
      <PageHead title="Обзор" />
      <div className="tiles">
        <StatTile
          label="Мои задачи"
          value={stats.mine.length}
          hint={
            stats.mineOverdue > 0
              ? `просрочено ${stats.mineOverdue}`
              : `${stats.mine.length === 0 ? 'ничего не назначено' : 'всё в сроке'}`
          }
          hintClass={stats.mineOverdue > 0 ? 'badge badge-danger' : 'muted'}
          to="/my"
        />
        <StatTile
          label="Просрочено"
          value={stats.overdue}
          hint={`из ${stats.open.length} ${plural(stats.open.length, ['открытой', 'открытых', 'открытых'])}`}
          to="/board?due=overdue"
        />
        <StatTile
          label="Сделки"
          value={pipeline.count}
          hint={
            pipeline.amount > 0
              ? `в работе на ${formatMoney(pipeline.amount)}`
              : 'открытых сделок нет'
          }
          to="/deals"
        >
          {pipeline.soon.length > 0 ? (
            <div className="tile-rows">
              {pipeline.soon.map((d) => (
                <div key={d.id} className="tile-row">
                  <span
                    className="grow"
                    style={{
                      minWidth: 0,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {d.title}
                  </span>
                  <span className={isDealOverdue(d, today) ? 'badge badge-danger' : 'badge'}>
                    {formatDate(d.expected_close as string)}
                  </span>
                </div>
              ))}
            </div>
          ) : null}
        </StatTile>
        <StatTile label="По стадиям">
          <div className="tile-rows">
            {(stages.data ?? []).map((s) => (
              <div key={s.id} className="tile-row">
                <span className="grow">{s.name}</span>
                <span className="badge">{stats.byStage.get(s.id) ?? 0}</span>
              </div>
            ))}
          </div>
        </StatTile>
        <StatTile label="Нагрузка">
          <div className="tile-rows">
            {stats.workload.map((w) => {
              const p = w.profileId ? profileById.get(w.profileId) : undefined;
              return (
                <Link
                  key={w.profileId ?? 'none'}
                  className="load-row"
                  to={`/board?assignee=${w.profileId ?? UNASSIGNED}`}
                >
                  {p ? (
                    <Avatar name={p.name} color={p.color} />
                  ) : (
                    <span className="avatar" style={{ background: 'var(--n-400)' }}>
                      ?
                    </span>
                  )}
                  <span className="load-name">{p?.name ?? 'Без исполнителя'}</span>
                  <span className="small muted">
                    {w.open}
                    {w.overdue > 0 ? ` · ${w.overdue} проср.` : ''}
                  </span>
                  <span className="progress load-bar">
                    <i style={{ width: `${(w.open / stats.maxLoad) * 100}%` }} />
                  </span>
                </Link>
              );
            })}
          </div>
        </StatTile>
      </div>
      <DeadlinesList tasks={stats.deadlines} today={today} />
    </>
  );
}
