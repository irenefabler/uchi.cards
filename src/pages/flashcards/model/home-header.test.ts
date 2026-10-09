import { describe, expect, it } from 'vitest';
import { resolveHomeHeader } from './home-header';

const base = { deckCount: 1, resumableSessionId: null, resumableDeckTitle: '', masteredToday: 0, completedToday: 0 };
describe('truthful home states', () => {
  it('prioritizes empty, then resumable, then completed, then default', () => {
    expect(resolveHomeHeader({ ...base, deckCount: 0, masteredToday: 9, completedToday: 1 }).title).toBe(
      'С чего начнём?'
    );
    expect(
      resolveHomeHeader({
        ...base,
        resumableSessionId: 7,
        resumableDeckTitle: 'Урок',
        masteredToday: 9,
        completedToday: 1
      }).sessionId
    ).toBe(7);
    expect(resolveHomeHeader({ ...base, masteredToday: 9, completedToday: 1 }).title).toBe('Хорошая работа!');
    expect(resolveHomeHeader({ ...base, masteredToday: 9 }).title).toBe('Что учим сегодня?');
    expect(resolveHomeHeader(base).title).toBe('Что учим сегодня?');
  });
  it.each([
    [1, 'карточку'],
    [2, 'карточки'],
    [11, 'карточек'],
    [21, 'карточку']
  ])('pluralizes %i correctly', (count, word) => {
    expect(resolveHomeHeader({ ...base, masteredToday: Number(count), completedToday: 1 }).subtitle).toBe(
      `Сегодня ты освоил ${count} ${word}`
    );
  });
});
