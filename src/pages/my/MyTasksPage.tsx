import { useCallback, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useProfile } from '../../app/auth/authContext';
import { useStages } from '../../shared/api/stages';
import { useTasks } from '../../shared/api/tasks';
import {
  DUE_BUCKETS,
  DUE_BUCKET_LABEL,
  countByDay,
  groupByDue,
  weekDays,
  weekdayShort,
} from '../../shared/lib/agenda';
import { formatDate, today as todayIso } from '../../shared/lib/dates';
import { isOpen } from '../../shared/lib/tasks';
import { EmptyState } from '../../shared/ui/EmptyState';
import { Menu } from '../../shared/ui/Menu';
import { PageHead } from '../../shared/ui/PageHead';
import { SkeletonCard } from '../../shared/ui/Skeleton';
import { useDocumentTitle } from '../../shared/ui/useDocumentTitle';
import { TaskCardView } from '../board/TaskCard';
import { useTaskQuickActions } from '../board/useTaskQuickActions';

export function MyTasksPage() {
  const me = useProfile();
  const navigate = useNavigate();
  const [sp, setSp] = useSearchParams();
  const tasks = useTasks();
  const stages = useStages();
  const today = todayIso();
  useDocumentTitle('Мои задачи');

  const scopeAll = sp.get('scope') === 'all';
  const day = sp.get('day');
  const setParam = useCallback(
    (key: string, value: string | null) => {
      const next = new URLSearchParams(sp);
      if (value) next.set(key, value);
      else next.delete(key);
      setSp(next, { replace: true });
    },
    [sp, setSp],
  );

  const actionsFor = useTaskQuickActions(stages.data ?? [], tasks.data ?? [], today);

  const open = useMemo(
    () => (tasks.data ?? []).filter((t) => isOpen(t) && (scopeAll || t.assignee_id === me.id)),
    [tasks.data, scopeAll, me.id],
  );
  const days = useMemo(() => weekDays(today), [today]);
  const counts = useMemo(() => countByDay(open, days), [open, days]);
  const shown = day ? open.filter((t) => t.due_date === day) : open;
  const groups = useMemo(() => groupByDue(shown, today), [shown, today]);

  const loading = tasks.isPending || stages.isPending;

  return (
    <>
      <PageHead
        title="Мои задачи"
        actions={
          <div className="row" role="group" aria-label="Чьи задачи">
            <button
              type="button"
              className={scopeAll ? 'btn btn-ghost btn-sm' : 'btn btn-secondary btn-sm'}
              aria-pressed={!scopeAll}
              onClick={() => setParam('scope', null)}
            >
              Мои
            </button>
            <button
              type="button"
              className={scopeAll ? 'btn btn-secondary btn-sm' : 'btn btn-ghost btn-sm'}
              aria-pressed={scopeAll}
              onClick={() => setParam('scope', 'all')}
            >
              Вся команда
            </button>
          </div>
        }
      />

      <div className="week" role="group" aria-label="Неделя">
        {days.map((d) => {
          const n = counts.get(d) ?? 0;
          const cls = ['day', d === today ? 'is-today' : '', d === day ? 'is-selected' : '']
            .filter(Boolean)
            .join(' ');
          return (
            <button
              key={d}
              type="button"
              className={cls}
              aria-pressed={d === day}
              aria-label={`${weekdayShort(d)} ${formatDate(d)}, задач: ${n}`}
              onClick={() => setParam('day', d === day ? null : d)}
            >
              <span className="day-name">{weekdayShort(d)}</span>
              <span className="day-num">{Number(d.slice(8))}</span>
              <span className={n > 0 ? 'badge badge-count badge-accent' : 'badge badge-count'}>
                {n}
              </span>
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="agenda" aria-busy="true">
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : null}
      {tasks.isError || stages.isError ? (
        <EmptyState>Не удалось загрузить задачи.</EmptyState>
      ) : null}
      {tasks.data && shown.length === 0 ? (
        <EmptyState>
          {day
            ? `На ${formatDate(day)} задач нет.`
            : scopeAll
              ? 'Открытых задач нет.'
              : 'На вас ничего не назначено. Взять задачу можно через меню «⋯» на доске.'}
        </EmptyState>
      ) : null}
      {DUE_BUCKETS.map((bucket) => {
        const list = groups.get(bucket) ?? [];
        if (list.length === 0) return null;
        return (
          <section key={bucket} className="stack">
            <h2 className="row">
              {DUE_BUCKET_LABEL[bucket]}
              <span className={bucket === 'overdue' ? 'badge badge-danger' : 'badge'}>
                {list.length}
              </span>
            </h2>
            <div className="agenda">
              {list.map((t) => (
                <TaskCardView
                  key={t.id}
                  task={t}
                  today={today}
                  role="button"
                  tabIndex={0}
                  onClick={() => navigate(`/board?task=${t.id}`)}
                  onKeyDown={(e: { key: string; preventDefault: () => void }) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      navigate(`/board?task=${t.id}`);
                    }
                  }}
                  menu={<Menu label={`Действия: ${t.title}`} items={actionsFor(t)} />}
                />
              ))}
            </div>
          </section>
        );
      })}
    </>
  );
}
