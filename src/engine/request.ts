/**
 * Dialogue request
 */
export class Request {

  public agentId: string;
  public sessionId: string;
  public text: string;
  public contexts: string[];
  public complete: boolean;

  constructor(text?: string) {
    this.contexts = [];

    if (text) {
      this.text = text.toLowerCase();
    }
  }
}
