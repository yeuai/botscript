/**
 * Dialogue request
 */
export class Request {

  public agentId: string;
  public sessionId: string;
  public text: string;
  public contexts: string[];
  public complete: boolean;
  public parameters: any;

  constructor(text?: string) {
    this.contexts = [];
    this.parameters = {};

    if (text) {
      this.text = text.toLowerCase();
    }
  }
}
