/**
 * Dialogue response
 */
export class Response {

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

  constructor() {
    this.contexts = [];
  }
}
