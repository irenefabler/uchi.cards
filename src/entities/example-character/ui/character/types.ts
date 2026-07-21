import type { createCharacterStore } from '../../model';

export type Props = {
  store: ReturnType<typeof createCharacterStore>;
};
