/* eslint-disable unicorn/new-for-builtins */
/* eslint-disable max-lines-per-function */
import { randomUUID } from 'node:crypto';
import { CONSTANTS_TYPE } from '../types/constants';
import { Room } from '../types/room.type';
import { User } from '../types/user.type';
import { DataUser } from '../types/data-user.type';
import { WebSocketStateClient } from '../types/websocket-state-client.type';
import { RequestReg } from '../types/websocket-types';
import { ResponseError } from '../types/websocket-types/response-error.type';
import { ResponseValidPlayer } from '../types/websocket-types/response-valid-player';
import { AddUserToRoom } from '../types/websocket-types/add-user-to-room.type';
import { CreateGame } from '../types/websocket-types/create-game.type';
import { Game } from '../types/game.type';
import { Ship } from '../types/websocket-types/ship.type';
import { AddShips } from '../types/websocket-types/add-ships.type';
import { RequestAttack } from '../types/websocket-types/attack.type';

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
      fieldShips: [],
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

  public createRoomHandler = (webSocketData: string | ResponseValidPlayer): void | ResponseError => {
    if (typeof webSocketData === 'string') {
      const { index, name } = this.clientState.playerInfo;
      const roomId = randomUUID();
      this.clientState.playerInfo.roomId = roomId;

      const room: Room = {
        roomId,
        roomUsers: [
          {
            name,
            index,
            ships: [],
          },
        ],
      };

      const isRoomExist = rooms.find((room) => room.roomUsers.find((user) => user.index === index)?.index === index);

      if (isRoomExist) {
        return this.createErrorObject();
      }

      rooms.push(room);

      // const dataObjectUpdateRoomResponse = {
      //   type: CONSTANTS_TYPE.UPDATE_ROOM,
      //   data: JSON.stringify(rooms),
      //   id: 0,
      // };

      // return JSON.stringify(dataObjectUpdateRoomResponse);
      return;
    }
    return this.createErrorObject(webSocketData);
  };

  public createGameHandler = (webSocketData: AddUserToRoom['data']): boolean | string => {
    const { index, name } = this.clientState.playerInfo;
    const { indexRoom: roomId } = webSocketData;
    const idGame = randomUUID();

    if (this.clientState.playerInfo.roomId === roomId) {
      return false;
    }

    this.clientState.playerInfo.roomId = roomId;
    this.clientState.playerInfo.idGame = idGame;

    const room = rooms.find((room) => room.roomId === roomId);

    room?.roomUsers.push({ index, name, ships: [] });
    const gameUsers = [...(room?.roomUsers as User[])];
    games.push({ stage: 'prepare', idGame, gameUsers, currentPlayer: '' });

    for (const user of gameUsers) {
      rooms.splice(
        rooms.findIndex(
          (room) =>
            room.roomUsers.find((userInOtherRoom) => userInOtherRoom.index === user.index)?.index === user.index,
        ),
        1,
      );
    }

    return true;
  };

  public addShipsHandler = (webSocketData: AddShips['data']): string => {
    const { index, idGame } = this.clientState.playerInfo;
    const { gameId, indexPlayer, ships } = webSocketData;
    const game = games.find((game) => game.idGame === gameId);

    console.log('index', index);
    console.log('indexPlayer', indexPlayer);

    if (idGame === gameId && game) {
      this.clientState.playerInfo.ships = ships;
      this.clientState.playerInfo.fieldShips = this.createFieldShips(ships);

      const users = game.gameUsers;
      const user = users.find((user) => user.index === indexPlayer);
      if (user) {
        user.ships = ships;
      }
      console.log('stage', game.stage);
      const isStageReady = game.stage === 'ready';

      if (isStageReady) {
        const dataObjectStartGameResponse = {
          type: CONSTANTS_TYPE.START_GAME,
          data: JSON.stringify({ ships, currentPlayerIndex: indexPlayer }),
          id: 0,
        };

        this.clientState.playerInfo.startPosition = JSON.stringify(dataObjectStartGameResponse);
        game.stage = 'start';
        return JSON.stringify(dataObjectStartGameResponse);
      }

      game.stage = 'ready';
      game.currentPlayer = index;

      const dataObjectStartGameResponse = {
        type: CONSTANTS_TYPE.START_GAME,
        data: JSON.stringify({ ships, currentPlayerIndex: indexPlayer }),
        id: 0,
      };
      this.clientState.playerInfo.startPosition = JSON.stringify(dataObjectStartGameResponse);
      return 'not ready';
    }
    return '';
  };

  public attackHandler = (webSocketData: RequestAttack['data']): string => {
    const { fieldShips } = this.clientState.playerInfo;
    const { gameId, x, y, indexPlayer } = webSocketData;
    const game = games.find((game) => game.idGame === gameId);
    // console.log('index', index);
    // console.log('indexPlayer', indexPlayer);

    if (game) {
      const nextPlayer = game.gameUsers.find((user) => user.index !== indexPlayer);
      // const userShips = game.gameUsers.find((user) => user.index === indexPlayer)?.ships;
      // const ship = userShips;

      console.log('position', x, y);
      console.log('field222', fieldShips.toString());

      if (game.currentPlayer === indexPlayer && nextPlayer) {
        game.currentPlayer = nextPlayer.index;
      }
      // userShips && this.createFieldShips(userShips);

      // return JSON.stringify(dataObjectCreateGameResponse);
    }
    return '';
  };

  public updateCurrentPlayerHandler = (idGame: string): string => {
    const game = games.find((game) => game.idGame === idGame);
    const currentPlayer = game && game.currentPlayer;

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

  public createErrorObject = (data?: ResponseValidPlayer): ResponseError => {
    const errorObject = {
      type: CONSTANTS_TYPE.REG,
      data: JSON.stringify({
        name: '',
        index: '',
        error: true,
        errorText: data?.errorText ?? 'Invalid request',
      }),
      id: 0,
    };
    return errorObject;
  };

  public createGameResponse(client: WebSocketStateClient): string {
    const { index, idGame } = client.playerInfo;
    const game: CreateGame['data'] = {
      idGame,
      idPlayer: index,
    };
    const dataObjectCreateGameResponse = {
      type: CONSTANTS_TYPE.CREATE_GAME,
      data: JSON.stringify(game),
      id: 0,
    };
    return JSON.stringify(dataObjectCreateGameResponse);
  }

  private createFieldShips = (ships: Ship[]): number[][] => {
    const field: number[][] = Array(10)
      .fill(0)
      .map(() => Array(10).fill(0));
    console.log('field', field);

    for (const ship of ships) {
      const {
        position: { x, y },
        direction,
        length,
      } = ship;

      console.log('direction', direction);
      console.log('letngth', length);
      console.log('position', x, y);
      if (field?.[x]?.[y] === 0) {
        let index = 0;
        if (direction === false || length === 1) {
          while (index < length) {
            field[y]![x + index] = 1;
            index++;
          }
        } else {
          while (index < length) {
            field[y + index]![x] = 1;
            index++;
          }
        }
      }
    }
    // eslint-disable-next-line unicorn/no-array-for-each
    field.forEach((value) => console.log(value.toString()));
    return field;
  };
}
