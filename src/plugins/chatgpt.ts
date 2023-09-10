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
  const messages = req.variables.messages || [
    {
      role: 'user',
      content: req.message,
    }
  ]
  const openai = new OpenAI({
    apiKey,
    baseURL: baseURL || 'https://api.openai.vn/v1',
  });

  let result = '';

  if (apiStream) {
    const stream = await openai.chat.completions.create({
      messages,
      model: apiModel || 'gpt-3.5-turbo',
      stream: apiStream,
    });
    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || '';
      result += content;
      ctx.emit('typing', result);
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
    req.speechResponse = result;
  }
}
