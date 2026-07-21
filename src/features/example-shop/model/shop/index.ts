import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

export interface ShopState {
  open: boolean;
}

export interface ShopActions {
  toggle: () => void;
}

export type ShopStore = ShopState & ShopActions;

export const createShopStore = () =>
  create<ShopStore>()(
    subscribeWithSelector((set) => ({
      open: false,
      toggle: () => set((state) => ({ open: !state.open }))
    }))
  );
