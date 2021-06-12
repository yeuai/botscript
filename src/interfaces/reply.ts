import { Struct } from '../engine';
import { IMapValue } from './map-value';

export interface IReply {
  captures: IMapValue;
  candidate?: number;
  dialog?: Struct;
}
