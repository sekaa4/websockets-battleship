import WebSocket from 'ws';

export interface WebSocketStateClient extends WebSocket {
  playerInfo: {
    name: string;
    password: string;
    index: string;
  };
}
