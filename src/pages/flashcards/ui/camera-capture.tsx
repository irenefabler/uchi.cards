import { useEffect, useRef, useState } from 'react';
import styles from './flashcards.module.css';

export function CameraCapture({ onPhoto, onClose }: { onPhoto: (file: File) => void; onClose: () => void }) {
  const video = useRef<HTMLVideoElement>(null);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const alive = useRef(true);
  useEffect(() => {
    let cancelled = false;
    let stream: MediaStream | undefined;
    alive.current = true;
    async function open() {
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error('Камера недоступна в этом браузере. Можно выбрать готовое фото.');
        }
        const result = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } }
        });
        if (cancelled) {
          result.getTracks().forEach((track) => track.stop());
          return;
        }
        stream = result;
        if (video.current) video.current.srcObject = result;
      } catch (err) {
        if (cancelled) return;
        setError(
          (err instanceof Error || err instanceof DOMException) && err.name === 'NotAllowedError'
            ? 'Разреши доступ к камере в браузере или выбери готовое фото.'
            : (err instanceof Error || err instanceof DOMException) && err.name === 'NotFoundError'
            ? 'Камера не найдена. Можно выбрать готовое фото.'
            : 'Не удалось открыть камеру. Можно выбрать готовое фото.'
        );
      }
    }
    void open();
    return () => {
      cancelled = true;
      alive.current = false;
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  function takePhoto() {
    const frame = video.current;
    if (!frame?.videoWidth || !frame.videoHeight || busy) return;
    setBusy(true);
    setError('');
    try {
      const canvas = document.createElement('canvas');
      canvas.width = frame.videoWidth;
      canvas.height = frame.videoHeight;
      const context = canvas.getContext('2d');
      if (!context) throw new Error('Canvas unavailable');
      context.drawImage(frame, 0, 0);
      canvas.toBlob(
        (blob) => {
          if (!alive.current) return;
          if (!blob) {
            setError('Не удалось сделать снимок. Попробуй ещё раз.');
            setBusy(false);
            return;
          }
          onPhoto(new File([blob], 'textbook-photo.jpg', { type: 'image/jpeg' }));
        },
        'image/jpeg',
        0.95
      );
    } catch {
      setError('Не удалось сделать снимок. Попробуй ещё раз.');
      setBusy(false);
    }
  }

  return (
    <section className={styles.cameraCapture} aria-label="Камера">
      <video
        ref={video}
        autoPlay
        playsInline
        muted
        aria-label="Предпросмотр камеры"
        onLoadedData={() => setReady(Boolean(video.current?.videoWidth))}
        onError={() => {
          setReady(false);
          setError('Не удалось получить изображение с камеры.');
        }}
      />
      {!ready && !error && <p role="status">Открываем камеру…</p>}
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
      <button className={styles.primary} disabled={!ready || busy} onClick={takePhoto}>
        Снять страницу
      </button>
      <button className={styles.textButton} onClick={onClose}>
        Отмена
      </button>
    </section>
  );
}
