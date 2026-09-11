import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useProfile } from '../../app/auth/authContext';
import { useProfiles } from '../../shared/api/profiles';
import { useStages } from '../../shared/api/stages';
import { useTasks } from '../../shared/api/tasks';
import { today as todayIso } from '../../shared/lib/dates';
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
import { DeadlinesList } from './DeadlinesList';
import { StatTile } from './StatTile';

export function OverviewPage() {
  const me = useProfile();
  const tasks = useTasks();
  const stages = useStages();
  const profiles = useProfiles();
  const today = todayIso();

  const stats = useMemo(() => {
    const all = tasks.data ?? [];
    const open = all.filter(isOpen);
    const mine = open.filter((t) => t.assignee_id === me.id);
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
        <EmptyState>Загрузка…</EmptyState>
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
          to={`/board?assignee=${me.id}`}
        />
        <StatTile
          label="Просрочено"
          value={stats.overdue}
          hint={`из ${stats.open.length} ${plural(stats.open.length, ['открытой', 'открытых', 'открытых'])}`}
          to="/board"
        />
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
