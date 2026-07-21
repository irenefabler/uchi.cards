import { useStore } from 'zustand';
import { Props } from './types';

export const Button = ({ store }: Props) => {
  const clickCount = useStore(store, (state) => state.clickCount);
  const handleClick = useStore(store, (state) => state.handleClick);

  return (
    <button type="button" className="rounded bg-zinc-800 px-3 py-1 text-sm text-white" onClick={handleClick}>
      clicked {clickCount}
    </button>
  );
};
