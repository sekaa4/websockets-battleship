import { WebSocketServer } from 'ws';
import { CreateHandlers } from './handlers/create-handlers';

export class CreateWebSocketServer {
  public wss: WebSocketServer;
  protected handlers: CreateHandlers;
  constructor(public port: number) {
    this.port = port;
    this.wss = new WebSocketServer({ port });
    this.handlers = new CreateHandlers(this.wss);
    this.createListener();
  }

  private createListener(): void {
    this.wss.on('connection', this.handlers.clientConnection);
    this.wss.on('close', this.serverClose);
  }

  public serverClose = (): void => {
    console.log('server closed');
  };
}
