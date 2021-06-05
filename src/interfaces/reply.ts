import { Struct } from '../engine';
import { IMapValue } from './map-value';

export interface IReply {
  captures?: IMapValue;
  dialog?: Struct;
}
