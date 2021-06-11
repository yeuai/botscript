import { Struct } from '../engine';
import { IMapValue } from './map-value';

export interface IReply {
  candidate?: number;
  captures?: IMapValue;
  dialog?: Struct;
}
