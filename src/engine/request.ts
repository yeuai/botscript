/**
 * Dialogue request
 */
export class Request {

  public agentId: string;
  public sessionId: string;
  public text: string;
  public contexts: string[];
  public complete: boolean;

  constructor() {
    this.contexts = [];
  }
}
