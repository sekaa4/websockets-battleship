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
import { RequestAttack } from '../types/websocket-types/attack.type';
import { RandomAttack } from '../types/websocket-types/random-attack.type';

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
    switch (requestWebSocketData.type) {
      case CONSTANTS_TYPE.REG: {
        const webSocketData: DataRequest =
          typeof requestWebSocketData.data === 'string'
            ? JSON.parse(requestWebSocketData.data)
            : requestWebSocketData.data;

        const responseRegObject = this.responseHandlers.registrationPlayerHandler(
          this.isValidData<RequestReg['data']>(webSocketData),
        );

        this.clientState.send(responseRegObject);
        const rooms = this.responseHandlers.updateRoomHandler();

        this.clientState.send(rooms);
        this.clientState.send(this.responseHandlers.updateWinnersHandler());
        //! Update winners
        return;
      }
      case CONSTANTS_TYPE.CREATE_ROOM: {
        const webSocketData = requestWebSocketData.data;
        const clients = this.wsServer.clients as Set<WebSocketStateClient>;
        const validData = this.isValidData<CreateNewRoom['data']>(webSocketData);

        const error = this.responseHandlers.createRoomHandler(validData);
        if (error) {
          return JSON.stringify({
            ...error,
            type: CONSTANTS_TYPE.ADD_USER_TO_ROOM,
          });
        }

        for (const client of clients) {
          if (client.readyState === WebSocket.OPEN && client.playerInfo) {
            const rooms = this.responseHandlers.updateRoomHandler();
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

        const isComplete = this.responseHandlers.createGameHandler(validDataOrError);

        if (!isComplete) {
          return JSON.stringify({
            type: CONSTANTS_TYPE.ADD_USER_TO_ROOM,
            error: true,
            errorText: 'Cannot add user to own room, please wait opponent',
          });
        }

        if (isComplete === 'exist') {
          return JSON.stringify({
            type: CONSTANTS_TYPE.ADD_USER_TO_ROOM,
            error: true,
            errorText: 'Room with user already exists',
          });
        }

        const clients = this.wsServer.clients as Set<WebSocketStateClient>;
        const rooms = this.responseHandlers.updateRoomHandler();

        for (const client of clients) {
          if (
            client.readyState === WebSocket.OPEN &&
            client.playerInfo &&
            client.playerInfo.roomId === this.clientState.playerInfo.roomId
          ) {
            client.playerInfo.idGame = this.clientState.playerInfo.idGame;
            const gameResponse = this.responseHandlers.createGameResponse(client);
            client.send(rooms);
            client.send(gameResponse);
          } else if (client.readyState === WebSocket.OPEN && client.playerInfo) {
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
              client.playerInfo &&
              client.playerInfo.idGame === this.clientState.playerInfo.idGame
            ) {
              client.send(client.playerInfo.startPosition);
              const gameId = client.playerInfo.idGame;
              const currentPlayerResponse = this.responseHandlers.updateCurrentPlayerHandler(gameId);
              client.send(currentPlayerResponse);
            }
          }
        }

        return;
      }

      case CONSTANTS_TYPE.RANDOM_ATTACK:
      case CONSTANTS_TYPE.ATTACK: {
        const clients = this.wsServer.clients as Set<WebSocketStateClient>;
        const webSocketData: DataRequest =
          typeof requestWebSocketData.data === 'string'
            ? JSON.parse(requestWebSocketData.data)
            : requestWebSocketData.data;

        let validDataOrError: RandomAttack['data'] | RequestAttack['data'] | ResponseValidPlayer;
        validDataOrError =
          requestWebSocketData.type === CONSTANTS_TYPE.RANDOM_ATTACK
            ? this.isValidData<RandomAttack['data']>(webSocketData)
            : this.isValidData<RequestAttack['data']>(webSocketData);

        if ('error' in validDataOrError) {
          return JSON.stringify({
            ...this.responseHandlers.createErrorObject(validDataOrError),
            type:
              requestWebSocketData.type === CONSTANTS_TYPE.RANDOM_ATTACK
                ? CONSTANTS_TYPE.RANDOM_ATTACK
                : CONSTANTS_TYPE.ATTACK,
          });
        }

        const attack =
          requestWebSocketData.type === CONSTANTS_TYPE.RANDOM_ATTACK
            ? this.responseHandlers.randomAttackHandler(validDataOrError as RandomAttack['data'])
            : this.responseHandlers.attackHandler(validDataOrError as RequestAttack['data']);

        if (typeof attack === 'object' && Object.hasOwn(attack, 'error')) {
          return JSON.stringify({
            ...attack,
            type:
              requestWebSocketData.type === CONSTANTS_TYPE.RANDOM_ATTACK
                ? CONSTANTS_TYPE.RANDOM_ATTACK
                : CONSTANTS_TYPE.ATTACK,
          });
        }

        let count = 1;
        for (const client of clients) {
          if (
            client.readyState === WebSocket.OPEN &&
            client.playerInfo &&
            client.playerInfo.idGame === this.clientState.playerInfo.idGame
          ) {
            if (typeof attack === 'string') {
              client.send(attack);
            } else if (typeof attack === 'object' && 'currentPlayer' in attack) {
              const { aroundPositions, killedPositions, currentPlayer } = attack;
              for (const position of killedPositions) {
                const killedResponse = this.responseHandlers.createAttackResponse(currentPlayer, 'killed', position);
                client.send(killedResponse);
              }
              for (const position of aroundPositions) {
                const missResponse = this.responseHandlers.createAttackResponse(currentPlayer, 'miss', position);
                client.send(missResponse);
              }
            }
            const gameId = client.playerInfo.idGame;
            const finish = this.responseHandlers.checkFinishGame(gameId);
            const currentPlayerResponse = this.responseHandlers.updateCurrentPlayerHandler(gameId);
            client.send(currentPlayerResponse);

            if (finish) {
              client.send(finish);
              const rooms = this.responseHandlers.updateRoomHandler();
              client.send(rooms);
              if (count === 2) {
                count = 1;
                this.updateWinners();
              } else {
                count++;
              }
            }
          }
        }
        return;
      }

      default: {
        break;
      }
    }
    return;
  };

  protected updateWinners(): void {
    const clients = this.wsServer.clients as Set<WebSocketStateClient>;

    for (const client of clients) {
      if (client.readyState === WebSocket.OPEN && client.playerInfo) {
        client.send(this.responseHandlers.updateWinnersHandler());
      }
    }
  }

  protected isValidData = <T extends DataRequest>(webSocketData: DataRequest): T | ResponseValidPlayer => {
    const data = webSocketData;

    if (
      data &&
      typeof data === 'object' &&
      'gameId' in data &&
      typeof data.gameId === 'string' &&
      'indexPlayer' in data &&
      typeof data.indexPlayer === 'string'
    ) {
      if ('ships' in data && Array.isArray(data.ships)) {
        return webSocketData as T;
      }

      if ('x' in data && typeof data.x === 'number' && 'y' in data && typeof data.y === 'number') {
        return webSocketData as T;
      }
    }

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
      'indexPlayer' in data &&
      typeof data.indexPlayer === 'string'
    ) {
      return webSocketData as T;
    }

    return { error: true, errorText: 'Invalid data' };
  };
}
