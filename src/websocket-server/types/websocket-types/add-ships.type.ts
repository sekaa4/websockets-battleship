import { CONSTANTS_TYPE } from '../constants';
import { Ship } from './ship.type';

export interface AddShips {
  type: typeof CONSTANTS_TYPE.ADD_SHIPS;
  data: {
    gameId: string;
    ships: Ship[];
    indexPlayer: string;
  };
  id: number;
}
