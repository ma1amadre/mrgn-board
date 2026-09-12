import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { MAX_ATTACHMENT_BYTES, attachmentPath, formatBytes } from '../lib/files';
import { supabase } from '../supabase/client';
import { assertAffected } from './assert';
import { keys } from './keys';
import type { Attachment } from './types';

const BUCKET = 'attachments';

/** Сначала файл, потом строка: если строка не записалась, файл убираем, чтобы не плодить сирот. */
export async function uploadAttachment(
  taskId: string,
  file: File,
  createdBy: string,
): Promise<void> {
  if (file.size > MAX_ATTACHMENT_BYTES) {
    throw new Error(`«${file.name}» больше ${formatBytes(MAX_ATTACHMENT_BYTES)}`);
  }
  const id = crypto.randomUUID();
  const path = attachmentPath(taskId, id, file.name);
  const uploaded = await supabase.storage.from(BUCKET).upload(path, file, {
    contentType: file.type || 'application/octet-stream',
    upsert: false,
  });
  if (uploaded.error) throw uploaded.error;
  const { error } = await supabase.from('task_attachments').insert({
    id,
    task_id: taskId,
    name: file.name,
    path,
    size: file.size,
    mime: file.type || null,
    created_by: createdBy,
  });
  if (error) {
    await supabase.storage.from(BUCKET).remove([path]);
    throw error;
  }
}

export async function deleteAttachment(a: Pick<Attachment, 'id' | 'path'>): Promise<void> {
  const removed = await supabase.storage.from(BUCKET).remove([a.path]);
  if (removed.error) throw removed.error;
  const { data, error } = await supabase
    .from('task_attachments')
    .delete()
    .eq('id', a.id)
    .select('id');
  if (error) throw error;
  assertAffected(data);
}

const URL_TTL_SEC = 60 * 60;

/**
 * Подписанные ссылки на все вложения задачи: бакет приватный. Живут час, кеш чуть короче.
 * Имя для сохранения добавляем сами: опция download у supabase-js кодирует его второй раз,
 * и браузер сохранял бы файл как «%D0%94…».
 */
export async function fetchAttachmentUrls(
  items: Pick<Attachment, 'id' | 'path' | 'name'>[],
): Promise<Record<string, string>> {
  const entries = await Promise.all(
    items.map(async (a) => {
      const { data, error } = await supabase.storage
        .from(BUCKET)
        .createSignedUrl(a.path, URL_TTL_SEC);
      if (error) throw error;
      return [a.id, `${data.signedUrl}&download=${encodeURIComponent(a.name)}`] as const;
    }),
  );
  return Object.fromEntries(entries);
}

export function useAttachmentUrls(taskId: string, items: Attachment[]) {
  const ids = items.map((a) => a.id).join(',');
  return useQuery({
    queryKey: keys.attachmentUrls(taskId, ids),
    queryFn: () => fetchAttachmentUrls(items),
    enabled: items.length > 0,
    staleTime: (URL_TTL_SEC - 5 * 60) * 1000,
  });
}

export function useAttachmentMutations() {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: keys.tasks.all });
  return {
    upload: useMutation({
      mutationFn: ({
        taskId,
        file,
        createdBy,
      }: {
        taskId: string;
        file: File;
        createdBy: string;
      }) => uploadAttachment(taskId, file, createdBy),
      onSettled: invalidate,
    }),
    remove: useMutation({ mutationFn: deleteAttachment, onSettled: invalidate }),
  };
}
