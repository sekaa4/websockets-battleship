import WebSocket from 'ws';
import { Ship } from './websocket-types/ship.type';

export interface WebSocketStateClient extends WebSocket {
  playerInfo: {
    name: string;
    password: string;
    index: string;
    roomId: string;
    idGame: string;
    ships: Ship[];
    startPosition: string;
    currentPlayer: string;
  };
}
