import { CONSTANTS_TYPE } from '../types/constants';
import { RequestReg } from '../types/websocket-types';
import { BasePacket } from '../types/websocket-types/base-packet.type';

import { WebSocketStateClient } from '../types/websocket-state-client.type';
import { DataRequest } from '../types/websocket-types/data-request.type';
import { CreateResponseHandlers } from './create-response-handlers';
import { ResponseValidPlayer } from '../types/websocket-types/response-valid-player';

export class CreateDataHandlers {
  public clientState: WebSocketStateClient;
  protected responseHandlers: CreateResponseHandlers;

  constructor(wsClient: WebSocketStateClient) {
    this.clientState = wsClient;
    this.responseHandlers = new CreateResponseHandlers(wsClient);
  }
  public webSocketDataHandler = (requestWebSocketData: BasePacket): string => {
    const webSocketData: DataRequest =
      typeof requestWebSocketData.data === 'string' ? JSON.parse(requestWebSocketData.data) : requestWebSocketData.data;

    switch (requestWebSocketData.type) {
      case CONSTANTS_TYPE.REG: {
        return this.responseHandlers.registrationPlayerHandler(this.isValidData<RequestReg['data']>(webSocketData));
      }

      default: {
        break;
      }
    }
    return 'create';
  };

  protected isValidData = <T extends DataRequest>(webSocketData: DataRequest): T | ResponseValidPlayer => {
    const data = webSocketData;
    if (
      data &&
      typeof data === 'object' &&
      'name' in data &&
      typeof data.name === 'string' &&
      data.name.length >= 5 &&
      'password' in data &&
      typeof data.password === 'string' &&
      data.password.length >= 5
    ) {
      return webSocketData as T;
    }

    return { error: true, errorText: 'Invalid data' };
  };
}
