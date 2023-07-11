import { CONSTANTS_SHIP_TYPE } from './constants';
import { Position } from './position.type';
import { ValueOf } from './utils.type';

export interface CellState {
  type: ValueOf<typeof CONSTANTS_SHIP_TYPE>;
  length: number;
  health: number;
  shots: Position[];
  startPosition: Position;
  missAroundPosition: Position[];
  status: Status;
}
type Status = 'alive' | 'killed';
