import { CONSTANTS_TYPE } from '../constants';

export interface UpdateWinners {
  type: typeof CONSTANTS_TYPE.UPDATE_WINNERS;
  data: [
    {
      name: string;
      wins: number;
    },
  ];
  id: number;
}
