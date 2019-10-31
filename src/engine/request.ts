/**
 * Dialogue request
 */
export class Request {

  public agentId: string;
  public sessionId: string;
  public message: string;
  public speechResponse: string;
  public complete: boolean;
  public extractedParameters: any;

  /**
   * Flows queue are resolved
   */
  public resolvedFlows: [];

  /**
   * Human variables extracted in the conversation
   */
  public variables: any;

  /**
   * Dialogue flows in queue
   */
  public flows: string[];

  /**
   * Current flow to be resolved
   */
  public currentNode: string;

  /**
   * Prompt human how to answer
   */
  public prompt: string[];

  /**
   * Initialize a new message request
   * @param message text input
   */
  constructor(message?: string) {
    this.flows = [];
    this.variables = {};

    if (message) {
      this.message = message.toLowerCase();
    }
  }

  /**
   * Update new message text
   * FOR: Testing
   * @param text
   */
  enter(text: string) {
    this.message = text;
    return this;
  }
}
