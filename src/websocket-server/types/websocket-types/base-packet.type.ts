import { CONSTANTS_TYPE } from '../constants';
import { ValueOf } from '../utils.type';
import { DataRequest } from './data-request.type';

export interface BasePacket {
  type: ValueOf<typeof CONSTANTS_TYPE>;
  data: string | DataRequest;
  id: number;
}
