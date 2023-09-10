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

  const completion = await openai.chat.completions.create({
    messages,
    model: apiModel || 'gpt-3.5-turbo',
  });

  return () => {
    req.speechResponse = completion.choices[0].message.content as string;
  }
}
