import { Character } from 'src/entities/example-character';
import { Props } from './types';

export const Player = ({ store }: Props) => <Character store={store} />;
