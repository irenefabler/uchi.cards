import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

export interface ButtonState {
  clickCount: number;
}

export interface ButtonActions {
  handleClick: () => void;
}

export type ButtonStore = ButtonState & ButtonActions;

export const createButtonStore = () =>
  create<ButtonStore>()(
    subscribeWithSelector((set) => ({
      clickCount: 0,
      handleClick: () => set((state) => ({ clickCount: state.clickCount + 1 }))
    }))
  );
