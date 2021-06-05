import { IActivator } from './activator';

/**
 * Mapp activator
 */
 export interface IMapActivator {
  id: string;
  trigger: string;
  pattern: RegExp | IActivator;
}
