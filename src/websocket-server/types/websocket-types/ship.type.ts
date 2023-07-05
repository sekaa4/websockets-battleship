import { CONSTANTS_SHIP_TYPE } from '../constants';

export interface Ship {
  position: {
    x: number;
    y: number;
  };
  direction: boolean;
  length: number;
  type: typeof CONSTANTS_SHIP_TYPE;
}
