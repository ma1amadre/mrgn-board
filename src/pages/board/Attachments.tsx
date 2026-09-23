import { useRef, useState } from 'react';
import { useProfile } from '../../app/auth/authContext';
import { useAttachmentMutations, useAttachmentUrls } from '../../shared/api/attachments';
import type { Attachment } from '../../shared/api/types';
import { formatDateTime } from '../../shared/lib/dates';
import { MAX_ATTACHMENT_BYTES, formatBytes, isImage } from '../../shared/lib/files';
import { useConfirm } from '../../shared/ui/confirmContext';
import { IconClose, IconFile, IconImage } from '../../shared/ui/icons';
import { useToast } from '../../shared/ui/toastContext';

export function Attachments({ taskId, items }: { taskId: string; items: Attachment[] }) {
  const me = useProfile();
  const toast = useToast();
  const confirm = useConfirm();
  const { upload, remove } = useAttachmentMutations();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(0);

  const sorted = [...items].sort((a, b) => a.created_at.localeCompare(b.created_at));
  const urls = useAttachmentUrls(taskId, sorted);

  // Файлы уходят по одному: ошибка одного не должна отменять остальные.
  const onFiles = async (list: FileList | null) => {
    if (!list || list.length === 0) return;
    const files = Array.from(list);
    setUploading(files.length);
    for (const file of files) {
      try {
        await upload.mutateAsync({ taskId, file, createdBy: me.id });
      } catch (err) {
        toast.error(err);
      }
      setUploading((n) => n - 1);
    }
    if (inputRef.current) inputRef.current.value = '';
  };

  const del = async (a: Attachment) => {
    const ok = await confirm({
      title: `Удалить файл «${a.name}»?`,
      text: 'Файл пропадёт из хранилища, вернуть его будет нельзя.',
    });
    if (!ok) return;
    remove.mutate(a, { onError: (err) => toast.error(err) });
  };

  return (
    <section className="stack">
      {sorted.length > 0 ? (
        <ul className="attachments">
          {sorted.map((a) => (
            <li key={a.id} className="attachment">
              <span className="muted">{isImage(a.mime) ? <IconImage /> : <IconFile />}</span>
              <div className="attachment-body">
                {urls.data?.[a.id] ? (
                  <a className="link" href={urls.data[a.id]} target="_blank" rel="noopener">
                    {a.name}
                  </a>
                ) : (
                  <span>{a.name}</span>
                )}
                <span className="muted small">
                  {formatBytes(a.size)} · {formatDateTime(a.created_at)}
                </span>
              </div>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                aria-label={`Удалить файл «${a.name}»`}
                onClick={() => void del(a)}
                disabled={remove.isPending}
              >
                <IconClose size={14} />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      <div className="row">
        <input
          ref={inputRef}
          type="file"
          multiple
          hidden
          onChange={(e) => void onFiles(e.target.files)}
        />
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={() => inputRef.current?.click()}
          disabled={uploading > 0}
        >
          {uploading > 0 ? `Загрузка… (${uploading})` : 'Прикрепить файл'}
        </button>
        <span className="muted small">до {formatBytes(MAX_ATTACHMENT_BYTES)}</span>
      </div>
    </section>
  );
}
