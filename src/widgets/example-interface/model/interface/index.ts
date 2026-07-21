import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

export interface InterfaceButton {
  id: string;
  label: string;
}

export interface InterfaceState {
  buttons: InterfaceButton[];
}

export interface InterfaceActions {
  addButton: (label: string) => void;
  removeButton: (id: string) => void;
}

export type InterfaceStore = InterfaceState & InterfaceActions;

export const createInterfaceStore = () =>
  create<InterfaceStore>()(
    subscribeWithSelector((set) => ({
      buttons: [],
      addButton: (label) =>
        set((state) => ({
          buttons: [...state.buttons, { id: crypto.randomUUID(), label }]
        })),
      removeButton: (id) =>
        set((state) => ({
          buttons: state.buttons.filter((button) => button.id !== id)
        }))
    }))
  );
