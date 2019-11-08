/**
 * Pattern activator
 */
export interface IActivator {
  source: string;
  test(input: string): boolean;
  exec(input: string): string[];
  toString(): string;
}
