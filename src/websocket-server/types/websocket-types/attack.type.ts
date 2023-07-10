import { CONSTANTS_STATUS, CONSTANTS_TYPE } from '../constants';
import { ValueOf } from '../utils.type';

export interface RequestAttack {
  type: typeof CONSTANTS_TYPE.ATTACK;
  data: {
    gameId: string;
    x: number;
    y: number;
    indexPlayer: string;
  };
  id: number;
}

export interface ResponseReg {
  type: typeof CONSTANTS_TYPE.ATTACK;
  data: {
    position: {
      x: number;
      y: number;
    };
    currentPlayer: number;
    status: ValueOf<typeof CONSTANTS_STATUS>;
  };
  id: number;
}
