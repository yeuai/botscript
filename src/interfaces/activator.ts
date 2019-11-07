export interface IActivator {
  name: string;
  test(input: string): boolean;
  exec(input: string): string[];
  toString(): string;
}
