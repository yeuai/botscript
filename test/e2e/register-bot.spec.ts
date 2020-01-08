import { BotScript, Request } from '../../src/engine';
import { expect } from 'chai';
import { readFileSync } from 'fs';
import { fail } from 'assert';

/**
 * Register a new account
 */
describe('Register.bot (e2e)', async () => {
  const bot = new BotScript();
  const req = new Request();

  const scripts = readFileSync('examples/register.bot', 'utf-8');
  bot.parse(scripts);

  it('should register account successfully', async () => {

    await bot.handleAsync(req.enter('đăng ký'));
    expect(req.speechResponse).match(/nhập tài khoản/i);

    fail('Not implemented!');
  });
});
