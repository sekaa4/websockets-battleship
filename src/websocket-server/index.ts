import { WebSocketServer } from 'ws';
import { CreateHandlers } from './handlers/create-handlers';
import { WebSocketStateClient } from './types/websocket-state-client.type';

export class CreateWebSocketServer {
  public wss: WebSocketServer;
  protected handlers: CreateHandlers;
  constructor(public port: number) {
    this.port = port;
    this.wss = new WebSocketServer({ port });

    this.createListener();
  }

  private createListener(): void {
    this.wss.on('connection', (wsClient: WebSocketStateClient) => {
      new CreateHandlers(this.wss).clientConnection(wsClient);
    });
    this.wss.on('close', this.serverClose);
  }

  public serverClose = (): void => {
    console.log('server closed');
  };
}
