import { CellState } from './cell-state.type';

export interface User {
  name: string;
  index: string;
  fieldShips: (number | CellState)[][];
}
