import { useEffect, useRef, useState } from 'react';
import type { Worker } from 'tesseract.js';

export const ScanPage = () => {
  const [file, setFile] = useState<File>();
  const [preview, setPreview] = useState('');
  const [language, setLanguage] = useState('rus+eng');
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const workerRef = useRef<Worker | null>(null);
  const requestRef = useRef(0);

  useEffect(() => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  useEffect(
    () => () => {
      requestRef.current += 1;
      void workerRef.current?.terminate();
    },
    []
  );

  const cancel = () => {
    requestRef.current += 1;
    void workerRef.current?.terminate();
    workerRef.current = null;
    setBusy(false);
    setStatus('Распознавание отменено.');
  };

  const recognize = async () => {
    if (!file || busy) return;
    const request = ++requestRef.current;
    let worker: Worker | undefined;
    setBusy(true);
    setError('');
    setStatus('Загружаем распознавание и языки…');
    try {
      const { createWorker, PSM } = await import('tesseract.js');
      worker = await createWorker(language, 1, {
        logger: (message) => {
          if (request !== requestRef.current) return;
          setStatus(
            message.status === 'recognizing text'
              ? `Распознаём текст: ${Math.round(message.progress * 100)}%`
              : 'Подготавливаем распознавание и языки…'
          );
        }
      });
      if (request !== requestRef.current) return;
      workerRef.current = worker;
      await worker.setParameters({ tessedit_pageseg_mode: PSM.AUTO });
      const result = await worker.recognize(file);
      if (request !== requestRef.current) return;
      setText(result.data.text.trim());
      setStatus(
        result.data.text.trim()
          ? 'Готово. Проверьте текст и исправьте ошибки.'
          : 'Текст не найден. Попробуйте более чёткое фото без теней.'
      );
    } catch {
      if (request === requestRef.current) {
        setError(
          'Не удалось распознать фото. Проверьте интернет для загрузки языков и попробуйте файл JPG, PNG или WebP.'
        );
        setStatus('');
      }
    } finally {
      if (worker) await worker.terminate();
      if (request === requestRef.current) {
        workerRef.current = null;
        setBusy(false);
      }
    }
  };

  const download = () => {
    const url = URL.createObjectURL(new Blob([text], { type: 'text/plain;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'textbook.txt';
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <main className="min-h-screen bg-slate-50 px-5 py-10 text-slate-900">
      <div className="mx-auto max-w-5xl">
        <p className="mb-3 text-sm font-semibold text-blue-700">QUIZLET · БЕТА</p>
        <h1 className="text-3xl font-semibold">Из фото учебника — в текст</h1>
        <p className="mt-3 text-slate-600">Загрузите чёткое фото страницы. Текст можно исправить и скачать.</p>
        <div className="mt-8 grid gap-6 md:grid-cols-2">
          <section className="rounded-2xl border border-slate-200 bg-white p-6">
            <h2 className="mb-5 text-lg font-semibold">1. Фото страницы</h2>
            <label className="block text-sm font-medium" htmlFor="photo">
              Выберите фото (JPG, PNG, WebP · до 20 МБ)
            </label>
            <input
              id="photo"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              disabled={busy}
              className="mt-2 w-full rounded-lg border border-slate-300 p-3 text-sm"
              onChange={(event) => {
                const selected = event.target.files?.[0];
                if (!selected) return;
                if (
                  !['image/jpeg', 'image/png', 'image/webp'].includes(selected.type) ||
                  selected.size > 20 * 1024 * 1024
                ) {
                  setError('Выберите JPG, PNG или WebP размером до 20 МБ.');
                  event.target.value = '';
                  return;
                }
                setFile(selected);
                setText('');
                setStatus('');
                setError('');
              }}
            />
            {preview && (
              <img
                src={preview}
                alt="Загруженная страница учебника"
                className="mt-4 max-h-80 w-full rounded-lg bg-slate-50 object-contain"
              />
            )}
            <label htmlFor="language" className="mt-5 block text-sm font-medium">
              Язык текста
            </label>
            <select
              id="language"
              value={language}
              disabled={busy}
              onChange={(event) => setLanguage(event.target.value)}
              className="mt-2 w-full rounded-lg border border-slate-300 p-3"
            >
              <option value="rus+eng">Русский и английский</option>
              <option value="rus">Русский</option>
              <option value="eng">Английский</option>
            </select>
            <div className="mt-5 flex gap-3">
              <button
                type="button"
                disabled={!file || busy}
                onClick={() => void recognize()}
                className="rounded-lg bg-blue-600 px-5 py-3 font-medium text-white disabled:opacity-40"
              >
                {busy ? 'Распознаём…' : 'Распознать текст'}
              </button>
              {busy && (
                <button type="button" onClick={cancel} className="rounded-lg border border-slate-300 px-4 py-3">
                  Отмена
                </button>
              )}
            </div>
            <p role="status" className="mt-4 text-sm text-slate-600">
              {status}
            </p>
            {error && (
              <p role="alert" className="mt-3 text-sm text-red-700">
                {error}
              </p>
            )}
            <p className="mt-5 text-xs leading-relaxed text-slate-500">
              Фото обрабатывается в вашем браузере и не отправляется на сервер. При первом запуске нужен интернет для
              загрузки языков. Формулы и сложные таблицы могут распознаваться с ошибками.
            </p>
          </section>
          <section className="rounded-2xl border border-slate-200 bg-white p-6">
            <h2 className="mb-5 text-lg font-semibold">2. Результат</h2>
            <label htmlFor="result" className="text-sm font-medium">
              Распознанный текст
            </label>
            <textarea
              id="result"
              value={text}
              onChange={(event) => setText(event.target.value)}
              disabled={busy}
              placeholder="Здесь появится текст страницы. Его можно будет отредактировать."
              className="mt-2 min-h-96 w-full resize-y rounded-lg border border-slate-300 p-4 leading-relaxed"
            />
            <button
              type="button"
              onClick={download}
              disabled={!text.trim() || busy}
              className="mt-4 rounded-lg border border-slate-300 px-5 py-3 font-medium disabled:opacity-40"
            >
              Скачать текст .txt
            </button>
          </section>
        </div>
      </div>
    </main>
  );
};
