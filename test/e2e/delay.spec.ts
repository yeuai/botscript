import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';

// Setup axios interceptors
const mock = new MockAdapter(axios);
// Mock specific requests, but let unmatched ones through
mock
  .onPost('/api/account/register').reply(200, {
    reg_result_message: 'ok',
  })
  .onGet('/api/nlu').reply(200, {
    intent: 'who',
    entities: [{ id: 1, name: 'John Smith' }],
  })
  .onGet('/api/nlu/react').reply(200, {
    intent: 'react_positive',
    entities: [{ id: 1, name: 'John Smith' }],
  })
  .onPut('/api/http/put').reply(200, {
    error: 0,
    message: 'Ok',
    Titlecase: 'NewVar',
  })
  .onDelete('/api/http/delete').reply(200, {
    error: 0,
    message2: 'Ok',
  })
  .onGet('/api/data/list').reply(200, {
    people: [{
        name: 'Vũ',
        age: 30,
      }, {
        name: 'Toàn',
        age: 20,
      }, {
        name: 'Cường',
        age: 25,
      },
    ],
  })
  .onAny().passThrough();

/**
 * sleep utils
 * @param m
 */
const sleep =
  (m: number) => new Promise(r => setTimeout(r, m));

/**
 * Async testing setup
 */
async function bootstrap() {
  await sleep(1);
  run();
}

bootstrap();
