import { describe, expect, it } from 'vitest';
import { gesture, knowledgePercent, validCards } from './study';

describe('study gestures', () => {
  it.each([
    [0, 0, 340, 'flip'],
    [5, 3, 340, 'flip'],
    [100, 0, 340, 'known'],
    [-100, 0, 340, 'unknown'],
    [40, 0, 340, null],
    [70, 0, 340, null],
    [0, 110, 340, null],
    [100, 120, 340, null],
    [120, 70, 340, null]
  ])('movement %s, %s is %s', (dx, dy, width, expected) => {
    expect(gesture(Number(dx), Number(dy), Number(width))).toBe(expected);
  });
  it('calculates knowledge over every card, including unreviewed cards', () => {
    expect(knowledgePercent([null, null])).toBeNull();
    expect(knowledgePercent(['unknown', null])).toBe(0);
    expect(knowledgePercent(['known', null])).toBe(50);
  });
  it('rejects incomplete and duplicate cards', () => {
    expect(validCards([{ question: 'Вопрос', answer: '' }])).toBe(false);
    expect(validCards([{ question: 'арена', answer: ' Арена ' }])).toBe(false);
    expect(
      validCards([
        { question: 'Вопрос', answer: 'Ответ' },
        { question: ' ВОПРОС ', answer: 'Ответ' }
      ])
    ).toBe(false);
    expect(validCards([{ question: 'Вопрос', answer: 'Ответ' }])).toBe(true);
    expect(
      validCards([
        { question: 'Ключ', answer: 'Key' },
        { question: 'Ключ', answer: 'Spring' }
      ])
    ).toBe(true);
  });
});
