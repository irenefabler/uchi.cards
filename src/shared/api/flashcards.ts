export type Card = { id: number; question: string; answer: string; knowledgeStatus: 'known' | 'unknown' | null };
export type Deck = {
  id: number;
  title: string;
  sourceType: 'manual' | 'text' | 'photo';
  revision: number;
  isDraft: boolean;
  cards: Card[];
  knowledgePercent: number | null;
  knownCount: number;
  reviewedCount: number;
  activeSessionId?: number | null;
};
export type DeckInput = Pick<Deck, 'title' | 'sourceType' | 'revision' | 'isDraft'> & {
  cards: Pick<Card, 'id' | 'question' | 'answer'>[];
};
export type StudySession = {
  nextCardId: number;
  presentationIndex: number;
  learningCards: Record<
    string,
    {
      knownStreak: number;
      failedAttempts: number;
      status: 'pending' | 'mastered' | 'needs_practice';
      lastVerdict: 'unknown' | 'known' | 'not_known';
    }
  >;
  id: number;
  deckId: number;
  title: string;
  cards: Card[];
  answers: Record<string, 'known' | 'unknown'>;
  knownCount: number;
  unknownCount: number;
  finishedAt: string | null;
  knowledgePercent: number | null;
};
export type Grade = { presentationIndex: number; cardId: number; status: 'known' | 'unknown'; eventId: string };
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string
  ) {
    super(message);
  }
}
async function request<T>(path: string, method = 'GET', body?: unknown): Promise<T> {
  const response = await fetch(`/api/v1${path}`, {
    method,
    credentials: 'same-origin',
    headers: body === undefined ? {} : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(15000)
  });
  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw new ApiError(
      response.status,
      response.status === 401
        ? 'Войдите в аккаунт, чтобы открыть ваши наборы.'
        : data?.errors?.join('. ') || 'Сервер недоступен. Попробуйте ещё раз.'
    );
  }
  return response.status === 204 ? (undefined as T) : response.json();
}
export const flashcardsApi = {
  list: (page = 1, draft = false) => request<Deck[]>(`/decks?page=${page}&draft=${draft}`),
  get: (id: number) => request<Deck>(`/decks/${id}`),
  save: (input: DeckInput, id?: number) => request<Deck>(id ? `/decks/${id}` : '/decks', id ? 'PUT' : 'POST', input),
  remove: (id: number) => request<void>(`/decks/${id}`, 'DELETE'),
  start: (id: number) => request<StudySession>(`/decks/${id}/sessions`, 'POST'),
  session: (id: number) => request<StudySession>(`/sessions/${id}`),
  grade: (id: number, grade: Grade) => request<StudySession>(`/sessions/${id}/answers`, 'POST', grade),
  finish: (id: number) => request<StudySession>(`/sessions/${id}/finish`, 'POST')
};
export const deckKeys = {
  all: ['flashcards'] as const,
  list: (page: number, draft = false) => ['flashcards', 'list', page, draft] as const,
  deck: (id: number) => ['flashcards', 'deck', id] as const,
  session: (id: number) => ['flashcards', 'session', id] as const
};
