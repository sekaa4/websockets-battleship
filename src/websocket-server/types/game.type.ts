import { User } from './user.type';

export interface Game {
  stage: string;
  idGame: string;
  currentPlayer: string;
  gameUsers: User[];
  gameWinner: string;
}
