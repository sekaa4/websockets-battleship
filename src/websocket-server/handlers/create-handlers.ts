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
  }

  private message = (webSocketData: RawData): void => {
    const data = JSON.parse(webSocketData.toString());

    const isValidData = this.validWebSocketData(data);

    if (isValidData) {
      const webSocketDataResponse = this.dataHandlers.webSocketDataHandler(data);

      if (webSocketDataResponse) {
        this.wsClient.send(webSocketDataResponse);
      }
    }
  };

  private disconnect = (): void => {
    console.log('WebSocket client disconnect');

    if (Object.hasOwn(this.wsClient, 'playerInfo')) {
      const { index, roomId, idGame } = (this.wsClient as WebSocketStateClient).playerInfo;
      const webSocketDataResponse = this.dataHandlers.disconnectHandler(index, roomId, idGame);

      if (webSocketDataResponse) {
        this.wsClient.send(webSocketDataResponse);
      }
    }
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
