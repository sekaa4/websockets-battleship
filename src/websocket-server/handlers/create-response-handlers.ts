/* eslint-disable max-lines-per-function */
import { randomUUID } from 'node:crypto';
import { CONSTANTS_TYPE } from '../types/constants';
import { Room } from '../types/room.type';
import { User } from '../types/user.type';
import { DataUser } from '../types/data-user.type';
import { WebSocketStateClient } from '../types/websocket-state-client.type';
import { RequestReg } from '../types/websocket-types';
import { CreateNewRoom } from '../types/websocket-types/create-new-room.type';
import { ResponseError } from '../types/websocket-types/response-error.type';
import { ResponseValidPlayer } from '../types/websocket-types/response-valid-player';
import { AddUserToRoom } from '../types/websocket-types/add-user-to-room.type';
import { CreateGame } from '../types/websocket-types/create-game.type';
import { Game } from '../types/game.type';
import { AddShips } from '../types/websocket-types/add-ships.type';

const usersData: DataUser[] = [];

const rooms: Room[] = [];

const games: Game[] = [];
export class CreateResponseHandlers {
  public clientState: WebSocketStateClient;
  constructor(wsClient: WebSocketStateClient) {
    this.clientState = wsClient;
  }
  public registrationPlayerHandler = (webSocketData: RequestReg['data'] | ResponseValidPlayer): string => {
    if ('error' in webSocketData) {
      return JSON.stringify(this.createErrorObject(webSocketData));
    }

    const { name, password } = webSocketData;

    const newUser = {
      name: name,
      password: password,
    };

    usersData.push(newUser);

    this.clientState.playerInfo = {
      ...newUser,
      index: randomUUID(),
      roomId: '',
      idGame: '',
      ships: [],
      startPosition: '',
      currentPlayer: '',
    };

    const dataObjectPlayerResponse = {
      type: CONSTANTS_TYPE.REG,
      data: JSON.stringify({
        name: name,
        index: this.clientState.playerInfo.index,
        error: false,
        errorText: '',
      }),
      id: 0,
    };

    return JSON.stringify(dataObjectPlayerResponse);
  };

  public createRoomHandler = (webSocketData: CreateNewRoom['data'] | ResponseValidPlayer): string => {
    if (typeof webSocketData === 'string') {
      const { index, name } = this.clientState.playerInfo;
      const roomId = randomUUID();
      this.clientState.playerInfo.roomId = roomId;

      const room: Room = {
        roomId,
        roomUsers: [
          {
            name: name,
            index,
          },
        ],
      };
      rooms.push(room);

      const dataObjectUpdateRoomResponse = {
        type: CONSTANTS_TYPE.UPDATE_ROOM,
        data: JSON.stringify(rooms),
        id: 0,
      };

      return JSON.stringify(dataObjectUpdateRoomResponse);
    }
    return JSON.stringify(this.createErrorObject(webSocketData));
  };

  public createGameHandler = (webSocketData: AddUserToRoom['data']): string => {
    const { index, name } = this.clientState.playerInfo;
    const { indexRoom: roomId } = webSocketData;
    const idGame = randomUUID();

    const game: CreateGame['data'] = {
      idGame,
      idPlayer: index,
    };

    if (this.clientState.playerInfo.roomId === roomId) {
      return '';
    }

    this.clientState.playerInfo.roomId = roomId;
    this.clientState.playerInfo.idGame = idGame;

    const indexRoomInBase = rooms.findIndex((room) => room.roomId === roomId);

    rooms[indexRoomInBase]?.roomUsers.push({ index, name });
    const gameUsers = rooms[indexRoomInBase]?.roomUsers as User[];

    // enemyUser.
    games.push({ stage: 'prepare', idGame, gameUsers });
    rooms.splice(indexRoomInBase, 1);

    const dataObjectCreateGameResponse = {
      type: CONSTANTS_TYPE.CREATE_GAME,
      data: JSON.stringify(game),
      id: 0,
    };

    return JSON.stringify(dataObjectCreateGameResponse);
  };

  public addShipsHandler = (webSocketData: AddShips['data']): string => {
    const { index, idGame } = this.clientState.playerInfo;
    const { gameId, indexPlayer, ships } = webSocketData;
    const indexGameInBase = games.findIndex((game) => game.idGame === gameId);

    console.log('index', index);
    console.log('indexPlayer', indexPlayer);

    if (idGame === gameId) {
      this.clientState.playerInfo.ships = ships;
      this.clientState.playerInfo.currentPlayer = indexPlayer;

      console.log('stage', games[indexGameInBase]?.stage);
      const isStageReady = games[indexGameInBase]?.stage === 'ready';

      if (isStageReady) {
        const dataObjectStartGameResponse = {
          type: CONSTANTS_TYPE.START_GAME,
          data: JSON.stringify({ ships, currentPlayerIndex: index }),
          id: 0,
        };
        this.clientState.playerInfo.startPosition = JSON.stringify(dataObjectStartGameResponse);
        return JSON.stringify(dataObjectStartGameResponse);
      }

      if (games[indexGameInBase]) {
        (games[indexGameInBase] as Game).stage = 'ready';
        const dataObjectStartGameResponse = {
          type: CONSTANTS_TYPE.START_GAME,
          data: JSON.stringify({ ships, currentPlayerIndex: index }),
          id: 0,
        };
        this.clientState.playerInfo.startPosition = JSON.stringify(dataObjectStartGameResponse);
        return 'not ready';
      }
    }
    return '';
  };

  public updateCurrentPlayerHandler = (currentPlayer: string): string => {
    const dataObjectUpdateRoomResponse = {
      type: CONSTANTS_TYPE.TURN,
      data: JSON.stringify({ currentPlayer }),
      id: 0,
    };

    return JSON.stringify(dataObjectUpdateRoomResponse);
  };

  public updateRoomHandler = (): string => {
    const dataObjectUpdateRoomResponse = {
      type: CONSTANTS_TYPE.UPDATE_ROOM,
      data: JSON.stringify(rooms),
      id: 0,
    };

    return JSON.stringify(dataObjectUpdateRoomResponse);
  };

  public createErrorObject = (data: ResponseValidPlayer): ResponseError => {
    const errorObject = {
      type: CONSTANTS_TYPE.REG,
      data: JSON.stringify({
        name: '',
        index: '',
        error: true,
        errorText: data.errorText,
      }),
      id: 0,
    };
    return errorObject;
  };
}
