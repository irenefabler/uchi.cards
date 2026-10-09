import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, expect, it, vi } from 'vitest';
import { CameraCapture } from './camera-capture';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

it('requests a rear-facing video stream without audio and releases it on cancel', async () => {
  const stop = vi.fn();
  const stream = { getTracks: () => [{ stop }] };
  const getUserMedia = vi.fn().mockResolvedValue(stream);
  vi.stubGlobal('navigator', { mediaDevices: { getUserMedia } });
  const close = vi.fn();
  const view = render(<CameraCapture onPhoto={vi.fn()} onClose={close} />);
  await waitFor(() =>
    expect((screen.getByLabelText('Предпросмотр камеры') as HTMLVideoElement).srcObject).toBe(stream)
  );
  expect(getUserMedia).toHaveBeenCalledWith(
    expect.objectContaining({ audio: false, video: expect.objectContaining({ facingMode: { ideal: 'environment' } }) })
  );
  await userEvent.click(screen.getByRole('button', { name: 'Отмена' }));
  expect(close).toHaveBeenCalledOnce();
  view.unmount();
  expect(stop).toHaveBeenCalledOnce();
});

it('stops a late stream after leaving while permission is pending', async () => {
  const stop = vi.fn();
  let resolve!: (stream: unknown) => void;
  vi.stubGlobal('navigator', {
    mediaDevices: {
      getUserMedia: () =>
        new Promise((done) => {
          resolve = done;
        })
    }
  });
  const view = render(<CameraCapture onPhoto={vi.fn()} onClose={vi.fn()} />);
  view.unmount();
  await act(async () => resolve({ getTracks: () => [{ stop }] }));
  expect(stop).toHaveBeenCalledOnce();
});

it('reports denied permission without creating a photo', async () => {
  vi.stubGlobal('navigator', {
    mediaDevices: { getUserMedia: vi.fn().mockRejectedValue(new DOMException('Denied', 'NotAllowedError')) }
  });
  const photo = vi.fn();
  render(<CameraCapture onPhoto={photo} onClose={vi.fn()} />);
  expect((await screen.findByRole('alert')).textContent).toContain('Разреши доступ');
  expect((screen.getByRole('button', { name: 'Снять страницу' }) as HTMLButtonElement).disabled).toBe(true);
  expect(photo).not.toHaveBeenCalled();
});

it('captures the original frame into a JPEG file once', async () => {
  vi.stubGlobal('navigator', { mediaDevices: { getUserMedia: vi.fn().mockResolvedValue({ getTracks: () => [] }) } });
  const draw = vi.fn();
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
    drawImage: draw
  } as unknown as CanvasRenderingContext2D);
  vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation(function (this: HTMLCanvasElement, callback) {
    expect(this.width).toBe(1920);
    expect(this.height).toBe(1080);
    callback(new Blob(['photo'], { type: 'image/jpeg' }));
  });
  const photo = vi.fn();
  render(<CameraCapture onPhoto={photo} onClose={vi.fn()} />);
  const video = screen.getByLabelText('Предпросмотр камеры');
  Object.defineProperties(video, { videoWidth: { value: 1920 }, videoHeight: { value: 1080 } });
  fireEvent.loadedData(video);
  await userEvent.click(screen.getByRole('button', { name: 'Снять страницу' }));
  expect(photo).toHaveBeenCalledOnce();
  expect(photo.mock.calls[0][0]).toBeInstanceOf(File);
  expect(photo.mock.calls[0][0].type).toBe('image/jpeg');
  expect(draw).toHaveBeenCalledWith(video, 0, 0);
});
