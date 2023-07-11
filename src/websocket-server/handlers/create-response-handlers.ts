/* eslint-disable @typescript-eslint/no-non-null-assertion */
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
import { CellState } from '../types/cell-state.type';
import { Position } from '../types/position.type';
import { AttackAround } from '../types/attack-around.type';
import { RandomAttack } from '../types/websocket-types/random-attack.type';
import { Winner } from '../types/winner.type';

const usersData: DataUser[] = [];

const rooms: Room[] = [];

const games: Game[] = [];

const winners: Winner[] = [];
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
      const isRoomExist =
        rooms.length > 0 && rooms.find((room) => room.roomUsers.find((user) => user.index === index)?.index === index);

      if (isRoomExist) {
        return this.createErrorObject();
      }

      const roomId = randomUUID();
      this.clientState.playerInfo.roomId = roomId;

      const room: Room = {
        roomId,
        roomUsers: [
          {
            name,
            index,
            fieldShips: [],
            shipsAlive: 10,
          },
        ],
      };
      rooms.push(room);

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

    room?.roomUsers.push({ index, name, fieldShips: [], shipsAlive: 10 });
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
      const fieldShips = this.createFieldShips(ships);
      this.clientState.playerInfo.fieldShips = fieldShips;

      const users = game.gameUsers;
      const user = users.find((user) => user.index === indexPlayer);
      if (user) {
        user.fieldShips = fieldShips;
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

  public attackHandler = (webSocketData: RequestAttack['data']): string | AttackAround | ResponseError => {
    const { gameId, x, y, indexPlayer } = webSocketData;
    const game = games.find((game) => game.idGame === gameId);

    if (game && game.currentPlayer === indexPlayer) {
      const nextPlayer = game.gameUsers.find((user) => user.index !== game.currentPlayer);
      let response: string;

      const users = game.gameUsers;
      const user = users.find((user) => user.index !== indexPlayer);

      if (user) {
        const fieldShips = user.fieldShips;
        const position = { x, y };
        if (fieldShips[y]?.[x] === 0) {
          if (nextPlayer) {
            game.currentPlayer = nextPlayer.index;
          }
          response = this.createAttackResponse(indexPlayer, 'miss', position);
          return response;
        }
        if (typeof fieldShips[y]?.[x] === 'object') {
          const cell = fieldShips[y]?.[x] as CellState;
          const shot = cell.shots.find((shot) => shot.x === x && shot.y === y);

          if (shot) {
            if (nextPlayer) {
              game.currentPlayer = nextPlayer.index;
            }
            response =
              cell.shots.length === cell.health
                ? this.createAttackResponse(indexPlayer, 'killed', position)
                : this.createAttackResponse(indexPlayer, 'shot', position);
            return response;
          } else {
            const health = cell.shots.push(position);
            if (health < cell.health) {
              response = this.createAttackResponse(indexPlayer, 'shot', position);
              return response;
            } else if (health === cell.health) {
              cell.status = 'killed';

              const killedPositions = cell.shots;
              const aroundPositions = cell.missAroundPosition.filter((miss) => {
                for (const shot of killedPositions) {
                  if (miss.x === shot.x && miss.y === shot.y) {
                    return false;
                  }
                }

                return true;
              });

              user.shipsAlive--;
              // game.stage === 'finish';
              game.stage = user.shipsAlive === 0 ? 'finish' : game.stage;
              console.log('with killed positions', cell.missAroundPosition);
              console.log('without killed positions', aroundPositions);

              return { currentPlayer: indexPlayer, killedPositions, aroundPositions };
            }
          }
        }
      }
      return this.createErrorObject();
    }
    return this.createErrorObject('Cannot attack, wait your turn');
  };

  public randomAttackHandler = (webSocketData: RandomAttack['data']): string | AttackAround | ResponseError => {
    const x = Math.floor(Math.random() * 10);
    const y = Math.floor(Math.random() * 10);
    const updateWebSocketData = { ...webSocketData, x, y };
    return this.attackHandler(updateWebSocketData);
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

  public createErrorObject = (data: ResponseValidPlayer | string = 'Invalid request'): ResponseError => {
    const errorText = typeof data === 'object' ? data.errorText : data;
    const errorObject = {
      type: CONSTANTS_TYPE.REG,
      data: JSON.stringify({
        name: '',
        index: '',
        error: true,
        errorText,
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

  public createAttackResponse(index: string, status: string, position: Position): string {
    const data = {
      position,
      currentPlayer: index,
      status,
    };
    const dataObjectCreateGameResponse = {
      type: CONSTANTS_TYPE.ATTACK,
      data: JSON.stringify(data),
      id: 0,
    };
    return JSON.stringify(dataObjectCreateGameResponse);
  }

  public checkFinishGame(gameId: string): false | string {
    const game = games.find((game) => game.idGame === gameId);

    if (game && game.stage === 'finish') {
      const winUser = game.gameUsers.find((user) => user.index === game.currentPlayer);

      if (winUser) {
        const isWinUserExist = winners.find((user) => user.name === winUser.name);
        if (isWinUserExist) {
          isWinUserExist.wins++;
        } else {
          const winData = {
            name: winUser.name,
            wins: 1,
          };

          winners.push(winData);
        }
      }

      const data = {
        winPlayer: game.currentPlayer,
      };

      const dataObjectCreateGameResponse = {
        type: CONSTANTS_TYPE.FINISH,
        data: JSON.stringify(data),
        id: 0,
      };

      return JSON.stringify(dataObjectCreateGameResponse);
    }

    return false;
  }

  private createFieldShips = (ships: Ship[]): (number | CellState)[][] => {
    const field: (number | CellState)[][] = Array(10)
      .fill(0)
      .map(() => Array(10).fill(0));
    console.log('field', field);

    for (const ship of ships) {
      const {
        position: { x, y },
        direction,
        length,
        type,
        position,
      } = ship;

      console.log('direction', direction);
      console.log('letngth', length);
      console.log('position', x, y);

      const cell: CellState = {
        type,
        length,
        health: length,
        shots: [],
        startPosition: position,
        missAroundPosition: [],
        status: 'alive',
      };

      if (field[y]?.[x] === 0) {
        let index = 0;
        const missAround = cell.missAroundPosition;
        if (direction === false || length === 1) {
          for (let row = -1; row <= 1; row++) {
            for (let column = -1; column <= length; column++) {
              missAround.push({ x: x + column, y: y + row });
            }
          }

          while (index < length) {
            field[y]![x + index] = cell;
            index++;
          }
        } else {
          for (let row = -1; row <= length; row++) {
            for (let column = -1; column <= 1; column++) {
              missAround.push({ x: x + column, y: y + row });
            }
          }

          while (index < length) {
            field[y + index]![x] = cell;
            index++;
          }
        }
      }
    }
    // eslint-disable-next-line unicorn/no-array-for-each
    // field.forEach((value) => console.log(value.toString()));
    return field;
  };
}
