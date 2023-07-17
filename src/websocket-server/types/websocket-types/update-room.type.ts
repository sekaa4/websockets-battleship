import { CONSTANTS_TYPE } from '../constants';

export interface UpdateWinners {
  type: typeof CONSTANTS_TYPE.UPDATE_ROOM;
  data: [
    {
      roomId: number;
      roomUsers: [
        {
          name: string;
          index: number;
        },
      ];
    },
  ];
  id: number;
}
