import { Link } from 'react-router-dom';
import { useAuth, useProfile } from '../../app/auth/authContext';
import { useTemplateMutations, useTemplates, type TaskTemplate } from '../../shared/api/templates';
import { PRIORITY_LABEL } from '../../shared/lib/labels';
import { plural } from '../../shared/lib/text';
import { useConfirm } from '../../shared/ui/confirmContext';
import { EmptyState } from '../../shared/ui/EmptyState';
import { PageHead } from '../../shared/ui/PageHead';
import { SkeletonRows } from '../../shared/ui/Skeleton';
import { useToast } from '../../shared/ui/toastContext';
import { useDocumentTitle } from '../../shared/ui/useDocumentTitle';

export function TemplatesPage() {
  const me = useProfile();
  const { isAdmin } = useAuth();
  const toast = useToast();
  const confirm = useConfirm();
  const templates = useTemplates();
  const { remove } = useTemplateMutations();
  useDocumentTitle('Шаблоны задач');

  const del = async (t: TaskTemplate) => {
    const ok = await confirm({ title: `Удалить шаблон «${t.name}»?` });
    if (!ok) return;
    remove.mutate(t.id, { onError: (err) => toast.error(err) });
  };

  return (
    <>
      <PageHead
        title="Шаблоны задач"
        actions={
          <Link className="btn btn-secondary" to="/board">
            К доске
          </Link>
        }
      />
      <p className="muted">
        Шаблон создаётся из готовой задачи: откройте её на доске и нажмите «В шаблон». При создании
        новой задачи шаблон выбирается над формой.
      </p>
      {templates.isPending ? <SkeletonRows rows={3} /> : null}
      {templates.isError ? <EmptyState>Не удалось загрузить шаблоны.</EmptyState> : null}
      {templates.data?.length === 0 ? <EmptyState>Шаблонов пока нет.</EmptyState> : null}
      {templates.data && templates.data.length > 0 ? (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Шаблон</th>
                <th>Задача</th>
                <th>Приоритет</th>
                <th>Метки</th>
                <th>Чек-лист</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {templates.data.map((t) => (
                <tr key={t.id}>
                  <td>{t.name}</td>
                  <td className="muted">{t.title || '—'}</td>
                  <td>{PRIORITY_LABEL[t.priority]}</td>
                  <td className="muted">{t.labels.join(', ') || '—'}</td>
                  <td className="muted">
                    {t.checklist.length > 0
                      ? `${t.checklist.length} ${plural(t.checklist.length, ['пункт', 'пункта', 'пунктов'])}`
                      : '—'}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    {isAdmin || t.created_by === me.id ? (
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={() => void del(t)}
                        disabled={remove.isPending}
                      >
                        Удалить
                      </button>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </>
  );
}
