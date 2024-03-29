import WebSocket, { WebSocketServer } from 'ws';
import {
  AddShips,
  AddUserToRoom,
  BasePacket,
  CreateNewRoom,
  DataRequest,
  RandomAttack,
  RequestAttack,
  RequestReg,
  ResponseValidPlayer,
} from '../types/websocket-types';
import { WebSocketStateClient, CONSTANTS_TYPE } from '../types';

import { CreateResponseHandlers } from './create-response-handlers';

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

        if (responseRegObject.includes(`false`)) {
          const rooms = this.responseHandlers.updateRoomHandler();
          this.clientState.send(rooms);
          this.clientState.send(this.responseHandlers.updateWinnersHandler());
        }

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

        const shipResponse = this.responseHandlers.addShipsHandler(validDataOrError);

        if (!shipResponse) {
          return JSON.stringify({
            type: CONSTANTS_TYPE.ADD_SHIPS,
            error: true,
            errorText: 'Invalid data',
          });
        }

        if (shipResponse === 'not ready') {
          return;
        } else if (shipResponse) {
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
                if (client.playerInfo.isSingleGame) {
                  client.playerInfo.isSingleGame = false;
                  this.updateWinners();
                  continue;
                }
                count++;
              }
            }

            if (client.playerInfo.isSingleGame) {
              const { index, idGame } = client.playerInfo.botInfo;

              const botRandomAttackData = {
                gameId: idGame,
                indexPlayer: index,
              };

              setTimeout(() => {
                const attack = this.responseHandlers.randomAttackHandler(botRandomAttackData);

                if (typeof attack === 'string') {
                  client.send(attack);
                } else if (typeof attack === 'object' && 'currentPlayer' in attack) {
                  const { aroundPositions, killedPositions, currentPlayer } = attack;
                  for (const position of killedPositions) {
                    const killedResponse = this.responseHandlers.createAttackResponse(
                      currentPlayer,
                      'killed',
                      position,
                    );

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

                  client.playerInfo.isSingleGame = false;
                  const rooms = this.responseHandlers.updateRoomHandler();

                  client.send(rooms);
                }
              }, 1000);
            }
          }
        }
        return;
      }

      case CONSTANTS_TYPE.SINGLE_PLAY: {
        if (this.clientState.readyState === WebSocket.OPEN && this.clientState.playerInfo) {
          const gameResponse = this.responseHandlers.createSingleGameResponse(this.clientState);

          this.clientState.send(gameResponse);
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

  public disconnectHandler = (index: string, roomId: string, idGame: string): string => {
    if (roomId) {
      const roomsResponse = this.responseHandlers.updateRoomHandler(roomId);
      const clients = this.wsServer.clients as Set<WebSocketStateClient>;

      for (const client of clients) {
        if (client.readyState === WebSocket.OPEN && client.playerInfo) {
          client.send(roomsResponse);
        }
      }
    }

    if (idGame && index) {
      const finishResponse = this.responseHandlers.finishGame(idGame, index);
      const clients = this.wsServer.clients as Set<WebSocketStateClient>;

      if (finishResponse) {
        for (const client of clients) {
          if (client.readyState === WebSocket.OPEN && client.playerInfo && client.playerInfo.idGame === idGame) {
            client.send(finishResponse);
          }

          const rooms = this.responseHandlers.updateRoomHandler();
          client.send(rooms);

          this.updateWinners();
        }
      }
    }

    return '';
  };

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
