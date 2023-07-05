import { CONSTANTS_TYPE } from '../constants';

export interface UpdateWinners {
  type: typeof CONSTANTS_TYPE.ADD_PLAYER_TO_ROOM;
  data: {
    indexRoom: number;
  };
  id: number;
}
