import { useState } from 'react';
import { Link } from 'react-router';
import { useUserQuery } from 'src/shared/api';
import { Interface } from 'src/widgets/example-interface';
import { createBattlePageStore } from '../../model/battle-page';
import { Enemy } from '../enemy';
import { Player } from '../player';

export const BattlePage = () => {
  const { data: user } = useUserQuery();
  const [store] = useState(() => createBattlePageStore());

  const playerStore = store((state) => state.player);
  const enemyStore = store((state) => state.enemy);
  const interfaceStore = store((state) => state.interface);

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="text-xl">Battle Page 🏹 🪃 — {user?.name}</div>
      <Link className="text-blue-500 underline" to={{ pathname: '/' }}>
        Home page
      </Link>
      <Interface store={interfaceStore} />
      <Player store={playerStore} />
      <Enemy store={enemyStore} />
    </div>
  );
};
