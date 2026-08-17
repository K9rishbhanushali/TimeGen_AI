import type { Request, Response } from 'express';
import { createApp } from '../server';

// Module scope is retained while a Vercel function instance is warm. This
// means Express setup and the MongoDB connection can be reused between calls.
const appPromise = createApp();

export default async function handler(req: Request, res: Response) {
  const app = await appPromise;
  return app(req, res);
}
