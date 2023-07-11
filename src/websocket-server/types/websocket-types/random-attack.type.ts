import { CONSTANTS_TYPE } from '../constants';

export interface RandomAttack {
  type: typeof CONSTANTS_TYPE.RANDOM_ATTACK;
  data: {
    gameId: string;
    indexPlayer: string;
  };
  id: number;
}
