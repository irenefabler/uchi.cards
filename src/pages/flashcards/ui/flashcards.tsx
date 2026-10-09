import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams, useLocation, Link } from 'react-router';
import { flashcardsApi, deckKeys, ApiError } from 'src/shared/api/flashcards';
import type { Deck, DeckInput, Grade } from 'src/shared/api/flashcards';
import { resolveHomeHeader } from '../model/home-header';
import { validCards } from '../model/study';
import chevronAsset from './assets/6-6045-imgChevronRight.svg';
import plusAsset from './assets/6-6045-imgPlus.svg';
import cameraAsset from './assets/6-6124-imgCamera.svg';
import backAsset from './assets/6-6124-imgChevronLeft.svg';
import pencilAsset from './assets/6-6124-imgPencilLine.svg';
import hintAsset from './assets/6-6124-imgSparkles.svg';
import sourceCheckAsset from './assets/6-6168-imgCheckCircle2.svg';
import fileAsset from './assets/6-6168-imgFileText.svg';
import aiAsset from './assets/6-6168-imgSparkles.svg';
import generateAsset from './assets/6-6168-imgSparkles1.svg';
import saveAsset from './assets/6-6218-imgCheck.svg';
import trashAsset from './assets/6-6218-imgTrash2.svg';
import brainAsset from './assets/6-6284-imgBrain.svg';
import playAsset from './assets/6-6284-imgPlay.svg';
import closeAsset from './assets/6-6351-imgX.svg';
import checkAsset from './assets/6-6395-imgCheck.svg';
import restartAsset from './assets/6-6395-imgRotateCcw.svg';
import adviceAsset from './assets/6-6395-imgSparkles.svg';
import { CardText } from './card-text';
import { CoverIcon, Illustration, coverOptions } from './cover-icon';
import styles from './flashcards.module.css';
import { GestureCard } from './gesture-card';

const artwork = {
  chevron: chevronAsset,
  plus: plusAsset,
  back: backAsset,
  camera: cameraAsset,
  pencil: pencilAsset,
  hint: hintAsset,
  file: fileAsset,
  sourceCheck: sourceCheckAsset,
  ai: aiAsset,
  generate: generateAsset,
  trash: trashAsset,
  save: saveAsset,
  brain: brainAsset,
  play: playAsset,
  close: closeAsset,
  check: checkAsset,
  advice: adviceAsset,
  restart: restartAsset
};
function Icon({ name }: { name: keyof typeof artwork }) {
  return <img src={artwork[name]} alt="" aria-hidden="true" draggable={false} className={styles.icon} />;
}

const cardCountLabel = (count: number) => {
  const lastTwo = count % 100,
    last = count % 10;
  return `${count} ${
    lastTwo >= 11 && lastTwo <= 14
      ? 'карточек'
      : last === 1
      ? 'карточка'
      : last >= 2 && last <= 4
      ? 'карточки'
      : 'карточек'
  }`;
};
const emptyCard = () => ({ id: 0, question: '', answer: '' });
const message = (error: unknown) =>
  error instanceof Error ? error.message : 'Не удалось выполнить действие. Проверьте подключение.';

function Shell({
  children,
  title,
  back,
  onBack,
  study = false,
  navigationTitle
}: {
  children: ReactNode;
  title?: string;
  back?: string;
  onBack?: () => void;
  study?: boolean;
  navigationTitle?: string;
}) {
  return (
    <main className={`${styles.app} ${study ? styles.studyShell : ''}`}>
      <div className={styles.container}>
        <header className={styles.header}>
          {onBack ? (
            <button className={styles.iconButton} onClick={onBack} aria-label="Назад">
              <Icon name="back" />
            </button>
          ) : back ? (
            <Link className={styles.iconButton} to={back} aria-label="Назад">
              <Icon name="back" />
            </Link>
          ) : (
            <Link className={styles.brand} to="/">
              Учи<span>.</span>Карточки
            </Link>
          )}
          {navigationTitle ? (
            <strong className={styles.navigationTitle}>{navigationTitle}</strong>
          ) : (
            !study && <span className={styles.beta}>БЕТА</span>
          )}
          {navigationTitle && <span className={styles.navigationSpacer} aria-hidden="true" />}
        </header>
        {title && <h1>{title}</h1>}
        {children}
      </div>
    </main>
  );
}
function Notice({ children, error = false }: { children: ReactNode; error?: boolean }) {
  return (
    <p className={`${styles.notice} ${error ? styles.error : ''}`} role={error ? 'alert' : 'status'}>
      {children}
    </p>
  );
}
function Progress({
  value,
  label = 'Освоено в последней тренировке',
  compact = false,
  counter,
  colored = false
}: {
  value: number | null;
  label?: string;
  compact?: boolean;
  counter?: string;
  colored?: boolean;
}) {
  return (
    <div className={`${styles.progress} ${compact ? styles.compactProgress : ''}`}>
      {!compact && (
        <div className={styles.progressLabel}>
          <span>{label}</span>
          <strong>{counter ?? (value === null ? '—' : `${value}%`)}</strong>
        </div>
      )}
      <div className={styles.progressMeter}>
        <div
          className={styles.track}
          role="progressbar"
          aria-label={label}
          aria-valuenow={value ?? 0}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <span
            style={{
              width: `${value ?? 0}%`,
              backgroundColor: colored
                ? (value ?? 0) < 30
                  ? '#FF716D'
                  : (value ?? 0) < 85
                  ? '#9387FF'
                  : '#E1FF97'
                : undefined
            }}
          />
        </div>
        {compact && <span className={styles.progressValue}>{value === null ? '—' : `${value}%`}</span>}
      </div>
      {value === null && <small>Ещё не изучали</small>}
    </div>
  );
}
function Failure({ error, retry }: { error: unknown; retry: () => void }) {
  return (
    <>
      <Notice error>{message(error)}</Notice>
      <button className={styles.secondary} onClick={retry}>
        Попробовать ещё раз
      </button>
    </>
  );
}
function useDeck() {
  const id = Number(useParams().id);
  return useQuery({ queryKey: deckKeys.deck(id), queryFn: () => flashcardsApi.get(id), enabled: id > 0 });
}

export function LibraryPage() {
  const [page, setPage] = useState(1);
  const query = useQuery({ queryKey: deckKeys.list(page), queryFn: () => flashcardsApi.list(page) });
  const drafts = useQuery({ queryKey: deckKeys.list(1, true), queryFn: () => flashcardsApi.list(1, true) });
  const home = useQuery({
    queryKey: deckKeys.home(),
    queryFn: flashcardsApi.home,
    refetchOnMount: 'always',
    refetchOnWindowFocus: false,
    retry: false
  });
  const headerSnapshot = useRef<ReturnType<typeof resolveHomeHeader> | null>(null);
  if (!headerSnapshot.current && !home.isPending && !home.isFetching && !query.isPending) {
    headerSnapshot.current =
      !home.isError && home.data
        ? resolveHomeHeader(home.data)
        : resolveHomeHeader({
            deckCount: 1,
            resumableSessionId: null,
            resumableDeckTitle: '',
            masteredToday: 0,
            completedToday: 0
          });
  }
  const header = headerSnapshot.current;
  return (
    <Shell title={header?.title}>
      {header ? (
        <>
          <p className={styles.subtitle}>{header.subtitle}</p>
          {header.sessionId && (
            <Link className={`${styles.secondary} ${styles.resumeAction}`} to={`/sessions/${header.sessionId}`}>
              Продолжить
            </Link>
          )}
        </>
      ) : (
        <div className={styles.headerSkeleton} role="status" aria-label="Загружаем библиотеку" />
      )}
      <h2 className={styles.srOnly}>Мои наборы</h2>
      {query.isPending && <Notice>Загружаем ваши наборы…</Notice>}
      {query.isError && <Failure error={query.error} retry={() => void query.refetch()} />}
      {query.data?.length === 0 && (
        <div className={styles.empty}>
          <Illustration id="folder-cards" />
          <h2>Первый набор — начало!</h2>
          <p>Добавьте карточки и попробуйте тренировку.</p>
          <Link className={styles.primary} to="/new">
            Создать набор
          </Link>
        </div>
      )}
      <div className={styles.deckList}>
        {query.data?.map((deck) => (
          <Link key={deck.id} className={styles.deckItem} to={`/decks/${deck.id}`}>
            <CoverIcon id={deck.coverIconId} />
            <div>
              <div className={styles.deckTitle}>
                <h2>{deck.title}</h2>
                <span className={styles.chevron}>
                  <Icon name="chevron" />
                </span>
              </div>
              <small>{cardCountLabel(deck.cards.length)}</small>
              <Progress value={deck.knowledgePercent} compact colored />
            </div>
          </Link>
        ))}
      </div>
      {!!drafts.data?.length && (
        <section className={styles.drafts}>
          <h2>Черновики</h2>
          {drafts.data.map((deck) => (
            <Link key={deck.id} to={`/decks/${deck.id}/edit`}>
              {deck.title} <span>Продолжить →</span>
            </Link>
          ))}
        </section>
      )}
      {query.data && (
        <nav className={styles.pagination} aria-label="Страницы библиотеки">
          {page > 1 && <button onClick={() => setPage(page - 1)}>← Назад</button>}
          {query.data.length === 50 && <button onClick={() => setPage(page + 1)}>Дальше →</button>}
        </nav>
      )}
      <Link to="/new" className={`${styles.primary} ${styles.createDeck}`} aria-label="Создать новый набор">
        <Icon name="plus" />
      </Link>
    </Shell>
  );
}

const sourceKey = 'uchi-cards-source-v1';
function readSource(): { sourceType: Deck['sourceType']; text: string; filename: string } {
  try {
    return JSON.parse(sessionStorage.getItem(sourceKey) || 'null') || { sourceType: 'photo', text: '', filename: '' };
  } catch {
    return { sourceType: 'photo', text: '', filename: '' };
  }
}
const newDraftKey = 'uchi-cards-editor-0';
const draftSourceKey = 'uchi-cards-draft-source';
const titleTouchedKey = 'uchi-cards-title-touched';
export function SourcePage() {
  const initial = readSource();
  const [mode, setMode] = useState<Deck['sourceType']>(initial.sourceType);
  const [text, setText] = useState(initial.text);
  const [photo, setPhoto] = useState<File>();
  const [preview, setPreview] = useState('');
  const [error, setError] = useState('');
  const nav = useNavigate();
  useEffect(() => {
    if (!photo) {
      setPreview('');
      return;
    }
    const url = URL.createObjectURL(photo);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [photo]);
  const [recognizing, setRecognizing] = useState(false);
  const [generating, setGenerating] = useState(false);
  const generationRequest = useRef(0);
  useEffect(
    () => () => {
      generationRequest.current += 1;
    },
    []
  );
  const recognitionRequest = useRef(0);
  useEffect(
    () => () => {
      recognitionRequest.current += 1;
    },
    []
  );
  async function recognize(file: File) {
    const request = ++recognitionRequest.current;
    setText('');
    setError('');
    setRecognizing(true);
    try {
      const result = await flashcardsApi.recognize(file);
      if (request === recognitionRequest.current) {
        if (!result.text.trim()) throw new Error('Не удалось прочитать текст. Выбери более чёткое фото.');
        setText(result.text);
      }
    } catch (err) {
      if (request === recognitionRequest.current) setError(message(err));
    } finally {
      if (request === recognitionRequest.current) setRecognizing(false);
    }
  }
  async function create(sourceType: Deck['sourceType'] = mode) {
    const material = sourceType === 'manual' ? '' : text;
    const signature = JSON.stringify({ sourceType, text: material });
    sessionStorage.setItem(sourceKey, JSON.stringify({ sourceType, text: material, filename: photo?.name || '' }));
    try {
      const cached = JSON.parse(sessionStorage.getItem(newDraftKey) || 'null');
      if (
        sessionStorage.getItem(draftSourceKey) === signature &&
        Array.isArray(cached?.cards) &&
        cached.cards.every(
          (card: { question: string; answer: string }) =>
            card.question.trim().toLocaleLowerCase() !== card.answer.trim().toLocaleLowerCase()
        )
      ) {
        nav('/new/review');
        return;
      }
    } catch {
      /* Generate again if the cache is invalid. */
    }
    const request = ++generationRequest.current;
    setGenerating(true);
    setError('');
    try {
      const generated =
        sourceType === 'manual'
          ? null
          : await flashcardsApi.generate(material, 0, sourceType === 'photo' ? 'ocr' : 'text');
      if (request !== generationRequest.current) return;
      if (generated && !generated.cards.length)
        throw new Error('Не удалось выделить карточки. Попробуй другой материал или исправь текст.');
      let priorTitle = '';
      try {
        if (sessionStorage.getItem(titleTouchedKey))
          priorTitle = JSON.parse(sessionStorage.getItem(newDraftKey) || '{}').title || '';
      } catch {
        /* No previous draft. */
      }
      const draft = {
        id: 0,
        title: sourceType === 'manual' ? '' : priorTitle || generated?.suggestedTitle || '',
        sourceType,
        revision: 0,
        isDraft: true,
        coverIconId: generated?.coverIconId || 'flashcards-leaf',
        coverSelection: 'auto',
        cards: generated?.cards || [emptyCard()],
        knowledgePercent: null,
        knownCount: 0,
        reviewedCount: 0
      };
      sessionStorage.setItem(newDraftKey, JSON.stringify(draft));
      sessionStorage.setItem(draftSourceKey, signature);
      sessionStorage.setItem('uchi-cards-generation-warnings', JSON.stringify(generated?.warnings || []));
      nav('/new/review');
    } catch (err) {
      if (request === generationRequest.current) setError(message(err));
    } finally {
      if (request === generationRequest.current) setGenerating(false);
    }
  }
  if (generating)
    return (
      <Shell title="Готовим карточки" navigationTitle="Новый набор">
        <div className={styles.sourceIllustration} role="status">
          <Illustration id="sparkles" />
          <p>Анализируем материал и выбираем полезные пары…</p>
        </div>
      </Shell>
    );
  return (
    <Shell
      title={
        mode === 'photo'
          ? 'Преврати фото в карточки'
          : mode === 'text'
          ? 'Преврати текст в карточки'
          : 'Создай свои карточки'
      }
      navigationTitle="Новый набор"
      back="/"
    >
      <p className={styles.subtitle}>Загрузи материал, а ИИ поможет запомнить самое важное.</p>
      <div className={styles.segment} role="group" aria-label="Источник карточек">
        {(
          [
            ['photo', 'Фото'],
            ['text', 'Текст'],
            ['manual', 'Вручную']
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            disabled={recognizing}
            aria-pressed={mode === value}
            className={mode === value ? styles.selected : ''}
            onClick={() => {
              if (value === 'manual') {
                void create('manual');
                return;
              }
              setMode(value);
              setText('');
              setError('');
            }}
          >
            {label}
          </button>
        ))}
      </div>
      {mode === 'photo' && (
        <section className={`${styles.panel} ${styles.upload}`}>
          <div className={styles.uploadInner}>
            {!preview && <Illustration id="camera-photo" />}
            {preview && <img src={preview} alt="Выбранная страница учебника" />}
            <label className={styles.primary} htmlFor="source-photo">
              <Icon name="camera" />
              {photo ? 'Заменить фото' : 'Выбрать фото'}
            </label>
            <input
              className={styles.fileInput}
              id="source-photo"
              type="file"
              accept="image/jpeg,image/png"
              onChange={(event) => {
                const files = event.target.files;
                if (!files?.length) return;
                const file = files[0];
                if (
                  files.length !== 1 ||
                  !['image/jpeg', 'image/png'].includes(file.type) ||
                  file.size > 10 * 1024 * 1024
                ) {
                  setError('Выберите одно JPG или PNG до 10 МБ.');
                  event.target.value = '';
                  return;
                }
                setPhoto(file);
                void recognize(file);
              }}
            />
            {photo && (
              <>
                <p>{photo.name}</p>
                <button
                  className={styles.textButton}
                  onClick={() => {
                    recognitionRequest.current += 1;
                    setPhoto(undefined);
                    setText('');
                    setRecognizing(false);
                    setError('');
                  }}
                >
                  Убрать фото
                </button>
              </>
            )}
            <small>
              Загрузи фото страницы учебника
              <br />
              Одна страница · JPG или PNG · до 10 МБ
            </small>
          </div>
        </section>
      )}
      {mode !== 'manual' && (
        <button
          className={styles.manualOption}
          disabled={recognizing}
          onClick={() => {
            void create('manual');
          }}
        >
          <span className={styles.manualIcon}>
            <Icon name="pencil" />
          </span>
          <span>
            <strong>Создать вручную</strong>
            <small>Добавь вопросы и ответы сам</small>
          </span>
          <Icon name="chevron" />
        </button>
      )}
      {mode === 'photo' && recognizing && <Notice>Распознаём страницу…</Notice>}
      {mode === 'photo' && photo && error && !recognizing && (
        <button className={styles.secondary} onClick={() => void recognize(photo)}>
          Повторить распознавание
        </button>
      )}
      {mode === 'text' && (
        <div className={styles.sourceIllustration}>
          <Illustration id="document-aa" />
        </div>
      )}
      {(mode === 'text' || (mode === 'photo' && text.trim())) && (
        <label className={styles.panel}>
          {mode === 'photo' ? 'Распознанный текст' : 'Текст учебника'}
          <textarea
            aria-label={mode === 'photo' ? 'Распознанный текст' : 'Текст учебника'}
            value={text}
            maxLength={20000}
            rows={9}
            placeholder="Вставьте текст, по которому хотите учиться…"
            onChange={(event) => setText(event.target.value)}
          />
          <small>{text.length} / 20 000</small>
        </label>
      )}
      {mode === 'manual' && (
        <section className={`${styles.panel} ${styles.empty}`}>
          <Illustration id="pencil" />
          <h2>Ваши вопросы и ответы</h2>
          <p>Создайте набор самостоятельно. Можно начать с одной карточки.</p>
        </section>
      )}
      {mode !== 'manual' && (
        <p className={styles.sourceHint}>
          <Icon name="hint" />{' '}
          <span>
            {mode === 'text'
              ? 'Создадим пары, определения или вопросы по вашему материалу. Перед сохранением их можно проверить и изменить.'
              : 'Чёткое фото — точные карточки. Убедись, что текст хорошо виден.'}
          </span>
        </p>
      )}
      {error && <Notice error>{error}</Notice>}
      <button
        className={styles.primary}
        disabled={mode !== 'manual' && (recognizing || !text.trim())}
        onClick={() => void create()}
      >
        Продолжить <span>→</span>
      </button>
    </Shell>
  );
}
export function NewEditorPage() {
  const nav = useNavigate();
  let draft: Deck | null = null;
  let warnings: string[] = [];
  try {
    draft = JSON.parse(sessionStorage.getItem(newDraftKey) || 'null');
    warnings = JSON.parse(sessionStorage.getItem('uchi-cards-generation-warnings') || '[]');
  } catch {
    /* Invalid local draft is returned to source selection. */
  }
  const valid = draft?.id === 0 && Array.isArray(draft.cards) && typeof draft.title === 'string';
  useEffect(() => {
    if (!valid) nav('/new', { replace: true });
  }, [valid, nav]);
  return valid && draft ? (
    <Editor initial={draft} warnings={Array.isArray(warnings) ? warnings : []} />
  ) : (
    <Shell>
      <Notice>Открываем создание…</Notice>
    </Shell>
  );
}

export function EditorPage() {
  const query = useDeck();
  if (query.isPending)
    return (
      <Shell>
        <Notice>Открываем редактор…</Notice>
      </Shell>
    );
  if (query.isError)
    return (
      <Shell back="/">
        <Failure error={query.error} retry={() => void query.refetch()} />
      </Shell>
    );
  return <Editor key={query.data.id} initial={query.data} />;
}
function Editor({ initial, warnings }: { initial: Deck; warnings?: string[] }) {
  const location = useLocation();
  const generationWarnings: string[] =
    warnings ||
    (Array.isArray(location.state?.generationWarnings)
      ? location.state.generationWarnings.filter((warning: unknown) => typeof warning === 'string')
      : []);
  const draftKey = `uchi-cards-editor-${initial.id}`;
  const [draft, setDraft] = useState<DeckInput>(() => {
    try {
      const local = JSON.parse(sessionStorage.getItem(draftKey) || 'null') as DeckInput | null;
      if (local?.revision === initial.revision && Array.isArray(local.cards) && typeof local.title === 'string')
        return local;
    } catch {
      /* An unavailable local cache must not prevent opening the editor. */
    }
    return { ...initial, cards: initial.cards.map((card) => ({ ...card })) };
  });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState('');
  const nav = useNavigate();
  const client = useQueryClient();
  const baseline = useRef(JSON.stringify({ ...initial, cards: initial.cards.map((card) => ({ ...card })) }));
  const dirty = initial.id === 0 || JSON.stringify(draft) !== baseline.current;
  useEffect(() => {
    const onUnload = (event: BeforeUnloadEvent) => {
      if (dirty) {
        event.preventDefault();
        event.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', onUnload);
    return () => window.removeEventListener('beforeunload', onUnload);
  }, [dirty]);
  useEffect(() => {
    try {
      if (dirty) sessionStorage.setItem(draftKey, JSON.stringify(draft));
    } catch {
      /* Explicit server draft saving remains available. */
    }
  }, [dirty, draft, draftKey]);
  function update(index: number, key: 'question' | 'answer', value: string) {
    setSaved('');
    setDraft((prev) => ({
      ...prev,
      cards: prev.cards.map((card, i) =>
        i === index ? { ...card, [key]: value, needsReview: card.knowledgeType?.startsWith('formula_') || false } : card
      )
    }));
  }
  async function save(isDraft: boolean) {
    setBusy(true);
    setError('');
    try {
      const result = await flashcardsApi.save({ ...draft, isDraft }, initial.id || undefined);
      const next = { ...result, cards: result.cards.map((card) => ({ ...card })) };
      baseline.current = JSON.stringify(next);
      sessionStorage.removeItem(draftKey);
      if (!initial.id) {
        sessionStorage.removeItem(sourceKey);
        sessionStorage.removeItem(draftSourceKey);
        sessionStorage.removeItem(titleTouchedKey);
        sessionStorage.removeItem('uchi-cards-generation-warnings');
      }
      setDraft(next);
      client.setQueryData(deckKeys.deck(result.id), result);
      await client.invalidateQueries({ queryKey: deckKeys.all });
      setSaved('Черновик сохранён');
      if (!isDraft) nav(`/decks/${result.id}`);
      else if (!initial.id) nav(`/decks/${result.id}/edit`, { replace: true });
    } catch (err) {
      setError(message(err));
    } finally {
      setBusy(false);
    }
  }
  const duplicates = draft.cards.map((card) =>
    `${card.question.trim()}\u0000${card.answer.trim()}`.toLocaleLowerCase()
  );
  return (
    <Shell
      title="Проверь карточки"
      navigationTitle="Проверка карточек"
      onBack={() => {
        if (busy) return;
        if (!dirty || window.confirm('Есть несохранённые правки. Выйти без сохранения?'))
          nav(!initial.id ? '/new' : initial.isDraft ? '/' : `/decks/${initial.id}`);
      }}
    >
      <p className={styles.subtitle}>Всё верно? Можно поправить текст.</p>
      <label className={styles.editorName}>
        <span>Название набора · {cardCountLabel(draft.cards.length)}</span>
        <input
          value={draft.title}
          maxLength={120}
          disabled={busy}
          onChange={(event) => {
            if (!initial.id) sessionStorage.setItem(titleTouchedKey, 'true');
            setDraft({ ...draft, title: event.target.value });
          }}
        />
      </label>
      <details className={styles.coverPicker}>
        <summary>
          <CoverIcon id={draft.coverIconId} />
          <span>Обложка набора · изменить</span>
        </summary>
        <div className={styles.coverChoices} role="group" aria-label="Обложка набора">
          {coverOptions.map((option) => (
            <button
              type="button"
              key={option.id}
              disabled={busy}
              aria-label={option.label}
              aria-pressed={(draft.coverIconId || 'flashcards-leaf') === option.id}
              onClick={() => setDraft({ ...draft, coverIconId: option.id, coverSelection: 'manual' })}
            >
              <CoverIcon id={option.id} />
              <span>{option.label}</span>
            </button>
          ))}
        </div>
      </details>
      {draft.sourceType !== 'manual' && (
        <Notice>Карточки созданы по материалу. Проверьте обе стороны перед сохранением.</Notice>
      )}
      {generationWarnings.map((warning, index) => (
        <Notice key={`${index}-${warning}`}>{warning}</Notice>
      ))}
      <div className={styles.editList}>
        {draft.cards.map((card, index) => (
          <section key={`${index}-${card.id}`} className={`${styles.panel} ${styles.editCard}`}>
            <div className={styles.row}>
              <strong>Карточка {index + 1}</strong>
              <button
                aria-label={`Удалить карточку ${index + 1}`}
                className={styles.deleteButton}
                disabled={busy}
                onClick={() => setDraft({ ...draft, cards: draft.cards.filter((_, i) => i !== index) })}
              >
                <Icon name="trash" />
              </button>
            </div>
            {card.needsReview && (
              <Notice error>Проверь карточку или формулу по исходнику: не все элементы удалось подтвердить.</Notice>
            )}
            <label>
              {card.type && card.type !== 'qa' ? 'Передняя сторона' : 'Вопрос'}
              <textarea
                rows={2}
                aria-label={card.type && card.type !== 'qa' ? 'Передняя сторона' : 'Вопрос'}
                value={card.question}
                maxLength={500}
                disabled={busy}
                onChange={(event) => update(index, 'question', event.target.value)}
              />
              <small className={styles.charCount}>{card.question.length}/500</small>
            </label>
            <label>
              {card.type && card.type !== 'qa' ? 'Обратная сторона' : 'Ответ'}
              <textarea
                rows={3}
                aria-label={card.type && card.type !== 'qa' ? 'Обратная сторона' : 'Ответ'}
                value={card.answer}
                maxLength={2000}
                disabled={busy}
                onChange={(event) => update(index, 'answer', event.target.value)}
              />
              <small className={styles.charCount}>{card.answer.length}/2000</small>
            </label>
            {card.question.trim() && duplicates.indexOf(duplicates[index]) !== index && (
              <Notice error>Такая карточка уже есть.</Notice>
            )}
            {(card.question.includes('\\(') || card.answer.includes('\\(')) && (
              <div className={styles.mathPreview} aria-label={`Предпросмотр карточки ${index + 1}`}>
                <CardText text={card.question} />
                <hr />
                <CardText text={card.answer} />
              </div>
            )}
            {card.question.trim() &&
              card.question.trim().toLocaleLowerCase() === card.answer.trim().toLocaleLowerCase() && (
                <Notice error>Обе стороны совпадают. Добавь на лицевую сторону задание или слово с пропуском.</Notice>
              )}
            {!card.answer.trim() && <small>Добавьте ответ перед сохранением набора.</small>}
          </section>
        ))}
      </div>
      <button
        className={styles.secondary}
        disabled={busy || draft.cards.length >= 100}
        onClick={() => setDraft({ ...draft, cards: [...draft.cards, emptyCard()] })}
      >
        ＋ Добавить карточку
      </button>
      {error && <Notice error>{error}</Notice>}
      {saved && <Notice>{saved}</Notice>}
      <div className={styles.stickyActions}>
        <button
          className={styles.primary}
          disabled={busy || !draft.title.trim() || !validCards(draft.cards)}
          onClick={() => void save(false)}
        >
          <Icon name="save" /> {busy ? 'Сохраняем…' : 'Сохранить набор'}
        </button>
        {initial.isDraft && (
          <button className={styles.secondary} disabled={busy || !draft.title.trim()} onClick={() => void save(true)}>
            Сохранить черновик
          </button>
        )}
      </div>
    </Shell>
  );
}
export function DeckPage() {
  const query = useDeck();
  const nav = useNavigate();
  const client = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const deckId = Number(useParams().id);
  const [direction, setDirection] = useState<'forward' | 'reverse'>(() => {
    try {
      return localStorage.getItem(`uchi-cards-direction-${deckId}`) === 'reverse' ? 'reverse' : 'forward';
    } catch {
      return 'forward';
    }
  });
  useEffect(() => {
    try {
      setDirection(localStorage.getItem(`uchi-cards-direction-${deckId}`) === 'reverse' ? 'reverse' : 'forward');
    } catch {
      setDirection('forward');
    }
  }, [deckId]);
  const activeId = query.data?.activeSessionId || 0;
  const active = useQuery({
    queryKey: deckKeys.session(activeId),
    queryFn: () => flashcardsApi.session(activeId),
    enabled: activeId > 0
  });
  const canResume =
    activeId > 0 && active.data && !active.data.finishedAt && (active.data.direction || 'forward') === direction;
  function swapDirection() {
    const next = direction === 'forward' ? 'reverse' : 'forward';
    setDirection(next);
    try {
      localStorage.setItem(`uchi-cards-direction-${deckId}`, next);
    } catch {
      /* The current screen still retains the selection. */
    }
  }
  async function start() {
    if (!query.data) return;
    if (canResume) {
      nav(`/sessions/${activeId}`);
      return;
    }
    setBusy(true);
    try {
      const session = await flashcardsApi.start(query.data.id, direction);
      client.setQueryData(deckKeys.session(session.id), session);
      nav(`/sessions/${session.id}`);
    } catch (err) {
      setError(message(err));
    } finally {
      setBusy(false);
    }
  }
  async function remove() {
    if (!query.data || !window.confirm('Удалить набор и его прогресс?')) return;
    setBusy(true);
    try {
      await flashcardsApi.remove(query.data.id);
      await client.invalidateQueries({ queryKey: deckKeys.all });
      nav('/');
    } catch (err) {
      setError(message(err));
    } finally {
      setBusy(false);
    }
  }
  if (query.isPending)
    return (
      <Shell>
        <Notice>Загружаем набор…</Notice>
      </Shell>
    );
  if (query.isError)
    return (
      <Shell back="/">
        <Failure error={query.error} retry={() => void query.refetch()} />
      </Shell>
    );
  const deck = query.data;
  return (
    <Shell>
      <div className={styles.deckHeading}>
        <CoverIcon id={deck.coverIconId} large />
        <div>
          <h1>{deck.title}</h1>
          <p>
            {cardCountLabel(deck.cards.length)}
            {deck.isDraft ? ' · Черновик' : ''}
          </p>
        </div>
      </div>
      <section className={`${styles.panel} ${styles.deckProgress}`}>
        <p className={styles.progressCaption}>Освоено в последней тренировке</p>
        <div className={styles.deckProgressSummary}>
          <p className={styles.stat}>
            {deck.knownCount} из {deck.cards.length} <span>освоено</span>
          </p>
          <span className={styles.knowledgeBadge}>
            <Icon name="brain" />
            <strong>{deck.knowledgePercent === null ? '—' : `${deck.knowledgePercent}%`}</strong>
          </span>
        </div>
        <Progress value={deck.knowledgePercent} compact />
      </section>
      <button
        className={styles.primary}
        disabled={busy || deck.isDraft || !deck.cards.length || (activeId > 0 && (active.isPending || active.isError))}
        onClick={() => void start()}
      >
        <Icon name="play" /> {canResume ? 'Продолжить тренировку' : 'Начать тренировку'}
      </button>
      {error && <Notice error>{error}</Notice>}
      {active.isError && <Failure error={active.error} retry={() => void active.refetch()} />}
      <div className={`${styles.row} ${styles.examplesHeader}`}>
        <h2 className={styles.examplesTitle}>Список карточек</h2>
        <button className={styles.textButton} disabled={busy || !deck.cards.length} onClick={swapDirection}>
          Поменять местами
        </button>
      </div>
      <div className={`${styles.pairColumns} ${styles.pairLabels}`} aria-label="Направление тренировки">
        <small>Передняя сторона</small>
        <small>Обратная сторона</small>
      </div>
      <div className={styles.deckList}>
        {deck.cards.map((card, index) => (
          <section
            key={card.id}
            className={`${styles.panel} ${styles.pairColumns}`}
            aria-label={`Карточка ${index + 1}`}
          >
            <div>
              <CardText text={direction === 'forward' ? card.question : card.answer} />
            </div>
            <div>
              <CardText text={direction === 'forward' ? card.answer : card.question} />
            </div>
          </section>
        ))}
      </div>
      <div className={`${styles.row} ${styles.deckActions}`}>
        <Link className={styles.textButton} to={`/decks/${deck.id}/edit`}>
          Редактировать набор
        </Link>
        <button className={styles.textButton} disabled={busy} onClick={() => void remove()}>
          Удалить набор
        </button>
      </div>
    </Shell>
  );
}
export function StudyPage() {
  const id = Number(useParams().id);
  const query = useQuery({ queryKey: deckKeys.session(id), queryFn: () => flashcardsApi.session(id) });
  const client = useQueryClient();
  const nav = useNavigate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [exit, setExit] = useState(false);
  const lock = useRef(false);
  const pending = useRef<Grade | null>(null);
  const session = query.data;
  const card = session?.cards.find((value) => value.id === session.nextCardId);
  const cardNumber = session && card ? session.cards.findIndex((value) => value.id === card.id) + 1 : 0;
  const mastered = session?.knownCount || 0;
  async function grade(status: 'known' | 'unknown', actionId?: string): Promise<boolean> {
    if (!session || !card || lock.current) return false;
    lock.current = true;
    setBusy(true);
    setError('');
    pending.current ||= {
      cardId: card.id,
      status,
      eventId: actionId ?? crypto.randomUUID(),
      presentationIndex: session.presentationIndex
    };
    try {
      const result = await flashcardsApi.grade(id, pending.current);
      client.setQueryData(deckKeys.session(id), result);
      pending.current = null;
      if (result.finishedAt) {
        await client.invalidateQueries({ queryKey: deckKeys.all });
        nav(`/sessions/${id}/results`, { replace: true });
      }
      return true;
    } catch (err) {
      setError(message(err));
      if (err instanceof ApiError && err.status >= 400 && err.status < 500) {
        pending.current = null;
        await query.refetch();
      }
      return false;
    } finally {
      setBusy(false);
      lock.current = false;
    }
  }
  async function finish() {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    try {
      const result = await flashcardsApi.finish(id);
      client.setQueryData(deckKeys.session(id), result);
      await client.invalidateQueries({ queryKey: deckKeys.all });
      nav(`/sessions/${id}/results`, { replace: true });
    } catch (err) {
      setError(message(err));
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  async function pause() {
    if (lock.current) return;
    await client.invalidateQueries({ queryKey: deckKeys.all });
    nav(`/decks/${session?.deckId}`);
  }
  useEffect(() => {
    if (session?.finishedAt) nav(`/sessions/${id}/results`, { replace: true });
  }, [session?.finishedAt, id, nav]);
  if (query.isPending)
    return (
      <Shell study>
        <Notice>Подготавливаем тренировку…</Notice>
      </Shell>
    );
  if (query.isError)
    return (
      <Shell study>
        <Link className={styles.textButton} to="/">
          ← К наборам
        </Link>
        <Failure error={query.error} retry={() => void query.refetch()} />
      </Shell>
    );
  return (
    <Shell study>
      <div className={styles.studyHeader}>
        <button className={styles.iconButton} aria-label="Выйти из тренировки" onClick={() => setExit(true)}>
          <Icon name="close" />
        </button>
        <strong>{session?.title}</strong>
        <span className={styles.navigationSpacer} aria-hidden="true" />
      </div>
      <Progress
        value={session ? Math.round((mastered / session.cards.length) * 100) : 0}
        label="Тренировка"
        counter={`${mastered} из ${session?.cards.length} освоено`}
      />
      {card && session && (
        <GestureCard
          cardId={card.id}
          token={`${session.id}:${session.presentationIndex}:${card.id}`}
          number={cardNumber}
          question={card.question}
          answer={card.answer}
          disabled={busy || !!pending.current}
          onGrade={grade}
        />
      )}
      <span className={styles.srOnly} role="status" aria-live="polite">
        Освоено {mastered} из {session?.cards.length}
      </span>
      {error && (
        <>
          <Notice error>{error}</Notice>
          {pending.current && (
            <button className={styles.secondary} onClick={() => void grade(pending.current!.status)}>
              Повторить сохранение ответа
            </button>
          )}
        </>
      )}
      {!card && !session?.finishedAt && (
        <button className={styles.primary} disabled={busy} onClick={() => void finish()}>
          Показать результаты
        </button>
      )}
      {exit && <ExitDialog busy={busy} finish={() => void pause()} close={() => setExit(false)} />}
    </Shell>
  );
}
function ExitDialog({ busy, finish, close }: { busy: boolean; finish: () => void; close: () => void }) {
  const dialog = useRef<HTMLElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    dialog.current?.querySelector<HTMLButtonElement>('button:not(:disabled)')?.focus();
    return () => previous?.focus();
  }, []);
  return (
    <div className={styles.modalBackdrop}>
      <section
        ref={dialog}
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="exit-title"
        onKeyDown={(event) => {
          if (event.key === 'Escape' && !busy) {
            event.preventDefault();
            close();
          }
          if (event.key === 'Tab') {
            const buttons = Array.from(
              dialog.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)') || []
            );
            const first = buttons[0],
              last = buttons[buttons.length - 1];
            if (event.shiftKey && document.activeElement === first) {
              event.preventDefault();
              last?.focus();
            } else if (!event.shiftKey && document.activeElement === last) {
              event.preventDefault();
              first?.focus();
            }
          }
        }}
      >
        <h2 id="exit-title">Прерваться?</h2>
        <p>Сохраним место в тренировке. Вы сможете продолжить позже. Результат прошлого занятия останется прежним.</p>
        <button className={styles.primary} disabled={busy} onClick={finish}>
          Выйти и продолжить позже
        </button>
        <button className={styles.secondary} disabled={busy} onClick={close}>
          Продолжить
        </button>
      </section>
    </div>
  );
}
export function ResultsPage() {
  const id = Number(useParams().id);
  const query = useQuery({ queryKey: deckKeys.session(id), queryFn: () => flashcardsApi.session(id) });
  const nav = useNavigate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function restart() {
    if (!query.data) return;
    setBusy(true);
    try {
      const session = await flashcardsApi.start(query.data.deckId, query.data.direction || 'forward');
      nav(`/sessions/${session.id}`);
    } catch (err) {
      setError(message(err));
    } finally {
      setBusy(false);
    }
  }
  if (query.isPending)
    return (
      <Shell>
        <Notice>Загружаем результаты…</Notice>
      </Shell>
    );
  if (query.isError)
    return (
      <Shell back="/">
        <Failure error={query.error} retry={() => void query.refetch()} />
      </Shell>
    );
  const session = query.data;
  return (
    <Shell back={`/decks/${session.deckId}`} navigationTitle="Результат тренировки">
      <div className={styles.resultHeading}>
        <div>
          <h1>{session.finishedAt ? 'Так держать!' : 'Тренировка ещё идёт'}</h1>
          <p className={styles.subtitle}>
            {session.finishedAt ? (
              <>
                Отличная работа!
                <br />
                Ты делаешь успехи!
              </>
            ) : (
              'Каждый ответ — шаг к знаниям.'
            )}
          </p>
        </div>
        <Illustration
          id={session.finishedAt ? (session.knowledgePercent === 100 ? 'award-badge' : 'trophy') : 'brain'}
        />
      </div>
      <section className={`${styles.panel} ${styles.resultProgress}`}>
        <h2>Освоено в тренировке</h2>
        <div className={styles.resultScore}>
          <strong className={styles.bigPercent}>
            {session.knowledgePercent === null ? '—' : `${session.knowledgePercent}%`}
          </strong>
          <p>
            {session.knownCount} из {session.cards.length} освоено
          </p>
        </div>
        <Progress value={session.knowledgePercent} label="Освоено в этой тренировке" compact />
      </section>
      <div className={styles.resultStats}>
        <div>
          <span className={styles.statIcon}>
            <span>
              <Icon name="check" />
            </span>
          </span>
          <div>
            <strong>{session.knownCount}</strong>
            <small>Освоено</small>
          </div>
        </div>
        <div>
          <span className={styles.statIcon}>
            <span>
              <Icon name="close" />
            </span>
          </span>
          <div>
            <strong>{session.unknownCount}</strong>
            <small>Нужно повторить</small>
          </div>
        </div>
      </div>
      <p className={styles.resultAdvice}>
        <Icon name="advice" />
        <span>Продолжай тренироваться, чтобы запомнить ещё лучше.</span>
      </p>
      {error && <Notice error>{error}</Notice>}
      {session.finishedAt ? (
        <button className={styles.primary} disabled={busy} onClick={() => void restart()}>
          <Icon name="restart" />
          Пройти ещё раз
        </button>
      ) : (
        <Link className={styles.primary} to={`/sessions/${id}`}>
          Продолжить тренировку
        </Link>
      )}
      <Link className={styles.secondary} to={`/decks/${session.deckId}`}>
        Вернуться к набору
      </Link>
    </Shell>
  );
}
