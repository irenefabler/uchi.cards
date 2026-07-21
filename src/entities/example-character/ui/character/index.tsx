import { useStore } from 'zustand';
import { Props } from './types';

export const Character = ({ store }: Props) => {
  const hp = useStore(store, (state) => state.hp);
  const maxHp = useStore(store, (state) => state.maxHp);
  const takeDamage = useStore(store, (state) => state.takeDamage);

  return (
    <div className="flex flex-col gap-1">
      <div className="h-2 w-full overflow-hidden rounded bg-zinc-200">
        <div className="h-2 rounded bg-red-500 transition-all" style={{ width: `${(hp / maxHp) * 100}%` }} />
      </div>
      <div className="flex items-center gap-2">
        <span className="text-sm text-zinc-600">
          {hp} / {maxHp} HP
        </span>
        <button
          type="button"
          className="rounded bg-zinc-800 px-2 py-0.5 text-xs text-white"
          onClick={() => takeDamage(10)}
        >
          hit
        </button>
      </div>
    </div>
  );
};
