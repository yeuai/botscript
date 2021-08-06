import { NodeVM, VMScript } from 'vm2';

export class VmRunner {
  /**
   * Run code in NodeVM
   * Example:
   * // const runner = new VmRunner();
   * // return runner.runInVm(vm, code);
   * @param vm
   * @param code
   * @param path
   * @returns
   */
  async runInVm(vm: NodeVM, code: string, path?: string) {
    const script = new VMScript(code, { filename: path });
    const retValue = await vm.run(script);
    return retValue;
  }

  /**
   * run code in vm sandbox
   * @param code
   * @param sandbox
   * @returns
   */
  static run(code: string, sandbox: any): () => void {
    const vm = new NodeVM({
      wrapper: 'none',
      sandbox,
      timeout: 5000,
    });

    const retValue = vm.run(code);
    return retValue;
  }
}
