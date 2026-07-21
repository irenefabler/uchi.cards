import type { createCharacterStore } from 'src/entities/example-character';

export type Props = {
  store: ReturnType<typeof createCharacterStore>;
};
