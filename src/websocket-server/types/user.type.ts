import { Ship } from './websocket-types/ship.type';

export interface User {
  name: string;
  index: string;
  ships: Ship[];
}
