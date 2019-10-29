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
