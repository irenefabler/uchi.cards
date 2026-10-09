import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flashcardsApi, ApiError } from 'src/shared/api/flashcards';
import type { StudySession } from 'src/shared/api/flashcards';
import { EditorPage, SourcePage, StudyPage, NewEditorPage, LibraryPage } from './flashcards';

vi.mock('src/shared/api/flashcards', async (importOriginal) => {
  const original = await importOriginal<typeof import('src/shared/api/flashcards')>();
  return {
    ...original,
    flashcardsApi: {
      ...original.flashcardsApi,
      session: vi.fn(),
      list: vi.fn(),
      home: vi.fn(),
      finish: vi.fn(),
      grade: vi.fn(),
      get: vi.fn(),
      save: vi.fn(),
      generate: vi.fn(),
      recognize: vi.fn()
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
function mount(element: React.ReactNode, path = '/sessions/1', route = '/sessions/:id', state?: unknown) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[{ pathname: path, state }]}>
        <Routes>
          <Route path={route} element={element} />
          <Route path="/decks/:id" element={<p>Место сохранено</p>} />
          {route !== '/new/review' && <Route path="/new/review" element={<p>Проверка нового набора</p>} />}
          <Route path="/decks/:id/edit" element={<p>Новый черновик</p>} />
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
  vi.mocked(flashcardsApi.recognize).mockReset();
});

function enablePointerEvents() {
  class TestPointerEvent extends MouseEvent {
    pointerId: number;
    constructor(type: string, props: PointerEventInit) {
      super(type, props);
      this.pointerId = props.pointerId || 1;
    }
  }
  vi.stubGlobal('PointerEvent', TestPointerEvent);
  Object.defineProperty(HTMLElement.prototype, 'setPointerCapture', { configurable: true, value: vi.fn() });
}

describe('study interaction', () => {
  it.each([
    [-120, 'unknown', false],
    [120, 'known', true]
  ] as const)('swipes %s pixels as %s (flipped=%s) without native image drag', async (distance, status, flipped) => {
    enablePointerEvents();
    vi.mocked(flashcardsApi.grade).mockResolvedValue({ ...session, nextCardId: 11, presentationIndex: 1 });
    mount(<StudyPage />);
    const card = await screen.findByRole('button', { name: 'Карточка 1. Вопрос: Вопрос' });
    if (flipped) {
      fireEvent.keyDown(card, { key: 'Enter' });
      await waitFor(() => expect(card.getAttribute('aria-disabled')).toBe('false'));
    }
    expect(card.querySelector('img')).toBeNull();
    expect(fireEvent.dragStart(card)).toBe(false);
    fireEvent.pointerDown(card, { button: 0, pointerId: 1, clientX: 200, clientY: 200 });
    fireEvent.pointerMove(card, { pointerId: 1, clientX: 200 + distance, clientY: 200 });
    fireEvent.pointerUp(card, { pointerId: 1, clientX: 200 + distance, clientY: 200 });
    const departure = card.style.transform;
    expect(departure).not.toContain('translateX(0px)');
    fireEvent.lostPointerCapture(card, { pointerId: 1 });
    expect(card.style.transform).toBe(departure);
    expect(screen.getByRole('button', { name: 'Знаю' }).hasAttribute('disabled')).toBe(true);
    await screen.findByRole('button', { name: 'Карточка 2. Вопрос: Второй вопрос' });
    expect(flashcardsApi.grade).toHaveBeenCalledTimes(1);
    expect(flashcardsApi.grade).toHaveBeenCalledWith(1, expect.objectContaining({ cardId: 10, status }));
  });

  it.each([
    ['Не знаю', 'unknown', false],
    ['Знаю', 'known', false],
    ['Не знаю', 'unknown', true],
    ['Знаю', 'known', true]
  ] as const)('grades with %s (%s), flipped=%s', async (label, status, flipped) => {
    vi.mocked(flashcardsApi.grade).mockResolvedValue({
      ...session,
      nextCardId: 11,
      presentationIndex: 1
    });
    mount(<StudyPage />);
    const card = await screen.findByRole('button', { name: 'Карточка 1. Вопрос: Вопрос' });
    if (flipped) {
      fireEvent.keyDown(card, { key: 'Enter' });
      await waitFor(() => expect(card.getAttribute('aria-disabled')).toBe('false'));
    }
    expect(screen.queryByRole('button', { name: 'Показать ответ' })).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: label }));
    await screen.findByRole('button', { name: 'Карточка 2. Вопрос: Второй вопрос' });
    expect(flashcardsApi.grade).toHaveBeenCalledTimes(1);
    expect(flashcardsApi.grade).toHaveBeenCalledWith(1, expect.objectContaining({ cardId: 10, status }));
  });
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
    await waitFor(() => expect(card.getAttribute('aria-disabled')).toBe('false'));
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
    expect(screen.getByRole('button', { name: 'Знаю' }).hasAttribute('disabled')).toBe(true);
    expect(screen.getByRole('button', { name: 'Не знаю' }).hasAttribute('disabled')).toBe(true);
    await waitFor(() => expect(flashcardsApi.grade).toHaveBeenCalledTimes(1));
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
    enablePointerEvents();
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

it.each(['text', 'photo'] as const)(
  'generates %s directly into a local editor without saving first',
  async (sourceType) => {
    sessionStorage.setItem(
      'uchi-cards-source-v1',
      JSON.stringify({ sourceType, text: 'Материал урока', filename: '' })
    );
    vi.mocked(flashcardsApi.generate)
      .mockClear()
      .mockResolvedValue({
        suggestedTitle: 'Тема урока',
        coverIconId: 'plant-leaves',
        cards: [{ id: 0, question: 'По материалу?', answer: 'Верный ответ' }],
        warnings: [],
        demo: false
      });
    vi.mocked(flashcardsApi.save).mockClear();
    mount(<SourcePage />, '/new', '/new');
    await userEvent.click(screen.getByRole('button', { name: /Продолжить/ }));
    await waitFor(() =>
      expect(flashcardsApi.generate).toHaveBeenCalledWith('Материал урока', 0, sourceType === 'photo' ? 'ocr' : 'text')
    );
    expect(flashcardsApi.save).not.toHaveBeenCalled();
    expect(JSON.parse(sessionStorage.getItem('uchi-cards-editor-0') || '{}').title).toBe('Тема урока');
    expect(screen.queryByText('Настроим набор')).toBeNull();
  }
);
it('keeps source on generation failure without saving', async () => {
  sessionStorage.setItem(
    'uchi-cards-source-v1',
    JSON.stringify({ sourceType: 'text', text: 'Материал урока', filename: '' })
  );
  vi.mocked(flashcardsApi.generate).mockRejectedValue(new ApiError(502, 'Не удалось создать карточки'));
  vi.mocked(flashcardsApi.save).mockClear();
  mount(<SourcePage />, '/new', '/new');
  await userEvent.click(screen.getByRole('button', { name: /Продолжить/ }));
  await screen.findByText('Не удалось создать карточки');
  expect(flashcardsApi.save).not.toHaveBeenCalled();
  expect(sessionStorage.getItem('uchi-cards-source-v1')).toContain('Материал урока');
});
it('opens a blank manual draft without AI or a server save', async () => {
  vi.mocked(flashcardsApi.generate).mockClear();
  vi.mocked(flashcardsApi.save).mockClear();
  mount(<SourcePage />, '/new', '/new');
  await userEvent.click(screen.getByRole('button', { name: 'Вручную' }));
  await waitFor(() => expect(sessionStorage.getItem('uchi-cards-editor-0')).not.toBeNull());
  const draft = JSON.parse(sessionStorage.getItem('uchi-cards-editor-0') || '{}');
  expect(draft.title).toBe('');
  expect(draft.cards).toEqual([{ id: 0, question: '', answer: '' }]);
  expect(flashcardsApi.generate).not.toHaveBeenCalled();
  expect(flashcardsApi.save).not.toHaveBeenCalled();
});
it('saves a new reviewed deck atomically and preserves the edited title', async () => {
  sessionStorage.setItem(
    'uchi-cards-editor-0',
    JSON.stringify({
      id: 0,
      title: 'Название ИИ',
      sourceType: 'text',
      revision: 0,
      isDraft: true,
      cards: [{ id: 0, question: 'Пара', answer: 'Ответ' }]
    })
  );
  vi.mocked(flashcardsApi.save).mockClear().mockResolvedValue({
    id: 7,
    title: 'Моё название',
    sourceType: 'text',
    revision: 1,
    isDraft: false,
    cards: session.cards,
    knownCount: 0,
    reviewedCount: 0,
    knowledgePercent: null
  });
  mount(<NewEditorPage />, '/new/review', '/new/review');
  fireEvent.change(screen.getByLabelText(/Название набора/), { target: { value: 'Моё название' } });
  fireEvent.change(screen.getByLabelText('Вопрос'), { target: { value: 'Исправленная пара' } });
  expect((screen.getByLabelText(/Название набора/) as HTMLInputElement).value).toBe('Моё название');
  await userEvent.click(screen.getByRole('button', { name: 'Сохранить набор' }));
  await waitFor(() =>
    expect(flashcardsApi.save).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Моё название', isDraft: false }),
      undefined
    )
  );
});
it('restores the reviewed local draft without replacing its title or calling AI', async () => {
  sessionStorage.setItem('uchi-cards-source-v1', JSON.stringify({ sourceType: 'text', text: 'Урок', filename: '' }));
  sessionStorage.setItem('uchi-cards-draft-source', JSON.stringify({ sourceType: 'text', text: 'Урок' }));
  sessionStorage.setItem(
    'uchi-cards-editor-0',
    JSON.stringify({ id: 0, title: 'Моё название', revision: 0, cards: [{ id: 0, question: 'Q', answer: 'A' }] })
  );
  vi.mocked(flashcardsApi.generate).mockClear();
  mount(<SourcePage />, '/new', '/new');
  await userEvent.click(screen.getByRole('button', { name: /Продолжить/ }));
  expect(flashcardsApi.generate).not.toHaveBeenCalled();
  expect(JSON.parse(sessionStorage.getItem('uchi-cards-editor-0') || '{}').title).toBe('Моё название');
});

function stubPhotoPreview() {
  vi.stubGlobal(
    'URL',
    class extends URL {
      static createObjectURL = vi.fn(() => 'blob:photo-preview');
      static revokeObjectURL = vi.fn();
    }
  );
}
it('automatically recognizes a selected photo without demo mode', async () => {
  stubPhotoPreview();
  vi.mocked(flashcardsApi.recognize).mockResolvedValue({ text: 'Растения выделяют кислород.' });
  mount(<SourcePage />, '/new', '/new');
  await userEvent.click(screen.getByRole('button', { name: 'Фото' }));
  const file = new File(['image'], 'page.png', { type: 'image/png' });
  fireEvent.change(screen.getByLabelText('Выбрать фото'), { target: { files: [file] } });
  await screen.findByLabelText('Распознанный текст');
  expect(flashcardsApi.recognize).toHaveBeenCalledWith(file);
  expect((screen.getByLabelText('Распознанный текст') as HTMLTextAreaElement).value).toBe(
    'Растения выделяют кислород.'
  );
  expect((screen.getByRole('button', { name: /Продолжить/ }) as HTMLButtonElement).disabled).toBe(false);
});
it('does not enable continuation or invent text when photo recognition fails', async () => {
  stubPhotoPreview();
  vi.mocked(flashcardsApi.recognize).mockRejectedValue(new ApiError(502, 'Фото не прочитано'));
  mount(<SourcePage />, '/new', '/new');
  await userEvent.click(screen.getByRole('button', { name: 'Фото' }));
  fireEvent.change(screen.getByLabelText('Выбрать фото'), {
    target: { files: [new File(['image'], 'page.png', { type: 'image/png' })] }
  });
  await screen.findByText('Фото не прочитано');
  expect((screen.getByRole('button', { name: /Продолжить/ }) as HTMLButtonElement).disabled).toBe(true);
  expect(screen.getByRole('button', { name: 'Повторить распознавание' })).toBeTruthy();
});
it('ignores recognition results after the photo has been removed', async () => {
  stubPhotoPreview();
  let resolve!: (value: { text: string }) => void;
  vi.mocked(flashcardsApi.recognize).mockReturnValue(
    new Promise((done) => {
      resolve = done;
    })
  );
  mount(<SourcePage />, '/new', '/new');
  await userEvent.click(screen.getByRole('button', { name: 'Фото' }));
  fireEvent.change(screen.getByLabelText('Выбрать фото'), {
    target: { files: [new File(['image'], 'page.png', { type: 'image/png' })] }
  });
  await screen.findByText('Распознаём страницу…');
  await userEvent.click(screen.getByRole('button', { name: 'Убрать фото' }));
  await act(async () => {
    resolve({ text: 'Устаревший результат' });
  });
  await waitFor(() => expect(screen.queryByLabelText('Распознанный текст')).toBeNull());
  expect((screen.getByRole('button', { name: /Продолжить/ }) as HTMLButtonElement).disabled).toBe(true);
});

it.each(['pair', 'definition'] as const)('edits both %s sides and preserves semantic metadata', async (type) => {
  const deck = {
    id: 1,
    title: 'Словарь',
    sourceType: 'photo' as const,
    revision: 1,
    isDraft: true,
    cards: [
      {
        id: 10,
        question: 'Кровать',
        answer: 'Bed',
        type,
        frontLanguage: 'ru',
        backLanguage: 'en',
        source: 'ocr' as const,
        needsReview: true,
        knowledgeStatus: null
      }
    ],
    knowledgePercent: null,
    knownCount: 0,
    reviewedCount: 0
  };
  vi.mocked(flashcardsApi.get).mockResolvedValue(deck);
  vi.mocked(flashcardsApi.save).mockResolvedValue(deck);
  mount(<EditorPage />, '/decks/1/edit', '/decks/:id/edit');
  const front = await screen.findByLabelText('Передняя сторона');
  const back = screen.getByLabelText('Обратная сторона');
  expect((front as HTMLTextAreaElement).value).toBe('Кровать');
  expect((back as HTMLTextAreaElement).value).toBe('Bed');
  expect(screen.getByText(/Проверь карточку или формулу/)).toBeTruthy();
  await userEvent.clear(front);
  await userEvent.type(front, 'Окно');
  await userEvent.clear(back);
  await userEvent.type(back, 'Window');
  await userEvent.click(screen.getByRole('button', { name: 'Сохранить набор' }));
  await waitFor(() =>
    expect(flashcardsApi.save).toHaveBeenCalledWith(
      expect.objectContaining({
        cards: [
          expect.objectContaining({
            question: 'Окно',
            answer: 'Window',
            type,
            frontLanguage: 'ru',
            backLanguage: 'en',
            source: 'ocr',
            needsReview: false
          })
        ]
      }),
      1
    )
  );
});

it('shows fewer-card warnings in the editor', async () => {
  vi.mocked(flashcardsApi.get).mockResolvedValue({
    id: 1,
    title: 'Словарь',
    sourceType: 'text',
    revision: 1,
    isDraft: true,
    cards: [{ id: 10, question: 'Кровать', answer: 'Bed', type: 'pair', knowledgeStatus: null }],
    knowledgePercent: null,
    knownCount: 0,
    reviewedCount: 0
  });
  mount(<EditorPage />, '/decks/1/edit', '/decks/:id/edit', {
    generationWarnings: ['Создано меньше карточек: недостаточно материала.']
  });
  expect(await screen.findByText('Создано меньше карточек: недостаточно материала.')).toBeTruthy();
});

it('trains a language pair without inventing a question', async () => {
  vi.mocked(flashcardsApi.session).mockResolvedValue({
    ...session,
    cards: [
      {
        ...session.cards[0],
        type: 'pair',
        question: 'Кровать',
        answer: 'Bed',
        frontLanguage: 'ru',
        backLanguage: 'en'
      },
      session.cards[1]
    ]
  });
  mount(<StudyPage />);
  expect(await screen.findByRole('heading', { name: 'Кровать' })).toBeTruthy();
  const card = screen.getByRole('button', { name: 'Карточка 1. Вопрос: Кровать' });
  fireEvent.keyDown(card, { key: 'Enter' });
  expect(screen.getByRole('heading', { name: 'Bed' })).toBeTruthy();
  expect(screen.queryByText(/Как переводится/)).toBeNull();
  expect(flashcardsApi.grade).not.toHaveBeenCalled();
});

it('offers only thematic covers and saves a manual choice with the edited deck', async () => {
  const deck = {
    id: 1,
    title: 'Фотосинтез',
    sourceType: 'manual' as const,
    revision: 1,
    isDraft: false,
    cards: session.cards,
    knowledgePercent: null,
    knownCount: 0,
    reviewedCount: 0,
    coverIconId: 'plant-leaves',
    coverSelection: 'auto' as const
  };
  vi.mocked(flashcardsApi.get).mockResolvedValue(deck);
  vi.mocked(flashcardsApi.save)
    .mockClear()
    .mockResolvedValue({ ...deck, coverIconId: 'rocket', coverSelection: 'manual' });
  mount(<EditorPage />, '/decks/1/edit', '/decks/:id/edit');
  await screen.findByText('Обложка набора · изменить');
  expect(screen.getByRole('group', { name: 'Обложка набора', hidden: true }).querySelectorAll('button')).toHaveLength(
    10
  );
  await userEvent.click(screen.getByText('Обложка набора · изменить'));
  await userEvent.click(screen.getByRole('button', { name: 'Космос' }));
  fireEvent.change(screen.getByLabelText(/Название набора/), { target: { value: 'Новое название' } });
  await userEvent.click(screen.getByRole('button', { name: 'Сохранить набор' }));
  await waitFor(() =>
    expect(flashcardsApi.save).toHaveBeenCalledWith(
      expect.objectContaining({ coverIconId: 'rocket', coverSelection: 'manual', title: 'Новое название' }),
      1
    )
  );
});

it('holds the home header stable after load and advertises a verified resumable session', async () => {
  vi.mocked(flashcardsApi.list).mockResolvedValue([
    { id: 1, title: 'Урок', cards: [], knowledgePercent: null }
  ] as never);
  vi.mocked(flashcardsApi.home).mockResolvedValue({
    deckCount: 1,
    resumableSessionId: 7,
    resumableDeckTitle: 'Очень длинный учебный набор',
    masteredToday: 2,
    completedToday: 1
  });
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <LibraryPage />
      </MemoryRouter>
    </QueryClientProvider>
  );
  await screen.findByRole('heading', { name: 'Продолжим?' });
  expect(screen.getByRole('link', { name: 'Продолжить' }).getAttribute('href')).toBe('/sessions/7');
  await act(async () => {
    client.setQueryData(['flashcards', 'home'], {
      deckCount: 1,
      resumableSessionId: null,
      masteredToday: 9,
      completedToday: 1
    });
  });
  expect(screen.getByRole('heading', { name: 'Продолжим?' })).toBeTruthy();
});
it('uses neutral copy when home metrics fail', async () => {
  vi.mocked(flashcardsApi.list).mockResolvedValue([
    { id: 1, title: 'Урок', cards: [], knowledgePercent: null }
  ] as never);
  vi.mocked(flashcardsApi.home).mockRejectedValue(new Error('Metrics unavailable'));
  mount(<LibraryPage />, '/', '/');
  await screen.findByRole('heading', { name: 'Что учим сегодня?' });
  expect(screen.queryByRole('link', { name: 'Продолжить' })).toBeNull();
  expect(screen.queryByText('Хорошая работа!')).toBeNull();
});
it('shows a skeleton until home data is ready', async () => {
  vi.mocked(flashcardsApi.list).mockResolvedValue([]);
  vi.mocked(flashcardsApi.home).mockReturnValue(new Promise(() => {}));
  mount(<LibraryPage />, '/', '/');
  expect(screen.getByRole('status', { name: 'Загружаем библиотеку' })).toBeTruthy();
  expect(screen.queryByText('Хорошая работа!')).toBeNull();
});
it('rejects multiple photos at runtime', async () => {
  stubPhotoPreview();
  mount(<SourcePage />, '/new', '/new');
  fireEvent.change(screen.getByLabelText('Выбрать фото'), {
    target: {
      files: [new File(['image'], 'a.png', { type: 'image/png' }), new File(['image'], 'b.png', { type: 'image/png' })]
    }
  });
  await screen.findByText('Выберите одно JPG или PNG до 10 МБ.');
  expect(flashcardsApi.recognize).not.toHaveBeenCalled();
});
it('reports empty OCR without generating fabricated cards', async () => {
  stubPhotoPreview();
  vi.mocked(flashcardsApi.recognize).mockResolvedValue({ text: '' });
  mount(<SourcePage />, '/new', '/new');
  fireEvent.change(screen.getByLabelText('Выбрать фото'), {
    target: { files: [new File(['image'], 'a.png', { type: 'image/png' })] }
  });
  await screen.findByText('Не удалось прочитать текст. Выбери более чёткое фото.');
  expect((screen.getByRole('button', { name: /Продолжить/ }) as HTMLButtonElement).disabled).toBe(true);
});

it('rechecks cached resume data before showing the home title on navigation entry', async () => {
  vi.mocked(flashcardsApi.list).mockResolvedValue([]);
  let resolve!: (data: Awaited<ReturnType<typeof flashcardsApi.home>>) => void;
  vi.mocked(flashcardsApi.home).mockReturnValue(
    new Promise((done) => {
      resolve = done;
    })
  );
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  client.setQueryData(['flashcards', 'home'], {
    deckCount: 1,
    resumableSessionId: 7,
    resumableDeckTitle: 'Old session',
    masteredToday: 0,
    completedToday: 0
  });
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <LibraryPage />
      </MemoryRouter>
    </QueryClientProvider>
  );
  expect(screen.getByRole('status', { name: 'Загружаем библиотеку' })).toBeTruthy();
  expect(screen.queryByRole('link', { name: 'Продолжить' })).toBeNull();
  await act(async () => {
    resolve({ deckCount: 1, resumableSessionId: null, resumableDeckTitle: '', masteredToday: 2, completedToday: 1 });
  });
  await screen.findByRole('heading', { name: 'Хорошая работа!' });
});
