import { Position } from './position.type';

export interface AttackAround {
  currentPlayer: string;
  killedPositions: Position[];
  aroundPositions: Position[];
}
