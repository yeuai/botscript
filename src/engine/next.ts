import { Request } from './request';

/**
 * Create next request
 * @param string
 * @param lastRequest
 */
export function createNextRequest(message: string, lastRequest?: Request) {
  const request = new Request();
  // transfer state to new request
  const vResult = Object.assign(request, lastRequest, { message });
  return vResult;
}
