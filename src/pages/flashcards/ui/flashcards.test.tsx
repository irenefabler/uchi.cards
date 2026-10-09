import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flashcardsApi, ApiError } from 'src/shared/api/flashcards';
import type { StudySession } from 'src/shared/api/flashcards';
import { EditorPage, SourcePage, StudyPage } from './flashcards';

vi.mock('src/shared/api/flashcards', async (importOriginal) => {
  const original = await importOriginal<typeof import('src/shared/api/flashcards')>();
  return {
    ...original,
    flashcardsApi: {
      ...original.flashcardsApi,
      session: vi.fn(),
      finish: vi.fn(),
      grade: vi.fn(),
      get: vi.fn(),
      save: vi.fn()
    }
  };
});
const session: StudySession = {
  nextCardId: 10,
  presentationIndex: 0,
  learningCards: {},
  id: 1,
  deckId: 1,
  title: 'Биология',
  cards: [
    { id: 10, question: 'Вопрос', answer: 'Ответ', knowledgeStatus: null },
    { id: 11, question: 'Второй вопрос', answer: 'Ответ', knowledgeStatus: null }
  ],
  answers: {},
  knownCount: 0,
  unknownCount: 0,
  knowledgePercent: null,
  finishedAt: null
};
function mount(element: React.ReactNode, path = '/sessions/1', route = '/sessions/:id') {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path={route} element={element} />
          <Route path="/decks/:id" element={<p>Место сохранено</p>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}
afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  sessionStorage.clear();
});
beforeEach(() => {
  vi.mocked(flashcardsApi.session).mockResolvedValue(structuredClone(session));
  vi.mocked(flashcardsApi.grade).mockReset();
});

describe('study interaction', () => {
  it('flips by keyboard without grading, then grades the answer side', async () => {
    vi.mocked(flashcardsApi.grade).mockResolvedValue({
      ...session,
      nextCardId: 11,
      presentationIndex: 1,
      answers: { 10: 'known' },
      knownCount: 1,
      knowledgePercent: 50
    });
    mount(<StudyPage />);
    const card = await screen.findByRole('button', { name: 'Карточка 1. Вопрос: Вопрос' });
    fireEvent.keyDown(card, { key: 'Enter' });
    expect(screen.getByRole('button', { name: 'Карточка 1. Ответ: Ответ' })).toBeTruthy();
    expect(flashcardsApi.grade).not.toHaveBeenCalled();
    fireEvent.keyDown(card, { key: 'ArrowRight' });
    await screen.findByRole('button', { name: 'Карточка 2. Вопрос: Второй вопрос' });
    expect(flashcardsApi.grade).toHaveBeenCalledWith(1, expect.objectContaining({ cardId: 10, status: 'known' }));
  });
  it('blocks rapid duplicate grades while the first request is in flight', async () => {
    let resolve!: (value: StudySession) => void;
    vi.mocked(flashcardsApi.grade).mockReturnValue(
      new Promise((done) => {
        resolve = done;
      })
    );
    mount(<StudyPage />);
    const card = await screen.findByRole('button', { name: 'Карточка 1. Вопрос: Вопрос' });
    fireEvent.keyDown(card, { key: 'ArrowLeft' });
    fireEvent.keyDown(card, { key: 'ArrowLeft' });
    expect(flashcardsApi.grade).toHaveBeenCalledTimes(1);
    resolve({
      ...session,
      nextCardId: 11,
      presentationIndex: 1,
      answers: { 10: 'unknown' },
      unknownCount: 1,
      knowledgePercent: 0
    });
    await screen.findByRole('button', { name: 'Карточка 2. Вопрос: Второй вопрос' });
  });
  it('retries the same event after network failure', async () => {
    vi.mocked(flashcardsApi.grade)
      .mockRejectedValueOnce(new Error('Нет подключения'))
      .mockResolvedValueOnce({
        ...session,
        nextCardId: 11,
        presentationIndex: 1,
        answers: { 10: 'known' },
        knownCount: 1,
        knowledgePercent: 50
      });
    mount(<StudyPage />);
    const card = await screen.findByRole('button', { name: 'Карточка 1. Вопрос: Вопрос' });
    fireEvent.keyDown(card, { key: 'ArrowRight' });
    await screen.findByText('Нет подключения');
    await userEvent.click(screen.getByRole('button', { name: 'Повторить сохранение ответа' }));
    await waitFor(() => expect(flashcardsApi.grade).toHaveBeenCalledTimes(2));
    expect(vi.mocked(flashcardsApi.grade).mock.calls[0]).toEqual(vi.mocked(flashcardsApi.grade).mock.calls[1]);
  });
  it('handles tap, cancelled and vertical pointer gestures without grading', async () => {
    class TestPointerEvent extends MouseEvent {
      pointerId: number;
      constructor(type: string, props: PointerEventInit) {
        super(type, props);
        this.pointerId = props.pointerId || 1;
      }
    }
    vi.stubGlobal('PointerEvent', TestPointerEvent);
    Object.defineProperty(HTMLElement.prototype, 'setPointerCapture', { configurable: true, value: vi.fn() });
    mount(<StudyPage />);
    const card = await screen.findByRole('button', { name: 'Карточка 1. Вопрос: Вопрос' });
    fireEvent.pointerDown(card, { button: 0, pointerId: 1, clientX: 100, clientY: 200 });
    fireEvent.pointerUp(card, { button: 0, pointerId: 1, clientX: 100, clientY: 200 });
    expect(screen.getByRole('button', { name: 'Карточка 1. Ответ: Ответ' })).toBeTruthy();
    fireEvent.pointerDown(card, { button: 0, pointerId: 1, clientX: 100, clientY: 200 });
    fireEvent.pointerMove(card, { pointerId: 1, clientX: 120, clientY: 400 });
    fireEvent.pointerUp(card, { pointerId: 1, clientX: 120, clientY: 400 });
    fireEvent.pointerDown(card, { button: 0, pointerId: 1, clientX: 100, clientY: 200 });
    fireEvent.pointerCancel(card, { pointerId: 1 });
    fireEvent.pointerUp(card, { pointerId: 1, clientX: 300, clientY: 200 });
    expect(flashcardsApi.grade).not.toHaveBeenCalled();
  });
  it('continues from server answers after reload', async () => {
    vi.mocked(flashcardsApi.session).mockResolvedValue({
      ...session,
      nextCardId: 11,
      presentationIndex: 1,
      answers: { 10: 'known' },
      knownCount: 1
    });
    mount(<StudyPage />);
    await screen.findByRole('button', { name: 'Карточка 2. Вопрос: Второй вопрос' });
  });
});
it('blocks publishing an incomplete draft', async () => {
  vi.mocked(flashcardsApi.get).mockResolvedValue({
    id: 1,
    title: 'Черновик',
    sourceType: 'manual',
    revision: 1,
    isDraft: true,
    cards: [{ id: 10, question: 'Вопрос', answer: '', knowledgeStatus: null }],
    knowledgePercent: null,
    knownCount: 0,
    reviewedCount: 0
  });
  mount(<EditorPage />, '/decks/1/edit', '/decks/:id/edit');
  const save = await screen.findByRole('button', { name: 'Сохранить набор' });
  expect((save as HTMLButtonElement).disabled).toBe(true);
  await userEvent.type(screen.getByLabelText('Ответ'), 'Ответ');
  expect((save as HTMLButtonElement).disabled).toBe(false);
});
it('rejects oversized photos without uploading them', async () => {
  vi.stubEnv('VITE_DEMO_GENERATION', 'true');
  mount(<SourcePage />, '/new', '/new');
  await userEvent.click(screen.getByRole('button', { name: 'Фото' }));
  const file = new File(['x'], 'large.png', { type: 'image/png' });
  Object.defineProperty(file, 'size', { value: 11 * 1024 * 1024 });
  fireEvent.change(screen.getByLabelText('Выбрать фото'), { target: { files: [file] } });
  expect(screen.getByRole('alert').textContent).toContain('до 10 МБ');
  expect((screen.getByRole('button', { name: /Продолжить/ }) as HTMLButtonElement).disabled).toBe(true);
});

it('restores unsaved editor text when the editor is reopened', async () => {
  const deck = {
    id: 1,
    title: 'Черновик',
    sourceType: 'manual' as const,
    revision: 1,
    isDraft: true,
    cards: [{ id: 10, question: 'Вопрос', answer: '', knowledgeStatus: null }],
    knowledgePercent: null,
    knownCount: 0,
    reviewedCount: 0
  };
  vi.mocked(flashcardsApi.get).mockResolvedValue(deck);
  mount(<EditorPage />, '/decks/1/edit', '/decks/:id/edit');
  await screen.findByRole('button', { name: 'Сохранить набор' });
  await userEvent.type(screen.getByLabelText('Ответ'), 'Несохранённый ответ');
  cleanup();
  mount(<EditorPage />, '/decks/1/edit', '/decks/:id/edit');
  await screen.findByRole('button', { name: 'Сохранить набор' });
  expect((screen.getByLabelText('Ответ') as HTMLTextAreaElement).value).toBe('Несохранённый ответ');
});

it('keeps a card pending after one successful answer and shows the server-scheduled repeat', async () => {
  vi.mocked(flashcardsApi.grade).mockResolvedValue({
    ...session,
    nextCardId: 10,
    presentationIndex: 1,
    answers: { 10: 'known' },
    knownCount: 0,
    learningCards: { 10: { knownStreak: 1, failedAttempts: 0, status: 'pending', lastVerdict: 'known' } }
  });
  mount(<StudyPage />);
  const card = await screen.findByRole('button', { name: 'Карточка 1. Вопрос: Вопрос' });
  fireEvent.keyDown(card, { key: 'ArrowRight' });
  await waitFor(() =>
    expect(flashcardsApi.grade).toHaveBeenCalledWith(1, expect.objectContaining({ presentationIndex: 0 }))
  );
  await screen.findByText('0 из 2 освоено');
  expect(screen.getByRole('button', { name: 'Карточка 1. Вопрос: Вопрос' })).toBeTruthy();
});

it('refreshes an obsolete presentation instead of repeatedly submitting it', async () => {
  vi.mocked(flashcardsApi.grade).mockRejectedValue(new ApiError(400, 'Показ изменился'));
  vi.mocked(flashcardsApi.session)
    .mockResolvedValueOnce(structuredClone(session))
    .mockResolvedValue({ ...session, nextCardId: 11, presentationIndex: 1 });
  mount(<StudyPage />);
  const card = await screen.findByRole('button', { name: 'Карточка 1. Вопрос: Вопрос' });
  fireEvent.keyDown(card, { key: 'ArrowRight' });
  await screen.findByRole('button', { name: 'Карточка 2. Вопрос: Второй вопрос' });
  expect(screen.queryByRole('button', { name: 'Повторить сохранение ответа' })).toBeNull();
});
it('pauses without marking the session finished', async () => {
  mount(<StudyPage />);
  await screen.findByRole('button', { name: 'Карточка 1. Вопрос: Вопрос' });
  await userEvent.click(screen.getByRole('button', { name: 'Выйти из тренировки' }));
  await userEvent.click(screen.getByRole('button', { name: 'Выйти и продолжить позже' }));
  await screen.findByText('Место сохранено');
  expect(flashcardsApi.finish).not.toHaveBeenCalled();
});
