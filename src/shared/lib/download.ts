/** Отдаёт текст как файл через временную ссылку; Blob освобождается после клика. */
export function downloadTextFile(
  name: string,
  text: string,
  mime = 'text/csv;charset=utf-8',
): void {
  const url = URL.createObjectURL(new Blob([text], { type: mime }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Отзывать сразу нельзя: некоторые браузеры ещё не начали читать Blob.
  window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
