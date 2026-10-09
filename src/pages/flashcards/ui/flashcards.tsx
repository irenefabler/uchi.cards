import { useEffect, useRef, useState } from 'react';
import type { ReactNode, PointerEvent as ReactPointerEvent } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams, Link } from 'react-router';
import { flashcardsApi, deckKeys, ApiError } from 'src/shared/api/flashcards';
import type { Deck, DeckInput, Grade } from 'src/shared/api/flashcards';
import { gesture, validCards } from '../model/study';
import leafAsset from './assets/6-6045-img.svg';
import chevronAsset from './assets/6-6045-imgChevronRight.svg';
import plusAsset from './assets/6-6045-imgPlus.svg';
import sunAsset from './assets/6-6045-imgSun.svg';
import cameraAsset from './assets/6-6124-imgCamera.svg';
import backAsset from './assets/6-6124-imgChevronLeft.svg';
import photoAsset from './assets/6-6124-imgGroup2147224083.svg';
import pencilAsset from './assets/6-6124-imgPencilLine.svg';
import hintAsset from './assets/6-6124-imgSparkles.svg';
import sourceCheckAsset from './assets/6-6168-imgCheckCircle2.svg';
import fileAsset from './assets/6-6168-imgFileText.svg';
import aiAsset from './assets/6-6168-imgSparkles.svg';
import generateAsset from './assets/6-6168-imgSparkles1.svg';
import saveAsset from './assets/6-6218-imgCheck.svg';
import trashAsset from './assets/6-6218-imgTrash2.svg';
import deckLeafAsset from './assets/6-6284-img.svg';
import previewLeafAsset from './assets/6-6284-img1.svg';
import brainAsset from './assets/6-6284-imgBrain.svg';
import playAsset from './assets/6-6284-imgPlay.svg';
import previewSunAsset from './assets/6-6284-imgSun.svg';
import arcTopAsset from './assets/6-6351-img.svg';
import arcBottomAsset from './assets/6-6351-img1.svg';
import studyLeafAsset from './assets/6-6351-img2.svg';
import flipAsset from './assets/6-6351-imgRotate3D.svg';
import closeAsset from './assets/6-6351-imgX.svg';
import cupAsset from './assets/6-6395-img.svg';
import checkAsset from './assets/6-6395-imgCheck.svg';
import restartAsset from './assets/6-6395-imgRotateCcw.svg';
import adviceAsset from './assets/6-6395-imgSparkles.svg';
import styles from './flashcards.module.css';

const artwork = {
  leaf: leafAsset,
  sun: sunAsset,
  chevron: chevronAsset,
  plus: plusAsset,
  back: backAsset,
  photo: photoAsset,
  camera: cameraAsset,
  pencil: pencilAsset,
  hint: hintAsset,
  file: fileAsset,
  sourceCheck: sourceCheckAsset,
  ai: aiAsset,
  generate: generateAsset,
  trash: trashAsset,
  save: saveAsset,
  deckLeaf: deckLeafAsset,
  brain: brainAsset,
  play: playAsset,
  previewSun: previewSunAsset,
  previewLeaf: previewLeafAsset,
  close: closeAsset,
  arcTop: arcTopAsset,
  arcBottom: arcBottomAsset,
  studyLeaf: studyLeafAsset,
  flip: flipAsset,
  cup: cupAsset,
  check: checkAsset,
  advice: adviceAsset,
  restart: restartAsset
};
function Icon({ name }: { name: keyof typeof artwork }) {
  return <img src={artwork[name]} alt="" aria-hidden="true" className={styles.icon} />;
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
  counter
}: {
  value: number | null;
  label?: string;
  compact?: boolean;
  counter?: string;
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
          <span style={{ width: `${value ?? 0}%` }} />
        </div>
        {compact && <span className={styles.progressValue}>{value === null ? '—' : `${value}%`}</span>}
      </div>
      {value === null && <small>Ещё не изучали</small>}
    </div>
  );
}
function Sprout({
  kind = 'leaf'
}: {
  kind?: 'leaf' | 'sun' | 'book' | 'photo' | 'cup' | 'deckLeaf' | 'studyLeaf' | 'previewLeaf' | 'previewSun';
}) {
  return (
    <div className={`${styles.art} ${styles[kind] ?? ''}`} aria-hidden="true">
      {kind === 'book' ? (
        <div className={styles.wordCards}>
          <span>go</span>
        </div>
      ) : (
        <Icon name={kind} />
      )}
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
  return (
    <Shell title="Привет! 👋">
      <p className={styles.subtitle}>Ты делаешь успехи!</p>
      <h2 className={styles.srOnly}>Мои наборы</h2>
      {query.isPending && <Notice>Загружаем ваши наборы…</Notice>}
      {query.isError && <Failure error={query.error} retry={() => void query.refetch()} />}
      {query.data?.length === 0 && (
        <div className={styles.empty}>
          <Sprout kind="book" />
          <h2>Первый набор — начало!</h2>
          <p>Добавьте карточки и попробуйте тренировку.</p>
          <Link className={styles.primary} to="/new">
            Создать набор
          </Link>
        </div>
      )}
      <div className={styles.deckList}>
        {query.data?.map((deck, index) => (
          <Link key={deck.id} className={styles.deckItem} to={`/decks/${deck.id}`}>
            <Sprout kind={index % 3 === 1 ? 'book' : index % 3 === 2 ? 'sun' : 'leaf'} />
            <div>
              <div className={styles.deckTitle}>
                <h2>{deck.title}</h2>
                <span className={styles.chevron}>
                  <Icon name="chevron" />
                </span>
              </div>
              <small>{cardCountLabel(deck.cards.length)}</small>
              <Progress value={deck.knowledgePercent} compact />
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
        <Icon name="plus" /> Создать новый набор
      </Link>
    </Shell>
  );
}

const sourceKey = 'uchi-cards-source-v1';
function readSource(): { sourceType: Deck['sourceType']; text: string; filename: string } {
  try {
    return JSON.parse(sessionStorage.getItem(sourceKey) || 'null') || { sourceType: 'manual', text: '', filename: '' };
  } catch {
    return { sourceType: 'manual', text: '', filename: '' };
  }
}
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
      if (request === recognitionRequest.current) setText(result.text);
    } catch (err) {
      if (request === recognitionRequest.current) setError(message(err));
    } finally {
      if (request === recognitionRequest.current) setRecognizing(false);
    }
  }
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
              setMode(value);
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
            {!preview && <Sprout kind="photo" />}
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
            setMode('manual');
            setError('');
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
          <Sprout kind="book" />
          <h2>Ваши вопросы и ответы</h2>
          <p>Создайте набор самостоятельно. Можно начать с одной карточки.</p>
        </section>
      )}
      {mode !== 'manual' && (
        <p className={styles.sourceHint}>
          <Icon name="hint" />{' '}
          <span>
            {mode === 'text'
              ? 'Создадим вопросы и ответы по вашему тексту. Перед сохранением их можно проверить и изменить.'
              : 'Чёткое фото — точные карточки. Убедись, что текст хорошо виден.'}
          </span>
        </p>
      )}
      {error && <Notice error>{error}</Notice>}
      <button
        className={styles.primary}
        disabled={mode !== 'manual' && (recognizing || !text.trim())}
        onClick={() => {
          sessionStorage.setItem(
            sourceKey,
            JSON.stringify({ sourceType: mode, text: mode !== 'manual' ? text : '', filename: photo?.name || '' })
          );
          nav('/new/settings');
        }}
      >
        Продолжить <span>→</span>
      </button>
    </Shell>
  );
}
export function SettingsPage() {
  const source = readSource();
  const [title, setTitle] = useState('');
  const [count, setCount] = useState(20);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const nav = useNavigate();
  const client = useQueryClient();
  async function create() {
    setBusy(true);
    setError('');
    try {
      const generated = source.sourceType !== 'manual' ? await flashcardsApi.generate(source.text, count) : null;
      const cards = generated ? generated.cards : [emptyCard()];
      const deck = await flashcardsApi.save({
        title: title.trim(),
        sourceType: source.sourceType,
        revision: 0,
        isDraft: true,
        cards
      });
      await client.invalidateQueries({ queryKey: deckKeys.all });
      sessionStorage.removeItem(sourceKey);
      nav(`/decks/${deck.id}/edit`, { replace: true });
    } catch (err) {
      setError(message(err));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Shell title="Настроим набор" navigationTitle="Новый набор" back="/new">
      <p className={styles.subtitle}>И мы создадим для тебя карточки.</p>
      <section className={styles.sourceSummary}>
        <span className={styles.sourceIcon}>
          <Icon name={source.sourceType === 'manual' ? 'pencil' : 'file'} />
        </span>
        <div>
          <strong>
            {source.sourceType === 'photo'
              ? 'Фото загружено'
              : source.sourceType === 'text'
              ? 'Текст добавлен'
              : 'Ручное создание'}
          </strong>
          <small>
            {source.filename || (source.sourceType === 'manual' ? 'Твои вопросы и ответы' : 'Материал для карточек')}
          </small>
        </div>
        <Icon name="sourceCheck" />
      </section>
      <label className={styles.panel}>
        Название
        <input
          value={title}
          maxLength={120}
          placeholder="Например, Фотосинтез"
          onChange={(event) => setTitle(event.target.value)}
          autoFocus
        />
      </label>
      {source.sourceType !== 'manual' && (
        <>
          <section className={styles.panel}>
            <p>Количество карточек</p>
            <div className={styles.segment}>
              {[10, 20, 30].map((value) => (
                <button
                  key={value}
                  aria-pressed={count === value}
                  className={count === value ? styles.selected : ''}
                  onClick={() => setCount(value)}
                >
                  {value}
                </button>
              ))}
            </div>
          </section>
          <section className={styles.aiSummary}>
            <span className={styles.aiIcon}>
              <Icon name="ai" />
            </span>
            <div>
              <strong>ИИ создаст черновик</strong>
              <small>Ты сможешь проверить и изменить карточки. Если фактов мало, карточек будет меньше.</small>
            </div>
          </section>
        </>
      )}
      {error && <Notice error>{error}</Notice>}
      <button className={styles.primary} disabled={!title.trim() || busy} onClick={() => void create()}>
        <Icon name="generate" />
        {busy ? 'Создаём черновик…' : source.sourceType === 'manual' ? 'Добавить карточки' : 'Создать карточки'}
      </button>
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
function Editor({ initial }: { initial: Deck }) {
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
  const dirty = JSON.stringify(draft) !== baseline.current;
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
      cards: prev.cards.map((card, i) => (i === index ? { ...card, [key]: value } : card))
    }));
  }
  async function save(isDraft: boolean) {
    setBusy(true);
    setError('');
    try {
      const result = await flashcardsApi.save({ ...draft, isDraft }, initial.id);
      const next = { ...result, cards: result.cards.map((card) => ({ ...card })) };
      baseline.current = JSON.stringify(next);
      sessionStorage.removeItem(draftKey);
      setDraft(next);
      client.setQueryData(deckKeys.deck(initial.id), result);
      await client.invalidateQueries({ queryKey: deckKeys.all });
      setSaved('Черновик сохранён');
      if (!isDraft) nav(`/decks/${result.id}`);
    } catch (err) {
      setError(message(err));
    } finally {
      setBusy(false);
    }
  }
  const duplicates = draft.cards.map((card) => card.question.trim().toLocaleLowerCase());
  return (
    <Shell
      title="Проверь карточки"
      navigationTitle="Проверка карточек"
      onBack={() => {
        if (busy) return;
        if (!dirty || window.confirm('Есть несохранённые правки. Выйти без сохранения?'))
          nav(initial.isDraft ? '/' : `/decks/${initial.id}`);
      }}
    >
      <p className={styles.subtitle}>Всё верно? Можно поправить текст.</p>
      <label className={styles.editorName}>
        <span>Название набора · {cardCountLabel(draft.cards.length)}</span>
        <input
          value={draft.title}
          maxLength={120}
          disabled={busy}
          onChange={(event) => setDraft({ ...draft, title: event.target.value })}
        />
      </label>
      {draft.sourceType !== 'manual' && (
        <Notice>Карточки созданы по тексту. Проверьте вопросы и ответы перед сохранением.</Notice>
      )}
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
            <label>
              Вопрос
              <textarea
                rows={2}
                aria-label="Вопрос"
                value={card.question}
                maxLength={500}
                disabled={busy}
                onChange={(event) => update(index, 'question', event.target.value)}
              />
              <small className={styles.charCount}>{card.question.length}/500</small>
            </label>
            <label>
              Ответ
              <textarea
                rows={3}
                aria-label="Ответ"
                value={card.answer}
                maxLength={2000}
                disabled={busy}
                onChange={(event) => update(index, 'answer', event.target.value)}
              />
              <small className={styles.charCount}>{card.answer.length}/2000</small>
            </label>
            {card.question.trim() && duplicates.indexOf(duplicates[index]) !== index && (
              <Notice error>Такой вопрос уже есть.</Notice>
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
  const [showAll, setShowAll] = useState(false);
  async function start() {
    if (!query.data) return;
    if (query.data.activeSessionId) {
      nav(`/sessions/${query.data.activeSessionId}`);
      return;
    }
    setBusy(true);
    try {
      const session = await flashcardsApi.start(query.data.id);
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
    <Shell back="/" navigationTitle="Мой набор">
      <div className={styles.deckHeading}>
        <Sprout kind="deckLeaf" />
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
        disabled={busy || deck.isDraft || !deck.cards.length}
        onClick={() => void start()}
      >
        <Icon name="play" /> {deck.activeSessionId ? 'Продолжить тренировку' : 'Начать тренировку'}
      </button>
      <div className={styles.row}>
        <Link className={styles.textButton} to={`/decks/${deck.id}/edit`}>
          Редактировать
        </Link>
        <button className={styles.textButton} disabled={busy} onClick={() => void remove()}>
          Удалить набор
        </button>
      </div>
      {error && <Notice error>{error}</Notice>}
      <h2 className={styles.examplesTitle}>Примеры карточек</h2>
      <div className={styles.deckList}>
        {deck.cards.slice(0, showAll ? 100 : 4).map((card, index) => (
          <details key={card.id} className={`${styles.panel} ${styles.previewCard}`}>
            <summary>
              <Sprout kind={index % 2 ? 'previewLeaf' : 'previewSun'} />
              <span>
                {card.question}
                <small>Нажми, чтобы увидеть ответ</small>
              </span>
              <span className={styles.chevron}>
                <Icon name="chevron" />
              </span>
            </summary>
            <p>{card.answer}</p>
            <small>
              {card.knowledgeStatus === 'known'
                ? 'Знаю'
                : card.knowledgeStatus === 'unknown'
                ? 'Пока не знаю'
                : 'Ещё не изучали'}
            </small>
          </details>
        ))}
      </div>
      {deck.cards.length > 4 && (
        <button className={styles.secondary} onClick={() => setShowAll(!showAll)}>
          {showAll ? 'Свернуть' : 'Смотреть все'}
        </button>
      )}
    </Shell>
  );
}
export function StudyPage() {
  const id = Number(useParams().id);
  const query = useQuery({ queryKey: deckKeys.session(id), queryFn: () => flashcardsApi.session(id) });
  const client = useQueryClient();
  const nav = useNavigate();
  const [flipped, setFlipped] = useState(false);
  const [dx, setDx] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [exit, setExit] = useState(false);
  const lock = useRef(false);
  const pointer = useRef<{ id: number; x: number; y: number; width: number } | null>(null);
  const pending = useRef<Grade | null>(null);
  const session = query.data;
  const card = session?.cards.find((value) => value.id === session.nextCardId);
  const cardNumber = session && card ? session.cards.findIndex((value) => value.id === card.id) + 1 : 0;
  const mastered = session?.knownCount || 0;
  async function grade(status: 'known' | 'unknown') {
    if (!session || !card || lock.current) return;
    lock.current = true;
    setBusy(true);
    setError('');
    pending.current ||= {
      cardId: card.id,
      status,
      eventId: crypto.randomUUID(),
      presentationIndex: session.presentationIndex
    };
    try {
      const result = await flashcardsApi.grade(id, pending.current);
      client.setQueryData(deckKeys.session(id), result);
      pending.current = null;
      setFlipped(false);
      if (result.finishedAt) {
        await client.invalidateQueries({ queryKey: deckKeys.all });
        nav(`/sessions/${id}/results`, { replace: true });
      }
    } catch (err) {
      setError(message(err));
      if (err instanceof ApiError && err.status >= 400 && err.status < 500) {
        pending.current = null;
        setFlipped(false);
        await query.refetch();
      }
    } finally {
      setDx(0);
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
  function release(event: ReactPointerEvent<HTMLDivElement>) {
    const start = pointer.current;
    pointer.current = null;
    setDx(0);
    if (!start || start.id !== event.pointerId || busy || pending.current) return;
    const action = gesture(event.clientX - start.x, event.clientY - start.y, start.width);
    if (action === 'flip') setFlipped((prev) => !prev);
    else if (action) void grade(action);
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
      {card && (
        <>
          <div className={styles.cardStack}>
            <div
              role="button"
              tabIndex={0}
              aria-label={`Карточка ${cardNumber}. ${flipped ? 'Ответ' : 'Вопрос'}: ${
                flipped ? card.answer : card.question
              }`}
              aria-disabled={busy || !!pending.current}
              className={`${styles.studyCard} ${dx > 0 ? styles.known : dx < 0 ? styles.unknown : ''}`}
              style={{
                transform: `translateX(${dx}px) rotate(${dx / 30}deg)`,
                transition: dx === 0 ? 'transform 180ms ease-out' : 'none'
              }}
              onPointerDown={(event) => {
                if (busy || pending.current || pointer.current || event.button !== 0) return;
                pointer.current = {
                  id: event.pointerId,
                  x: event.clientX,
                  y: event.clientY,
                  width: event.currentTarget.clientWidth
                };
                event.currentTarget.setPointerCapture(event.pointerId);
              }}
              onPointerMove={(event) => {
                const start = pointer.current;
                if (!start || start.id !== event.pointerId) return;
                const x = event.clientX - start.x,
                  y = event.clientY - start.y;
                if (Math.abs(y) > Math.abs(x) && Math.abs(y) > 8) {
                  pointer.current = null;
                  setDx(0);
                  return;
                }
                setDx(x);
              }}
              onPointerUp={release}
              onPointerCancel={() => {
                pointer.current = null;
                setDx(0);
              }}
              onLostPointerCapture={() => {
                pointer.current = null;
                setDx(0);
              }}
              onKeyDown={(event) => {
                if (busy || pending.current) return;
                if (['Enter', ' '].includes(event.key)) {
                  event.preventDefault();
                  setFlipped((prev) => !prev);
                } else if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
                  event.preventDefault();
                  void grade(event.key === 'ArrowRight' ? 'known' : 'unknown');
                }
              }}
            >
              <span className={styles.srOnly}>{flipped ? 'ОТВЕТ' : 'ВОПРОС'}</span>
              <img className={styles.arcTop} src={artwork.arcTop} alt="" aria-hidden="true" />
              <img className={styles.arcBottom} src={artwork.arcBottom} alt="" aria-hidden="true" />
              <Sprout kind="studyLeaf" />
              <h2>{flipped ? card.answer : card.question}</h2>
              <small>Нажми, чтобы перевернуть</small>
              <Icon name="flip" />
            </div>
          </div>
          <div className={styles.studyHint}>
            <strong>{flipped ? 'Проверь себя' : 'Вспомни ответ'}</strong>
            <p>
              {flipped ? 'Смахни влево, если не знаешь, вправо — если знаешь' : 'Переверни карточку и проверь себя'}
            </p>
          </div>
          <div className={styles.gradeActions}>
            <button aria-label="Не знаю" disabled={busy || !!pending.current} onClick={() => void grade('unknown')}>
              <span aria-hidden="true">‹</span> Не знаю
            </button>
            <button aria-label="Знаю" disabled={busy || !!pending.current} onClick={() => void grade('known')}>
              Знаю <span aria-hidden="true">›</span>
            </button>
          </div>
        </>
      )}
      {busy && <Notice>Сохраняем ответ…</Notice>}
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
      const session = await flashcardsApi.start(query.data.deckId);
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
        <Sprout kind="cup" />
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
