/**
 * Dialogue request
 */
export class Request {

  public agentId: string;
  public sessionId: string;
  public input: string;
  public speechResponse: string;
  public contexts: string[];
  public complete: boolean;
  public parameters: any;
  public extractedParameters: any;
  public missingParameters: [];

  /**
   * Initialize a new message request
   * @param input message text input
   */
  constructor(input?: string) {
    this.contexts = [];
    this.parameters = {};

    if (input) {
      this.input = input.toLowerCase();
    }
  }
}
