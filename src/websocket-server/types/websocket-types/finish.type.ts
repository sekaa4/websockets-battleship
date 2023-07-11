import { CONSTANTS_TYPE } from '../constants';

export interface UpdateWinners {
  type: typeof CONSTANTS_TYPE.FINISH;
  data: {
    winPlayer: string;
  };
  id: number;
}
