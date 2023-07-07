import { AddPlayerToRoom } from './add-player-to-room.type';
import { AddShips } from './add-ships.type';
import { RequestAttack } from './attack.type';
import { CreateNewRoom } from './create-new-room.type';
import { RandomAttack } from './random-attack.type';
import { RequestReg } from './reg.type';

export type DataRequest =
  | RequestReg['data']
  | CreateNewRoom['data']
  | AddPlayerToRoom['data']
  | AddShips['data']
  | RequestAttack['data']
  | RandomAttack['data'];
