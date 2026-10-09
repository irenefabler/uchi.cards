export function gesture(dx: number, dy: number, width: number): 'known' | 'unknown' | 'flip' | null {
  if (Math.abs(dy) > Math.abs(dx) || Math.abs(dy) > 60) return null;
  if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return 'flip';
  if (Math.abs(dx) < Math.max(64, width * 0.25)) return null;
  return dx > 0 ? 'known' : 'unknown';
}
export function knowledgePercent(statuses: ('known' | 'unknown' | null)[]) {
  if (!statuses.some((status) => status !== null)) return null;
  return Math.round((statuses.filter((status) => status === 'known').length / statuses.length) * 100);
}
export function validCards(cards: { question: string; answer: string }[]) {
  const questions = cards.map((card) => `${card.question.trim()}\u0000${card.answer.trim()}`.toLocaleLowerCase());
  return (
    cards.length > 0 &&
    cards.length <= 100 &&
    cards.every(
      (card) => card.question.trim() && card.answer.trim() && card.question.length <= 500 && card.answer.length <= 2000
    ) &&
    new Set(questions).size === questions.length
  );
}
