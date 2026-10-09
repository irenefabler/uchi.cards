import icon01 from './assets/icons/01-flashcards-leaf.png';
import icon02 from './assets/icons/02-camera-photo.png';
import icon03 from './assets/icons/03-document-aa.png';
import icon04 from './assets/icons/04-pencil.png';
import icon05 from './assets/icons/05-sparkles.png';
import icon06 from './assets/icons/06-folder-cards.png';
import icon07 from './assets/icons/07-brain.png';
import icon08 from './assets/icons/08-trophy.png';
import icon09 from './assets/icons/09-correct-check.png';
import icon10 from './assets/icons/10-incorrect-cross.png';
import icon11 from './assets/icons/11-plant-leaves.png';
import icon12 from './assets/icons/12-globe-pin.png';
import icon13 from './assets/icons/13-english-flashcards.png';
import icon14 from './assets/icons/14-calculator.png';
import icon15 from './assets/icons/15-molecule.png';
import icon16 from './assets/icons/16-classical-column.png';
import icon17 from './assets/icons/17-open-book.png';
import icon18 from './assets/icons/18-award-badge.png';
import icon19 from './assets/icons/19-clock.png';
import icon20 from './assets/icons/20-rocket.png';
import styles from './flashcards.module.css';

// Only this versioned manifest resolves semantic IDs to bundled files.
export const iconManifest = {
  'flashcards-leaf': icon01,
  'camera-photo': icon02,
  'document-aa': icon03,
  'pencil': icon04,
  'sparkles': icon05,
  'folder-cards': icon06,
  'brain': icon07,
  'trophy': icon08,
  'correct-check': icon09,
  'incorrect-cross': icon10,
  'plant-leaves': icon11,
  'globe-pin': icon12,
  'english-flashcards': icon13,
  'calculator': icon14,
  'molecule': icon15,
  'classical-column': icon16,
  'open-book': icon17,
  'award-badge': icon18,
  'clock': icon19,
  'rocket': icon20
} as const;
export const coverOptions = [
  { id: 'flashcards-leaf', label: 'По умолчанию' },
  { id: 'plant-leaves', label: 'Растения' },
  { id: 'globe-pin', label: 'География' },
  { id: 'english-flashcards', label: 'Иностранные слова' },
  { id: 'calculator', label: 'Математика' },
  { id: 'molecule', label: 'Химия' },
  { id: 'classical-column', label: 'История' },
  { id: 'open-book', label: 'Литература' },
  { id: 'clock', label: 'Время' },
  { id: 'rocket', label: 'Космос' }
] as const;
export function CoverIcon({ id, large = false }: { id?: string; large?: boolean }) {
  const safe = coverOptions.find((option) => option.id === id)?.id ?? 'flashcards-leaf';
  return <Illustration id={safe} large={large} />;
}
export function Illustration({ id, large = true }: { id: keyof typeof iconManifest; large?: boolean }) {
  return (
    <img
      className={`${styles.coverIcon} ${large ? styles.largeIllustration : ''}`}
      src={iconManifest[id]}
      alt=""
      aria-hidden="true"
      draggable={false}
      width={512}
      height={512}
    />
  );
}
