import OpenAI from 'openai';
import { Request, Context } from '../common';

/**
> chatgpt

+ hello bot
- hello human
*/
export async function chatgpt(req: Request, ctx: Context) {
  const baseURL = ctx.definitions.get('api-url')?.value as string;
  const apiKey = ctx.definitions.get('api-key')?.value as string;
  const apiModel = ctx.definitions.get('api-model')?.value as string;
  const apiStream = ctx.definitions.get('api-stream')?.value as string === 'true';
  const dangerouslyAllowBrowser = ctx.definitions.get('api-browser')?.value as string !== 'false';
  const messages = req.variables.messages as any[] || [];
  const openai = new OpenAI({
    apiKey,
    dangerouslyAllowBrowser,
    baseURL: baseURL || 'https://api.openai.vn/v1',
  });

  let result = '';
  messages.push({
    role: 'user',
    content: req.message,
  });
  if (apiStream) {
    const stream = await openai.chat.completions.create({
      messages,
      model: apiModel || 'gpt-3.5-turbo',
      stream: apiStream,
    });
    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || '';
      const role = chunk.choices[0]?.delta?.role;
      result += content;
      ctx.emit('typing', { result, content, role });
    }
  } else {
    const completion = await openai.chat.completions.create({
      messages,
      model: apiModel || 'gpt-3.5-turbo',
      stream: apiStream,
    });
    result = completion.choices[0].message.content as string;
  }

  return () => {
    messages.push({
      role: 'assistant',
      content: result,
    });
    Object.assign(req.variables, { messages });
    req.speechResponse = result;
  }
}
