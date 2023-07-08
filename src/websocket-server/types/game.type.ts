import { User } from './user.type';

export interface Game {
  stage: string;
  idGame: string;
  gameUsers: User[];
}
