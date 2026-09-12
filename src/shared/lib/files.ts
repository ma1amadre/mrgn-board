/** Совпадает с file_size_limit бакета attachments (009_attachments). */
export const MAX_ATTACHMENT_BYTES = 25 * 1024 * 1024;

/** «812 Б», «3,4 КБ», «12 МБ»: до 10 — с одним знаком, дальше целые. */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} Б`;
  const units = ['КБ', 'МБ', 'ГБ'];
  let value = bytes / 1024;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  const text =
    value < 10 ? value.toFixed(1).replace('.', ',').replace(',0', '') : String(Math.round(value));
  return `${text} ${units[unit]}`;
}

/** Ключ объекта в бакете: только ASCII, расширение сохраняем, чтобы браузер понял тип при открытии.
 *  Исходное имя файла живёт в строке task_attachments. */
export function attachmentPath(taskId: string, id: string, fileName: string): string {
  const ext = fileName.match(/\.([A-Za-z0-9]{1,8})$/)?.[1]?.toLowerCase();
  return ext ? `${taskId}/${id}.${ext}` : `${taskId}/${id}`;
}

export function isImage(mime: string | null): boolean {
  return mime !== null && mime.startsWith('image/');
}
