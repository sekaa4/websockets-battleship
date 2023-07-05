import { CONSTANTS_TYPE } from '../constants';

export interface UpdateWinners {
  type: typeof CONSTANTS_TYPE.RANDOM_ATTACK;
  data: {
    gameID: number;
    indexPlayer: number;
  };
  id: number;
}
