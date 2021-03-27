import { BotScript, Request } from '../../src/engine';
import { expect } from 'chai';
import { readFileSync } from 'fs';

/**
 * Register a new account
 */
describe('Register.bot (e2e)', async () => {

  const scripts = readFileSync('examples/register.bot', 'utf-8');

  it('should register account successfully', async () => {
    const bot = new BotScript();
    let req = new Request();
    bot.parse(scripts);

    req = await bot.handleAsync(req.enter('đăng ký'));

    expect(req.speechResponse).match(/nhập tài khoản/i);
    req = await bot.handleAsync(req.enter('vunb'));

    expect(req.speechResponse).match(/nhập password/i);
    req = await bot.handleAsync(req.enter('123456'));

    expect(req.speechResponse).match(/xác nhận thông tin/i);
    req = await bot.handleAsync(req.enter('yes'));

    const {reg_username, reg_result_message} = req.variables;
    const vResult = `Bạn đã đăng ký thành công, tài khoản ${reg_username}: ok!`;

    expect(reg_result_message).match(/ok/);
    expect(req.speechResponse).eq(vResult);
    bot.logger.info('Chi tiết tài khoản: ', req.variables);
  });

  it('should register account failure', async () => {
    const bot = new BotScript();
    let req = new Request();
    bot.parse(scripts);

    req = await bot.handleAsync(req.enter('đăng ký'));

    expect(req.speechResponse).match(/nhập tài khoản/i);
    req = await bot.handleAsync(req.enter('vunb2'));

    expect(req.speechResponse).match(/nhập password/i);
    req = await bot.handleAsync(req.enter('123456'));

    expect(req.speechResponse).match(/xác nhận thông tin/i);
    req = await bot.handleAsync(req.enter('no'));

    expect(req.speechResponse).match(/bạn đã hủy đăng ký/i);
    bot.logger.info('Your input: ', req.message);
  });
});
