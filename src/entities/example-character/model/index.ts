import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

const INITIAL_HP = 100;

export interface CharacterState {
  hp: number;
  maxHp: number;
}

export interface CharacterActions {
  takeDamage: (amount: number) => void;
  heal: (amount: number) => void;
  reset: () => void;
}

export type CharacterStore = CharacterState & CharacterActions;

export const createCharacterStore = () =>
  create<CharacterStore>()(
    subscribeWithSelector((set) => ({
      hp: INITIAL_HP,
      maxHp: INITIAL_HP,
      takeDamage: (amount) => set((state) => ({ hp: Math.max(0, state.hp - amount) })),
      heal: (amount) => set((state) => ({ hp: Math.min(state.maxHp, state.hp + amount) })),
      reset: () => set({ hp: INITIAL_HP })
    }))
  );
