import { CONSTANTS_TYPE } from '../constants';

export interface CreateNewRoom {
  type: typeof CONSTANTS_TYPE.CREATE_ROOM;
  data: string;
  id: number;
}
