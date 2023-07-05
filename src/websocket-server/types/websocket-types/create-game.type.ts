import { CONSTANTS_TYPE } from '../constants';

export interface UpdateWinners {
  type: typeof CONSTANTS_TYPE.CREATE_GAME;
  data: {
    idGame: number;
    idPlayer: number;
  };
  id: number;
}
