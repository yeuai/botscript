import { NodeVM, VMScript } from 'vm2';

export class VmRunner {
  runInVm(vm: NodeVM, code: string, path?: string) {
    // promisify task runner
    return new Promise((resolve, reject) => {
      try {
        const script = new VMScript(code, { filename: path });
        const retValue = vm.run(script);

        // Check if code returned a Promise-like object
        if (retValue && typeof retValue.then === 'function') {
          retValue.then(resolve, reject);
        } else {
          resolve(retValue);
        }
      } catch (err) {
        reject(err);
      }
    });
  }

  /**
   * run code in vm sandbox
   * @param code
   * @param sandbox
   * @returns
   */
  static run(code: string, sandbox: any) {
    const vm = new NodeVM({
      wrapper: 'none',
      sandbox,
      timeout: 5000,
    });

    const runner = new VmRunner();
    return runner.runInVm(vm, code);
  }
}
