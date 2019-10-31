/**
 * Dialogue request
 */
export class Request {

  public agentId: string;
  public sessionId: string;
  public input: string;
  public speechResponse: string;
  public flows: string[];
  public complete: boolean;
  public variables: any;
  public extractedParameters: any;
  public missingParameters: [];
  public currentNode: string;

  /**
   * Initialize a new message request
   * @param input message text input
   */
  constructor(input?: string) {
    this.flows = [];
    this.variables = {};

    if (input) {
      this.input = input.toLowerCase();
    }
  }
}
