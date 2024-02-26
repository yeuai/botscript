import { IReply } from '../interfaces/reply';

/**
 * Dialogue response
 */
export class Response {

  public botId: string;
  public currentNode: string;
  public complete: boolean;
  public text: string;
  public contexts: string[];
  public parameters: string[]; // parameters in current child topic
  public extractedParameters: any;
  public missingParameters: [];
  public speechResponse: string;
  public intent: string;
  public input: string;
  public time: Date; // response time.
  // bot response histories
  public history: [{
    flows: [{
      [key: string]: string,
    }],
  }];
  // candidate
  reply?: IReply;

  constructor() {
    this.contexts = [];
    this.time = new Date();
  }
}
