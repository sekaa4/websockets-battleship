import WebSocket from 'ws';
import { CellState } from './cell-state.type';
import { Ship } from './websocket-types/ship.type';

export interface WebSocketStateClient extends WebSocket {
  playerInfo: {
    name: string;
    // password: string;
    index: string;
    roomId: string;
    idGame: string;
    ships: Ship[];
    startPosition: string;
    fieldShips: (number | CellState)[][];
    isSingleGame: boolean;
    botInfo: BotInfo;
  };
}

export interface BotInfo {
  name: string;
  index: string;
  idGame: string;
}
