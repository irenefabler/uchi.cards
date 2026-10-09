import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import { dragPose, MOTION, swipeVerdict } from '../model/motion';
import type { MotionPhase } from '../model/motion';
import arcTop from './assets/6-6351-img.svg';
import arcBottom from './assets/6-6351-img1.svg';
import artwork from './assets/6-6351-img2.svg';
import flipIcon from './assets/6-6351-imgRotate3D.svg';
import styles from './flashcards.module.css';

type Props = {
  cardId: number;
  token: string;
  number: number;
  question: string;
  answer: string;
  disabled: boolean;
  onGrade: (status: 'known' | 'unknown', actionId: string) => Promise<boolean>;
};
type Drag = {
  id: number;
  x: number;
  y: number;
  lastX: number;
  lastTime: number;
  velocity: number;
  dx: number;
  width: number;
  horizontal: boolean;
  token: string;
};

export function GestureCard({ cardId, token, number, question, answer, disabled, onGrade }: Props) {
  const shell = useRef<HTMLDivElement>(null);
  const lift = useRef<HTMLDivElement>(null);
  const rotor = useRef<HTMLDivElement>(null);
  const positive = useRef<HTMLSpanElement>(null);
  const negative = useRef<HTMLSpanElement>(null);
  const pointer = useRef<Drag | null>(null);
  const frame = useRef<number | null>(null);
  const animations = useRef(new Set<Animation>());
  const alive = useRef(true);
  const phaseRef = useRef<MotionPhase>('idle');
  const lastToken = useRef(token);
  const shouldFocus = useRef(false);
  const [phase, setPhase] = useState<MotionPhase>('idle');
  const [flipped, setFlipped] = useState(false);
  const reduced = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  const blocked = disabled || (phase !== 'idle' && phase !== 'dragging');
  function change(next: MotionPhase) {
    phaseRef.current = next;
    if (alive.current) setPhase(next);
  }
  function paint(dx: number) {
    if (shell.current) shell.current.style.transform = dragPose(dx);
    const opacity = Math.min(Math.abs(dx) / MOTION.stampDistance, 1);
    if (positive.current) positive.current.style.opacity = `${dx > 0 ? opacity : 0}`;
    if (negative.current) negative.current.style.opacity = `${dx < 0 ? opacity : 0}`;
  }
  function stopFrame() {
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    frame.current = null;
  }
  async function animate(element: HTMLElement | null, frames: Keyframe[], duration: number, easing: string) {
    if (!element?.animate || !alive.current) return;
    const animation = element.animate(frames, { duration, easing });
    animations.current.add(animation);
    try {
      await animation.finished;
    } catch {
      /* Cancellation on unmount does not submit an answer. */
    } finally {
      animations.current.delete(animation);
      animation.cancel();
    }
  }
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      pointer.current = null;
      stopFrame();
      animations.current.forEach((animation) => animation.cancel());
      animations.current.clear();
    };
  }, []);
  useLayoutEffect(() => {
    if (lastToken.current === token) return;
    lastToken.current = token;
    pointer.current = null;
    stopFrame();
    setFlipped(false);
    paint(0);
    if (shell.current) shell.current.style.opacity = '1';
    change('entering');
    const motion = reduced()
      ? animate(shell.current, [{ opacity: 0 }, { opacity: 1 }], MOTION.reduced, 'ease-out')
      : animate(
          shell.current,
          [
            { transform: 'translateY(19px) scale(.94)', opacity: 0 },
            { transform: dragPose(0), opacity: 1 }
          ],
          MOTION.enter,
          MOTION.enterEase
        );
    void motion.then(() => {
      if (!alive.current || lastToken.current !== token) return;
      change('idle');
      if (shouldFocus.current) shell.current?.focus({ preventScroll: true });
      shouldFocus.current = false;
    });
    // Queue-token changes own the entry timeline; callback/state changes must not restart it.
  }, [token]);
  async function flip() {
    if (disabled || phaseRef.current !== 'idle') return;
    change('flipping');
    const next = !flipped;
    setFlipped(next);
    if (reduced()) await animate(lift.current, [{ opacity: 0.65 }, { opacity: 1 }], MOTION.reduced, 'ease-out');
    else
      await Promise.all([
        animate(
          lift.current,
          [
            { transform: 'translateY(0) scale(1)', offset: 0 },
            { transform: 'translateY(-15px) scale(1.045)', offset: 0.35 },
            { transform: 'translateY(-10px) scale(1.025)', offset: 0.75 },
            { transform: 'translateY(0) scale(1)', offset: 1 }
          ],
          MOTION.flip,
          MOTION.flipEase
        ),
        animate(
          rotor.current,
          [{ transform: `rotateY(${flipped ? 180 : 0}deg)` }, { transform: `rotateY(${next ? 180 : 0}deg)` }],
          MOTION.flip,
          MOTION.flipEase
        )
      ]);
    if (alive.current && lastToken.current === token) change('idle');
  }
  async function snap() {
    stopFrame();
    const from = shell.current?.style.transform || dragPose(0);
    paint(0);
    change('snapping');
    if (!reduced())
      await animate(shell.current, [{ transform: from }, { transform: dragPose(0) }], MOTION.snap, MOTION.snapEase);
    if (alive.current && lastToken.current === token) change('idle');
  }
  async function commit(status: 'known' | 'unknown') {
    if (disabled || !['idle', 'dragging'].includes(phaseRef.current)) return;
    pointer.current = null;
    stopFrame();
    shouldFocus.current =
      !!shell.current &&
      (document.activeElement === shell.current || document.activeElement?.closest('[data-grade-actions]') !== null);
    const actionId = crypto.randomUUID();
    const from = shell.current?.style.transform || dragPose(0);
    change('exiting');
    if (reduced()) {
      if (shell.current) shell.current.style.opacity = '0';
      await animate(shell.current, [{ opacity: 1 }, { opacity: 0 }], MOTION.reduced, 'ease-out');
    } else {
      const direction = status === 'known' ? 1 : -1;
      const destination = `translateX(${direction * (window.innerWidth + 500)}px) rotate(${direction * 24}deg)`;
      if (shell.current) shell.current.style.transform = destination;
      await animate(
        shell.current,
        [
          { transform: from, opacity: 1 },
          { transform: destination, opacity: 0 }
        ],
        MOTION.exit,
        MOTION.exitEase
      );
      if (shell.current) shell.current.style.opacity = '0';
    }
    if (!alive.current) return;
    change('waiting-next');
    const accepted = await onGrade(status, actionId);
    if (!alive.current || accepted || lastToken.current !== token) return;
    if (shell.current) shell.current.style.opacity = '1';
    await snap();
  }
  function cancel(event: ReactPointerEvent<HTMLDivElement>) {
    if (pointer.current?.id !== event.pointerId) return;
    pointer.current = null;
    void snap();
  }
  function down(event: ReactPointerEvent<HTMLDivElement>) {
    if (disabled || phaseRef.current !== 'idle' || pointer.current || event.button !== 0) return;
    if (event.pointerType === 'mouse') event.preventDefault();
    shell.current?.focus({ preventScroll: true });
    pointer.current = {
      id: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      lastX: event.clientX,
      lastTime: event.timeStamp,
      velocity: 0,
      dx: 0,
      width: event.currentTarget.clientWidth,
      horizontal: false,
      token
    };
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      /* Detached targets and test DOM may not support capture. */
    }
  }
  function move(event: ReactPointerEvent<HTMLDivElement>) {
    const drag = pointer.current;
    if (!drag || drag.id !== event.pointerId || drag.token !== token) return;
    const dx = event.clientX - drag.x,
      dy = event.clientY - drag.y;
    const elapsed = event.timeStamp - drag.lastTime;
    if (elapsed > 0) drag.velocity = (event.clientX - drag.lastX) / elapsed;
    drag.lastX = event.clientX;
    drag.lastTime = event.timeStamp;
    drag.dx = dx;
    if (!drag.horizontal) {
      if (Math.max(Math.abs(dx), Math.abs(dy)) <= MOTION.deadZone) return;
      if (Math.abs(dx) > Math.abs(dy) * MOTION.axisRatio) {
        drag.horizontal = true;
        change('dragging');
      } else {
        pointer.current = null;
        void snap();
        return;
      }
    }
    if (frame.current === null)
      frame.current = requestAnimationFrame(() => {
        frame.current = null;
        if (pointer.current === drag) paint(drag.dx);
      });
  }
  function up(event: ReactPointerEvent<HTMLDivElement>) {
    const drag = pointer.current;
    if (!drag || drag.id !== event.pointerId || drag.token !== token) return;
    pointer.current = null;
    stopFrame();
    const dx = event.clientX - drag.x,
      dy = event.clientY - drag.y;
    const horizontal = drag.horizontal || Math.abs(dx) > Math.abs(dy) * MOTION.axisRatio;
    const freshVelocity = event.timeStamp - drag.lastTime <= 80 ? drag.velocity : 0;
    const verdict = horizontal ? swipeVerdict(dx, drag.width, freshVelocity) : null;
    if (verdict) {
      paint(dx);
      void commit(verdict);
    } else if (Math.abs(dx) < 9 && Math.abs(dy) < 9) void flip();
    else void snap();
  }
  function face(text: string, back: boolean) {
    return (
      <div
        className={`${styles.studyCard} ${styles.cardFace} ${back ? styles.backFace : ''}`}
        aria-hidden={back !== flipped}
      >
        <img className={styles.arcTop} src={arcTop} draggable={false} alt="" />
        <img className={styles.arcBottom} src={arcBottom} draggable={false} alt="" />
        <div className={styles.studyLeaf}>
          <img src={artwork} draggable={false} alt="" />
        </div>
        <h2>{text}</h2>
        <small>Нажми, чтобы перевернуть</small>
        <img src={flipIcon} draggable={false} alt="" />
      </div>
    );
  }
  return (
    <>
      <div className={styles.cardStack}>
        <div
          ref={shell}
          className={styles.gestureShell}
          role="button"
          tabIndex={0}
          data-card-id={cardId}
          data-motion={phase}
          aria-label={`Карточка ${number}. ${flipped ? 'Ответ' : 'Вопрос'}: ${flipped ? answer : question}`}
          aria-disabled={blocked}
          onDragStart={(event) => event.preventDefault()}
          onPointerDown={down}
          onPointerMove={move}
          onPointerUp={up}
          onPointerCancel={cancel}
          onLostPointerCapture={cancel}
          onClick={(event) => {
            event.preventDefault();
            if (event.detail === 0) void flip();
          }}
          onKeyDown={(event) => {
            if (['Enter', ' '].includes(event.key)) {
              event.preventDefault();
              void flip();
            }
            if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
              event.preventDefault();
              void commit(event.key === 'ArrowRight' ? 'known' : 'unknown');
            }
          }}
        >
          <div ref={lift} className={styles.liftShell}>
            <div ref={rotor} className={styles.flipRotor} data-flipped={flipped}>
              {face(question, false)}
              {face(answer, true)}
            </div>
          </div>
          <span ref={positive} className={`${styles.swipeStamp} ${styles.knownStamp}`} aria-hidden="true">
            Знаю
          </span>
          <span ref={negative} className={`${styles.swipeStamp} ${styles.unknownStamp}`} aria-hidden="true">
            Не знаю
          </span>
        </div>
      </div>
      <div className={styles.studyHint}>
        <p>{flipped ? 'Смахни влево, если не знаешь, вправо — если знаешь' : 'Переверни карточку и проверь себя'}</p>
      </div>
      <div className={styles.gradeActions} data-grade-actions>
        <button aria-label="Не знаю" disabled={blocked} onClick={() => void commit('unknown')}>
          <span aria-hidden="true">‹</span> Не знаю
        </button>
        <button aria-label="Знаю" disabled={blocked} onClick={() => void commit('known')}>
          Знаю <span aria-hidden="true">›</span>
        </button>
      </div>
    </>
  );
}
