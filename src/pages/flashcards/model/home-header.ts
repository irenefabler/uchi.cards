import type { HomeSummary } from 'src/shared/api/flashcards';

export function resolveHomeHeader(data: HomeSummary) {
  if (data.deckCount === 0) return { title: 'С чего начнём?', subtitle: 'Создай первые карточки из учебника' };
  if (data.resumableSessionId)
    return {
      title: 'Продолжим?',
      subtitle: `Ты остановился на наборе «${data.resumableDeckTitle}»`,
      sessionId: data.resumableSessionId
    };
  if (data.completedToday > 0 && data.masteredToday > 0)
    return {
      title: 'Хорошая работа!',
      subtitle: `Сегодня ты освоил ${data.masteredToday} ${
        data.masteredToday % 100 >= 11 && data.masteredToday % 100 <= 14
          ? 'карточек'
          : data.masteredToday % 10 === 1
          ? 'карточку'
          : data.masteredToday % 10 >= 2 && data.masteredToday % 10 <= 4
          ? 'карточки'
          : 'карточек'
      }`
    };
  return { title: 'Что учим сегодня?', subtitle: 'Выбирай набор и начинай' };
}
