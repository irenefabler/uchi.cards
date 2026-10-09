import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MOTION, swipeVerdict } from '../model/motion';
import { GestureCard } from './gesture-card';

type Timeline = {
  frames: Keyframe[];
  options: KeyframeAnimationOptions;
  finish: () => void;
  cancel: ReturnType<typeof vi.fn>;
};
let timelines: Timeline[];
const props = { cardId: 10, token: '1:0:10', number: 1, question: 'Вопрос', answer: 'Ответ', disabled: false };
const card = () => screen.getByRole('button', { name: /^Карточка/ });
async function finish(index: number) {
  await act(async () => timelines[index].finish());
}
beforeEach(() => {
  timelines = [];
  vi.stubGlobal('matchMedia', () => ({ matches: false }));
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
function installTimelines() {
  Object.defineProperty(HTMLElement.prototype, 'animate', { configurable: true, value: vi.fn() });
  vi.spyOn(HTMLElement.prototype, 'animate').mockImplementation(function (frames, options) {
    let resolve!: () => void;
    const finished = new Promise<void>((done) => {
      resolve = done;
    });
    const cancel = vi.fn(resolve);
    timelines.push({
      frames: frames as Keyframe[],
      options: options as KeyframeAnimationOptions,
      finish: resolve,
      cancel
    });
    return { finished, cancel } as unknown as Animation;
  });
}

describe('motion thresholds', () => {
  it('requires deliberate distance or velocity with matching direction', () => {
    expect(swipeVerdict(34, 400, 5)).toBeNull();
    expect(swipeVerdict(40, 400, -0.8)).toBeNull();
    expect(swipeVerdict(40, 400, 0.8)).toBe('known');
    expect(swipeVerdict(-85, 400)).toBe('unknown');
    expect(swipeVerdict(60, 240)).toBe('known');
  });
});
describe('native motion sequencing', () => {
  it.each([
    ['Знаю', 'known', 1],
    ['Не знаю', 'unknown', -1]
  ] as const)(
    'flies on %s, submits once after exit, and enters a repeated card on its front',
    async (label, status, direction) => {
      installTimelines();
      const onGrade = vi.fn().mockResolvedValue(true);
      const view = render(<GestureCard {...props} onGrade={onGrade} />);
      fireEvent.click(screen.getByRole('button', { name: label }));
      fireEvent.keyDown(card(), { key: 'ArrowRight' });
      expect(onGrade).not.toHaveBeenCalled();
      expect(card().getAttribute('data-motion')).toBe('exiting');
      expect(timelines[0].options.duration).toBe(MOTION.exit);
      expect(String(timelines[0].frames[1].transform)).toContain(`rotate(${direction * 24}deg)`);
      expect(card().getAttribute('data-card-id')).toBe('10');
      await finish(0);
      expect(onGrade).toHaveBeenCalledExactlyOnceWith(status, expect.any(String));
      expect(card().getAttribute('data-motion')).toBe('waiting-next');
      view.rerender(<GestureCard {...props} token="1:1:10" onGrade={onGrade} />);
      expect(card().getAttribute('data-motion')).toBe('entering');
      expect(card().getAttribute('aria-label')).toContain('Вопрос');
      expect(timelines[1].options.duration).toBe(MOTION.enter);
      await finish(1);
      expect(card().getAttribute('aria-disabled')).toBe('false');
    }
  );
  it('locks grading and repeated taps during flip', async () => {
    installTimelines();
    const onGrade = vi.fn();
    render(<GestureCard {...props} onGrade={onGrade} />);
    fireEvent.keyDown(card(), { key: 'Enter' });
    fireEvent.keyDown(card(), { key: 'Enter' });
    fireEvent.keyDown(card(), { key: 'ArrowLeft' });
    expect(timelines).toHaveLength(2);
    expect(card().getAttribute('data-motion')).toBe('flipping');
    await finish(0);
    await finish(1);
    expect(card().getAttribute('aria-label')).toContain('Ответ');
    expect(onGrade).not.toHaveBeenCalled();
    fireEvent.keyDown(card(), { key: ' ' });
    await finish(2);
    await finish(3);
    expect(card().getAttribute('aria-label')).toContain('Вопрос');
  });
  it('recovers the same card after a failed save', async () => {
    installTimelines();
    const onGrade = vi.fn().mockResolvedValue(false);
    render(<GestureCard {...props} onGrade={onGrade} />);
    fireEvent.click(screen.getByRole('button', { name: 'Не знаю' }));
    await finish(0);
    expect(card().getAttribute('data-motion')).toBe('snapping');
    await finish(1);
    expect(card().getAttribute('data-card-id')).toBe('10');
    expect(card().getAttribute('aria-disabled')).toBe('false');
  });
  it('cancels an unfinished exit on unmount without saving', async () => {
    installTimelines();
    const onGrade = vi.fn();
    const view = render(<GestureCard {...props} onGrade={onGrade} />);
    fireEvent.click(screen.getByRole('button', { name: 'Знаю' }));
    await act(async () => view.unmount());
    expect(timelines[0].cancel).toHaveBeenCalled();
    expect(onGrade).not.toHaveBeenCalled();
  });
  it('uses only short opacity transitions with reduced motion', async () => {
    installTimelines();
    vi.stubGlobal('matchMedia', () => ({ matches: true }));
    const onGrade = vi.fn().mockResolvedValue(true);
    render(<GestureCard {...props} onGrade={onGrade} />);
    fireEvent.keyDown(card(), { key: 'Enter' });
    await finish(0);
    fireEvent.click(screen.getByRole('button', { name: 'Знаю' }));
    expect(
      timelines.every(
        (timeline) => timeline.options.duration === 100 && timeline.frames.every((frame) => !frame.transform)
      )
    ).toBe(true);
    await finish(1);
    expect(onGrade).toHaveBeenCalledOnce();
  });
});

it('keeps the flip instruction below both faces', () => {
  render(<GestureCard {...props} onGrade={vi.fn()} />);
  expect(card().textContent).not.toContain('Нажми, чтобы перевернуть');
  expect(screen.getByText('Нажми, чтобы перевернуть').closest('[data-card-id]')).toBeNull();
});
