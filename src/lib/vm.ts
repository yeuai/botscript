import { Script } from 'vm';

export class VmRunner {
  runInVm(code: string, sandbox: any, path?: string) {
    // promisify task runner
    return new Promise((resolve, reject) => {
      try {
        const script = new Script(code, { filename: path, timeout: 5000 });
        const retValue = script.runInNewContext(sandbox);

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
  static run(code: string, sandbox: any): () => void {
    const script = new Script(code, { timeout: 5000 });
    const retValue = script.runInNewContext(sandbox);
    return retValue;
  }
}
