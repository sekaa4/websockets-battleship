import { RawData, WebSocketServer } from 'ws';
import { CONSTANTS_DATA_FIELDS } from '../types/constants';
import { WebSocketStateClient } from '../types/websocket-state-client.type';
import { CreateDataHandlers } from './create-data-handlers';

export class CreateHandlers {
  public wsClient: WebSocketStateClient;
  public wsServer: WebSocketServer;
  private dataHandlers: CreateDataHandlers;

  constructor(wsServer: WebSocketServer) {
    this.wsServer = wsServer;
  }

  public clientConnection(wsClient: WebSocketStateClient): void {
    this.wsClient = wsClient;
    this.dataHandlers = new CreateDataHandlers(wsClient, this.wsServer);
    wsClient.on('error', console.error);

    wsClient.on('message', this.message);
    wsClient.on('close', this.disconnect);

    wsClient.send('WebSocketServer ready to connect');
  }

  private message = (webSocketData: RawData): void => {
    const data = JSON.parse(webSocketData.toString());

    const isValidData = this.validWebSocketData(data);

    if (isValidData) {
      const webSocketDataResponse = this.dataHandlers.webSocketDataHandler(data);

      // console.log('first', this.wsClient);

      if (webSocketDataResponse) {
        this.wsClient.send(webSocketDataResponse);
      }
    }
  };

  private disconnect = (): void => {
    console.log('WebSocket client disconnect');
  };

  private validWebSocketData = (wsClientData: unknown): boolean => {
    const templateDataFields = Object.values(CONSTANTS_DATA_FIELDS);
    if (wsClientData && typeof wsClientData === 'object') {
      const keys = Object.keys(wsClientData);
      if (templateDataFields.length === keys.length) {
        return templateDataFields.every((templateDataField) => templateDataField in wsClientData);
      }

      return false;
    }
    return false;
  };
}
