import { CONSTANTS_TYPE } from '../constants';
import { Ship } from './ship.type';

export interface UpdateWinners {
  type: typeof CONSTANTS_TYPE.START_GAME;
  data: {
    ships: Ship[];
    currentPlayerIndex: number;
  };
  id: number;
}
