import { useStore } from 'zustand';
import { Button } from '../button';
import { Props } from './types';

export const Interface = ({ store }: Props) => {
  const buttons = useStore(store, (state) => state.buttons);
  const addButton = useStore(store, (state) => state.addButton);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        className="rounded bg-blue-500 px-3 py-1 text-sm text-white"
        onClick={() => addButton('action')}
      >
        + action
      </button>
      {buttons.map((button) => (
        <Button key={button.id} label={button.label} />
      ))}
    </div>
  );
};
