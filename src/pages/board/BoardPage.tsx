import { useCallback, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useProfile } from '../../app/auth/authContext';
import { useClients } from '../../shared/api/clients';
import { useProfiles } from '../../shared/api/profiles';
import { useStages } from '../../shared/api/stages';
import { useTaskMutations, useTasks } from '../../shared/api/tasks';
import { today as todayIso } from '../../shared/lib/dates';
import {
  applyTaskFilters,
  parseFilters,
  serializeFilters,
  type TaskFilters,
} from '../../shared/lib/filters';
import { GAP } from '../../shared/lib/ordering';
import { EmptyState } from '../../shared/ui/EmptyState';
import { Modal } from '../../shared/ui/Modal';
import { PageHead } from '../../shared/ui/PageHead';
import { useToast } from '../../shared/ui/toastContext';
import { useDocumentTitle } from '../../shared/ui/useDocumentTitle';
import { BoardFilters } from './BoardFilters';
import { KanbanBoard } from './KanbanBoard';
import { TaskDrawer } from './TaskDrawer';
import { TaskForm, type TaskFormValues } from './TaskForm';

export function BoardPage() {
  const me = useProfile();
  const toast = useToast();
  const [sp, setSp] = useSearchParams();
  const stages = useStages();
  const tasks = useTasks();
  const profiles = useProfiles();
  const clients = useClients();
  const { create } = useTaskMutations();
  const [creating, setCreating] = useState(false);
  const [draftDirty, setDraftDirty] = useState(false);
  useDocumentTitle('Доска');

  const filters = useMemo(() => parseFilters(sp), [sp]);
  const setFilters = useCallback(
    (f: TaskFilters) => setSp(serializeFilters(f, sp), { replace: true }),
    [sp, setSp],
  );
  const selectedId = sp.get('task');
  const openTask = useCallback(
    (id: string | null) => {
      const next = new URLSearchParams(sp);
      if (id) next.set('task', id);
      else next.delete('task');
      setSp(next, { replace: true });
    },
    [sp, setSp],
  );

  const today = todayIso();
  const visibleTasks = useMemo(
    () => applyTaskFilters(tasks.data ?? [], filters),
    [tasks.data, filters],
  );

  const firstStage = stages.data?.[0];
  const newTaskInitial: TaskFormValues | null = firstStage
    ? {
        title: '',
        description: '',
        stage_id: firstStage.id,
        assignee_id: null,
        client_id: filters.client,
        priority: 'normal',
        due_date: null,
      }
    : null;

  const submitNew = (values: TaskFormValues) => {
    const inStage = (tasks.data ?? []).filter((t) => t.stage_id === values.stage_id);
    const maxPos = inStage.reduce((m, t) => Math.max(m, t.position), 0);
    create.mutate(
      {
        title: values.title,
        description: values.description || null,
        stage_id: values.stage_id,
        assignee_id: values.assignee_id,
        client_id: values.client_id,
        priority: values.priority,
        due_date: values.due_date,
        position: maxPos + GAP,
        created_by: me.id,
      },
      { onSuccess: () => setCreating(false), onError: (err) => toast.error(err) },
    );
  };

  const loading = stages.isPending || tasks.isPending || profiles.isPending || clients.isPending;
  const failed = stages.isError || tasks.isError || profiles.isError || clients.isError;

  return (
    <>
      <PageHead
        title="Доска"
        actions={
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setCreating(true)}
            disabled={!newTaskInitial}
          >
            Новая задача
          </button>
        }
      />
      <BoardFilters
        filters={filters}
        profiles={profiles.data ?? []}
        clients={clients.data ?? []}
        onChange={setFilters}
      />
      {loading ? <EmptyState>Загрузка…</EmptyState> : null}
      {failed ? <EmptyState>Не удалось загрузить доску.</EmptyState> : null}
      {stages.data && tasks.data ? (
        stages.data.length === 0 ? (
          <EmptyState>Стадии не настроены — админ добавляет их в разделе «Стадии».</EmptyState>
        ) : (
          <KanbanBoard
            stages={stages.data}
            tasks={visibleTasks}
            allTasks={tasks.data}
            today={today}
            onOpen={openTask}
          />
        )
      ) : null}

      {creating && newTaskInitial ? (
        <Modal title="Новая задача" onClose={() => setCreating(false)} dirty={draftDirty}>
          <TaskForm
            initial={newTaskInitial}
            stages={stages.data ?? []}
            profiles={profiles.data ?? []}
            clients={clients.data ?? []}
            submitLabel="Создать"
            busy={create.isPending}
            onSubmit={submitNew}
            onCancel={() => setCreating(false)}
            onDirtyChange={setDraftDirty}
          />
        </Modal>
      ) : null}

      {selectedId ? (
        <TaskDrawer
          task={tasks.data?.find((t) => t.id === selectedId)}
          stages={stages.data ?? []}
          profiles={profiles.data ?? []}
          clients={clients.data ?? []}
          today={today}
          onClose={() => openTask(null)}
        />
      ) : null}
    </>
  );
}
