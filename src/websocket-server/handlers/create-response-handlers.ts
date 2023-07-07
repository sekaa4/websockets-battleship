import { randomUUID } from 'node:crypto';
import { CONSTANTS_TYPE } from '../types/constants';
import { WebSocketStateClient } from '../types/websocket-state-client.type';
import { RequestReg } from '../types/websocket-types';
import { ResponseValidPlayer } from '../types/websocket-types/response-valid-player';

export class CreateResponseHandlers {
  public clientState: WebSocketStateClient;
  constructor(wsClient: WebSocketStateClient) {
    this.clientState = wsClient;
  }
  public registrationPlayerHandler = (webSocketData: RequestReg['data'] | ResponseValidPlayer): string => {
    if ('error' in webSocketData) {
      const dataObjectPlayerResponse = {
        type: CONSTANTS_TYPE.REG,
        data: JSON.stringify({
          name: '',
          index: '',
          error: true,
          errorText: webSocketData.errorText,
        }),
      };
      return JSON.stringify(dataObjectPlayerResponse);
    }

    const { name, password } = webSocketData;

    const newUser = {
      name: name,
      password: password,
      index: randomUUID(),
    };

    const dataObjectPlayerResponse = {
      type: CONSTANTS_TYPE.REG,
      data: JSON.stringify({
        name: name,
        index: newUser.index,
        error: false,
        errorText: '',
      }),
    };

    this.clientState.playerInfo = newUser;

    return JSON.stringify(dataObjectPlayerResponse);
  };
}
