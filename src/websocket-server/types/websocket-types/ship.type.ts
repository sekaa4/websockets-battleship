import { CONSTANTS_SHIP_TYPE } from '../constants';
import { Position } from '../position.type';
import { ValueOf } from '../utils.type';

export interface Ship {
  position: Position;
  direction: boolean;
  length: number;
  type: ValueOf<typeof CONSTANTS_SHIP_TYPE>;
}
