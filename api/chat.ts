import OpenAI from 'openai';
import type { VercelRequest, VercelResponse } from '@vercel/node';

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });
const MODEL = process.env.OPENAI_MODEL || 'gpt-5';

function cors(res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', process.env.CORS_ORIGIN || '*');
  res.setHeader('Access-Control-Allow-Headers', 'content-type,authorization');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ ok:false, error:'Use POST' });

  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');

  const hb = setInterval(() => { try { res.write(': ping\n\n'); } catch {} }, 15000);
  const end = () => { clearInterval(hb); try { res.end(); } catch {} };

  try {
    const { messages = [] } = (req.body as any) ?? {};
    const input = messages.map((m: any) => `${String(m.role).toUpperCase()}: ${m.content}`).join('\n');

    const stream = await client.responses.stream({ model: MODEL, input });

    stream.on('event', (event) => {
      if (event.type === 'response.output_text.delta') res.write(`data: ${event.delta}\n\n`);
      if (event.type === 'response.completed') { res.write('data: [DONE]\n\n'); end(); }
    });
    stream.on('error', (err) => { try { res.write(`data: [ERROR] ${String((err as any)?.message || err)}\n\n`); } finally { end(); } });
  } catch (e: any) {
    try { res.write(`data: [ERROR] ${String(e?.message || e)}\n\n`); } finally { end(); }
  }
}
