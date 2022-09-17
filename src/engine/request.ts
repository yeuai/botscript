/**
 * Dialogue request (human context)
 */
export class Request {

  public botId: string;
  public sessionId: string;
  public message: string;
  public speechResponse: string;
  public time: Date;  // request time

  /**
   * This flag indicates the dialogue is forwarding
   * Bot must reset request and enter the new dialogue
   */
  public isForward: boolean;

  /**
   * This flag indicates the dialogue is flowing
   * Bot must enter the flow and resolve it
   */
  public isFlowing: boolean;

  /**
   * This flag indicates the dialogue is resolved
   */
  public isNotResponse: boolean;

  /**
   * Dialogue flows in queue
   */
  public flows: string[];

  /**
   * Flows queue are resolved
   */
  public resolvedFlows: string[];

  /**
   * Flows are missing
   */
  public missingFlows: string[];

  /**
   * Data context flows
   * TODO: Rename $flows to $scope? => $scope.ask_flow_info
   */
  public $flows: {
    [x: string]: string;
  };

  /**
   * Human variables extracted in the conversation
   */
  public variables: any;

  /**
   * NLP extracted entities (current)
   */
  public entities: any;

  /**
   * NLP intent detection
   */
  public intent: string;

  /**
   * Current flow to be resolved
   */
  public currentFlow: string;

  /**
   * Current flow resolved state
   */
  public currentFlowIsResolved: boolean;

  /**
   * Current talking dialogue
   */
  public currentDialogue: string;

  /**
   * Original talking dialogue
   */
  public originalDialogue: string;

  /**
   * Prompt human how to answer
   */
  public prompt: string[];

  /**
   * Bot previous speech responses
   */
  public previous: string[];

  /**
   * Initialize a new message request
   * @param message text input
   */
  constructor(message?: string) {
    this.flows = [];
    this.variables = {};
    this.isFlowing = false;
    this.isForward = false;
    this.resolvedFlows = [];
    this.missingFlows = [];
    this.previous = [];
    this.$flows = {};
    this.time = new Date();

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
    this.isForward = false;
    return this;
  }

  /**
   * Get current request contexts scope
   */
  get contexts() {
    const resolved = this.resolvedFlows.length;
    const missing = this.missingFlows.length;
    const count = this.flows.length;
    // flows are resolved
    const done = (count > 0) && (count === resolved) && (missing === 0);
    const $flows = { ...this.$flows, resolved, missing, count, done }; // $flow scope
    return {
      ...this.variables,
      ...this.$flows,
      $previous: this.previous,
      $input: this.message,
      $flows,
    };
  }
}
