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
    await bot.handleAsync(req.enter('vunb'));

    expect(req.speechResponse).match(/nhập password/i);
    await bot.handleAsync(req.enter('123456'));

    expect(req.speechResponse).match(/xác nhận thông tin/i);
    await bot.handleAsync(req.enter('yes'));

    expect(req.speechResponse).match(/đăng ký thành công/i);
    bot.logger.info('Chi tiết tài khoản: ', req.variables);
  });

  it('should register account failure', async () => {

    await bot.handleAsync(req.enter('đăng ký'));

    expect(req.speechResponse).match(/nhập tài khoản/i);
    await bot.handleAsync(req.enter('vunb2'));

    expect(req.speechResponse).match(/nhập password/i);
    await bot.handleAsync(req.enter('123456'));

    expect(req.speechResponse).match(/xác nhận thông tin/i);
    await bot.handleAsync(req.enter('no'));

    expect(req.speechResponse).match(/bạn đã hủy đăng ký/i);
    bot.logger.info('Your input: ', req.message);
  });
});
