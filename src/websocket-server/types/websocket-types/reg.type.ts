import { CONSTANTS_TYPE } from '../constants';

export interface RequestReg {
  type: typeof CONSTANTS_TYPE.REG;
  data: {
    name: string;
    password: string;
  };
  id: number;
}

export interface ResponseReg {
  type: typeof CONSTANTS_TYPE.REG;
  data: {
    name: string;
    index: number;
    error: boolean;
    errorText: string;
  };
  id: number;
}
