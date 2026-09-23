import { useCallback, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useProfile } from '../../app/auth/authContext';
import { addChecklistItem } from '../../shared/api/checklist';
import { useClients } from '../../shared/api/clients';
import { useProfiles } from '../../shared/api/profiles';
import { useStages } from '../../shared/api/stages';
import { useArchivedTasks, useTaskMutations, useTasks } from '../../shared/api/tasks';
import { useTemplates } from '../../shared/api/templates';
import { withCurrentClient } from '../../shared/lib/clients';
import { csvFilename, toCsv } from '../../shared/lib/csv';
import { today as todayIso } from '../../shared/lib/dates';
import { downloadTextFile } from '../../shared/lib/download';
import {
  applyTaskFilters,
  parseFilters,
  serializeFilters,
  type TaskFilters,
} from '../../shared/lib/filters';
import { PRIORITY_LABEL } from '../../shared/lib/labels';
import { GAP } from '../../shared/lib/ordering';
import { collectLabels } from '../../shared/lib/taskLabels';
import { DONE_VISIBLE_DAYS, hideStaleDone } from '../../shared/lib/tasks';
import { templateToForm } from '../../shared/lib/templates';
import { EmptyState } from '../../shared/ui/EmptyState';
import { Modal } from '../../shared/ui/Modal';
import { PageHead } from '../../shared/ui/PageHead';
import { SkeletonCard } from '../../shared/ui/Skeleton';
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
  const [creatingLocal, setCreatingLocal] = useState(false);
  const [templateId, setTemplateId] = useState<string | null>(null);
  const templates = useTemplates();
  const [draftDirty, setDraftDirty] = useState(false);
  useDocumentTitle('Доска');

  const filters = useMemo(() => parseFilters(sp), [sp]);
  const setFilters = useCallback(
    (f: TaskFilters) => setSp(serializeFilters(f, sp), { replace: true }),
    [sp, setSp],
  );
  // Вид — только фильтры: task и new не сохраняются и при применении не трогаются.
  const viewQuery = serializeFilters(filters).toString();
  const applyView = useCallback(
    (query: string) => {
      const next = new URLSearchParams(query);
      for (const key of ['task', 'new']) {
        const v = sp.get(key);
        if (v) next.set(key, v);
      }
      setSp(next, { replace: true });
    },
    [sp, setSp],
  );
  const selectedId = sp.get('task');
  const selected = selectedId ? tasks.data?.find((t) => t.id === selectedId) : undefined;
  // Задачи нет на доске — возможно, она в архиве: ссылка из уведомления или CSV должна её открыть.
  const archivedTasks = useArchivedTasks(
    selectedId !== null && tasks.data !== undefined && selected === undefined,
  );
  const selectedTask = selected ?? archivedTasks.data?.find((t) => t.id === selectedId);
  const selectedLoading =
    tasks.isPending ||
    (selected === undefined && archivedTasks.data === undefined && !archivedTasks.isError);
  const openTask = useCallback(
    (id: string | null) => {
      const next = new URLSearchParams(sp);
      if (id) next.set('task', id);
      else next.delete('task');
      setSp(next, { replace: true });
    },
    [sp, setSp],
  );

  // ?new=1 приходит с карточки клиента («Новая задача») и открывает форму; закрытие убирает его из адреса.
  const creating = creatingLocal || sp.get('new') === '1';
  const setCreating = useCallback(
    (open: boolean) => {
      setCreatingLocal(open);
      if (!open && sp.has('new')) {
        const next = new URLSearchParams(sp);
        next.delete('new');
        setSp(next, { replace: true });
      }
    },
    [sp, setSp],
  );

  const today = todayIso();
  const filtered = useMemo(
    () => applyTaskFilters(tasks.data ?? [], filters, today),
    [tasks.data, filters, today],
  );
  const fresh = useMemo(() => hideStaleDone(filtered, today), [filtered, today]);
  const visibleTasks = filters.allDone ? filtered : fresh;
  const hiddenDone = filtered.length - fresh.length;
  const allLabels = useMemo(() => collectLabels(tasks.data ?? []), [tasks.data]);
  // Фильтр по клиенту из ссылки может указывать на архивного: в списке его нет, имя берём из задач.
  const filterClients = useMemo(
    () =>
      withCurrentClient(
        clients.data ?? [],
        filters.client
          ? ((tasks.data ?? []).find((t) => t.client_id === filters.client)?.client ?? {
              id: filters.client,
              name: '',
            })
          : null,
      ),
    [clients.data, tasks.data, filters.client],
  );

  // Экспорт ровно того, что сейчас на доске: фильтры и режим показа закрытых учтены.
  const exportCsv = () => {
    const stageName = new Map((stages.data ?? []).map((s) => [s.id, s.name]));
    const rows = visibleTasks.map((t) => [
      t.title,
      stageName.get(t.stage_id) ?? '',
      t.assignees.map((a) => a.name).join(', '),
      t.client?.name ?? '',
      PRIORITY_LABEL[t.priority],
      t.due_date ?? '',
      t.labels.join(', '),
      t.created_at.slice(0, 10),
      t.done_at?.slice(0, 10) ?? '',
      `${window.location.origin}${import.meta.env.BASE_URL}board?task=${t.id}`,
    ]);
    downloadTextFile(
      csvFilename('tasks', today),
      toCsv(
        [
          'Название',
          'Стадия',
          'Исполнитель',
          'Клиент',
          'Приоритет',
          'Срок',
          'Метки',
          'Создана',
          'Закрыта',
          'Ссылка',
        ],
        rows,
      ),
    );
  };

  const firstStage = stages.data?.[0];
  const blankInitial: TaskFormValues | null = firstStage
    ? {
        title: '',
        description: '',
        stage_id: firstStage.id,
        assignee_ids: [],
        client_id: filters.client,
        priority: 'normal',
        due_date: null,
        labels: filters.label ? [filters.label] : [],
      }
    : null;
  const template = templates.data?.find((t) => t.id === templateId) ?? null;
  const newTaskInitial =
    blankInitial && template
      ? templateToForm(template, {
          stage_id: blankInitial.stage_id,
          client_id: blankInitial.client_id,
        })
      : blankInitial;

  // Пункты чек-листа из шаблона добавляются после создания задачи; кеш обновит realtime.
  const seedChecklist = async (taskId: string) => {
    for (const title of template?.checklist ?? []) {
      try {
        await addChecklistItem({ task_id: taskId, created_by: me.id, title });
      } catch (err) {
        toast.error(err);
        break;
      }
    }
  };

  const submitNew = (values: TaskFormValues) => {
    const inStage = (tasks.data ?? []).filter((t) => t.stage_id === values.stage_id);
    const maxPos = inStage.reduce((m, t) => Math.max(m, t.position), 0);
    create.mutate(
      {
        input: {
          title: values.title,
          description: values.description || null,
          stage_id: values.stage_id,
          client_id: values.client_id,
          priority: values.priority,
          due_date: values.due_date,
          labels: values.labels,
          position: maxPos + GAP,
          created_by: me.id,
        },
        assigneeIds: values.assignee_ids,
      },
      {
        onSuccess: (created) => {
          setCreating(false);
          setTemplateId(null);
          void seedChecklist(created.id);
        },
        onError: (err) => toast.error(err),
      },
    );
  };

  const loading = stages.isPending || tasks.isPending || profiles.isPending || clients.isPending;
  const failed = stages.isError || tasks.isError || profiles.isError || clients.isError;

  return (
    <>
      <PageHead
        title="Доска"
        actions={
          <>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={exportCsv}
              disabled={!tasks.data}
              title="Скачать видимые задачи в CSV"
            >
              CSV
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => setCreating(true)}
              disabled={!newTaskInitial}
            >
              Новая задача
            </button>
          </>
        }
      />
      <BoardFilters
        filters={filters}
        profiles={profiles.data ?? []}
        clients={filterClients}
        labels={allLabels}
        hiddenDone={hiddenDone}
        onChange={setFilters}
        viewQuery={viewQuery}
        onApplyView={applyView}
      />
      {loading ? (
        <div className="board" aria-busy="true">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="column">
              <SkeletonCard />
              {i < 2 ? <SkeletonCard /> : null}
            </div>
          ))}
        </div>
      ) : null}
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
      {!loading && hiddenDone > 0 && !filters.allDone ? (
        <p className="small muted">
          Закрытые старше {DONE_VISIBLE_DAYS} дней скрыты с доски; они остаются в карточках
          клиентов.
        </p>
      ) : null}

      {creating && newTaskInitial ? (
        <Modal title="Новая задача" onClose={() => setCreating(false)} dirty={draftDirty}>
          {templates.data && templates.data.length > 0 ? (
            <div className="row" style={{ marginBottom: 'var(--s-3)' }}>
              <label className="row">
                <span className="muted small">Шаблон:</span>
                <select
                  className="select"
                  value={templateId ?? ''}
                  onChange={(e) => setTemplateId(e.target.value || null)}
                >
                  <option value="">Без шаблона</option>
                  {templates.data.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </label>
              <Link className="link small" to="/settings/templates">
                Управлять
              </Link>
            </div>
          ) : null}
          <TaskForm
            key={templateId ?? 'blank'}
            initial={newTaskInitial}
            stages={stages.data ?? []}
            profiles={profiles.data ?? []}
            clients={filterClients}
            labelSuggestions={allLabels}
            meId={me.id}
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
          task={selectedTask}
          loading={selectedLoading}
          stages={stages.data ?? []}
          profiles={profiles.data ?? []}
          clients={clients.data ?? []}
          labelSuggestions={allLabels}
          today={today}
          onClose={() => openTask(null)}
        />
      ) : null}
    </>
  );
}
