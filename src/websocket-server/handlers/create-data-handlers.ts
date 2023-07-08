/* eslint-disable max-lines-per-function */
import { CONSTANTS_TYPE } from '../types/constants';
import { RequestReg } from '../types/websocket-types';
import { BasePacket } from '../types/websocket-types/base-packet.type';

import { WebSocketStateClient } from '../types/websocket-state-client.type';
import { DataRequest } from '../types/websocket-types/data-request.type';
import { CreateResponseHandlers } from './create-response-handlers';
import { ResponseValidPlayer } from '../types/websocket-types/response-valid-player';
import { CreateNewRoom } from '../types/websocket-types/create-new-room.type';
import WebSocket, { WebSocketServer } from 'ws';
import { AddUserToRoom } from '../types/websocket-types/add-user-to-room.type';
import { AddShips } from '../types/websocket-types/add-ships.type';

export class CreateDataHandlers {
  public clientState: WebSocketStateClient;
  protected responseHandlers: CreateResponseHandlers;
  protected wsServer: WebSocketServer;

  constructor(wsClient: WebSocketStateClient, wsServer: WebSocketServer) {
    this.clientState = wsClient;
    this.wsServer = wsServer;
    this.responseHandlers = new CreateResponseHandlers(wsClient);
  }
  public webSocketDataHandler = (requestWebSocketData: BasePacket): string | void => {
    // console.log(requestWebSocketData.type);
    switch (requestWebSocketData.type) {
      case CONSTANTS_TYPE.REG: {
        const webSocketData: DataRequest =
          typeof requestWebSocketData.data === 'string'
            ? JSON.parse(requestWebSocketData.data)
            : requestWebSocketData.data;

        return this.responseHandlers.registrationPlayerHandler(this.isValidData<RequestReg['data']>(webSocketData));
      }
      case CONSTANTS_TYPE.CREATE_ROOM: {
        const webSocketData = requestWebSocketData.data;
        const clients = this.wsServer.clients as Set<WebSocketStateClient>;
        const validData = this.isValidData<CreateNewRoom['data']>(webSocketData);

        if (typeof validData !== 'string') {
          return JSON.stringify({ type: CONSTANTS_TYPE.CREATE_ROOM, ...validData });
        }

        const rooms = this.responseHandlers.createRoomHandler(validData);
        for (const client of clients) {
          if (client.readyState === WebSocket.OPEN) {
            client.send(rooms);
          }
        }
        return;
      }

      case CONSTANTS_TYPE.ADD_USER_TO_ROOM: {
        const webSocketData: DataRequest =
          typeof requestWebSocketData.data === 'string'
            ? JSON.parse(requestWebSocketData.data)
            : requestWebSocketData.data;

        const validDataOrError = this.isValidData<AddUserToRoom['data']>(webSocketData);
        if ('error' in validDataOrError) {
          return JSON.stringify({
            ...this.responseHandlers.createErrorObject(validDataOrError),
            type: CONSTANTS_TYPE.ADD_USER_TO_ROOM,
          });
        }

        const game = this.responseHandlers.createGameHandler(validDataOrError);

        if (!game) {
          return JSON.stringify({
            type: CONSTANTS_TYPE.ADD_USER_TO_ROOM,
            error: true,
            errorText: 'Cannot add user to own room, please wait opponent',
          });
        }

        const clients = this.wsServer.clients as Set<WebSocketStateClient>;
        const rooms = this.responseHandlers.updateRoomHandler();

        for (const client of clients) {
          if (client.readyState === WebSocket.OPEN && client.playerInfo.roomId === this.clientState.playerInfo.roomId) {
            client.playerInfo.idGame = this.clientState.playerInfo.idGame;
            client.send(game);
            client.send(rooms);
          } else if (client.readyState === WebSocket.OPEN) {
            client.send(rooms);
          }
        }

        return;
      }
      case CONSTANTS_TYPE.ADD_SHIPS: {
        const webSocketData: DataRequest =
          typeof requestWebSocketData.data === 'string'
            ? JSON.parse(requestWebSocketData.data)
            : requestWebSocketData.data;

        const validDataOrError = this.isValidData<AddShips['data']>(webSocketData);
        if ('error' in validDataOrError) {
          return JSON.stringify({
            ...this.responseHandlers.createErrorObject(validDataOrError),
            type: CONSTANTS_TYPE.ADD_SHIPS,
          });
        }

        const ship = this.responseHandlers.addShipsHandler(validDataOrError);

        if (!ship) {
          return JSON.stringify({
            type: CONSTANTS_TYPE.ADD_SHIPS,
            error: true,
            errorText: 'Invalid data',
          });
        }

        if (ship === 'not ready') {
          return;
        } else if (ship) {
          const clients = this.wsServer.clients as Set<WebSocketStateClient>;

          for (const client of clients) {
            if (
              client.readyState === WebSocket.OPEN &&
              client.playerInfo.idGame === this.clientState.playerInfo.idGame
            ) {
              client.send(client.playerInfo.startPosition);
              const currentPlayer = client.playerInfo.currentPlayer;
              const currentPlayerResponse = this.responseHandlers.updateCurrentPlayerHandler(currentPlayer);
              client.send(currentPlayerResponse);
            }
          }
        }

        return;
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

    if (typeof data === 'string') {
      return webSocketData as T;
    }

    if (data && typeof data === 'object' && 'indexRoom' in data) {
      return webSocketData as T;
    }

    if (
      data &&
      typeof data === 'object' &&
      'gameId' in data &&
      typeof data.gameId === 'string' &&
      'ships' in data &&
      Array.isArray(data.ships) &&
      'indexPlayer' in data &&
      typeof data.indexPlayer === 'string'
    ) {
      return webSocketData as T;
    }

    return { error: true, errorText: 'Invalid data' };
  };
}
