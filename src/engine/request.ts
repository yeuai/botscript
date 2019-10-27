export class MessageRequest {

  public agentId: string;
  public sessionId: string;
  public text: string;
  public contexts: string[];

  constructor() {
    this.contexts = [];
  }
}
