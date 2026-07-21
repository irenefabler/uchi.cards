import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { createCharacterStore } from 'src/entities/example-character';
import { createInterfaceStore } from 'src/widgets/example-interface';

interface BattlePageState {
  player: ReturnType<typeof createCharacterStore>;
  enemy: ReturnType<typeof createCharacterStore>;
  interface: ReturnType<typeof createInterfaceStore>;
}

export type BattlePageStore = BattlePageState;

export const createBattlePageStore = () =>
  create<BattlePageStore>()(
    subscribeWithSelector(() => ({
      player: createCharacterStore(),
      enemy: createCharacterStore(),
      interface: createInterfaceStore()
    }))
  );
