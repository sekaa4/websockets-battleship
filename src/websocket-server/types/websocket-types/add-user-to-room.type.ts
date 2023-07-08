import { CONSTANTS_TYPE } from '../constants';

export interface AddUserToRoom {
  type: typeof CONSTANTS_TYPE.ADD_USER_TO_ROOM;
  data: {
    indexRoom: string;
  };
  id: number;
}
