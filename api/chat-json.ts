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

  try {
    const { messages = [] } = (req.body as any) ?? {};
    const result = await client.responses.create({
      model: MODEL,
      input: messages.map((m: any) => `${String(m.role).toUpperCase()}: ${m.content}`).join('\n'),
    });
    res.status(200).json({ ok: true, text: result.output_text || '' });
  } catch (e: any) {
    res.status(500).json({ ok:false, error: String(e?.message || e) });
  }
}