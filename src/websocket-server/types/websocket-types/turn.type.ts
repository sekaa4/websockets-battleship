import { CONSTANTS_TYPE } from '../constants';

export interface UpdateWinners {
  type: typeof CONSTANTS_TYPE.TURN;
  data: {
    winPlayer: number;
  };
  id: number;
}
