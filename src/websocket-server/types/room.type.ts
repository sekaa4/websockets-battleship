import { User } from './user.type';

export interface Room {
  roomId: string;
  roomUsers: User[];
}
