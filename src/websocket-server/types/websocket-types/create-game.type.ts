import { CONSTANTS_TYPE } from '../constants';

export interface CreateGame {
  type: typeof CONSTANTS_TYPE.CREATE_GAME;
  data: {
    idGame: string;
    idPlayer: string;
  };
  id: number;
}
