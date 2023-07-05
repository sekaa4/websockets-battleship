import { CONSTANTS_TYPE } from '../constants';
import { Ship } from './ship.type';

export interface UpdateWinners {
  type: typeof CONSTANTS_TYPE.ADD_SHIPS;
  data: {
    gameId: number;
    ships: Ship[];
    indexPlayer: number;
  };
  id: number;
}
