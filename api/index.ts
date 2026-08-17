import type { Request, Response } from 'express';
import { createApp } from '../server';

// Module scope is retained while a Vercel function instance is warm. This
// means Express setup and the MongoDB connection can be reused between calls.
let appPromise: Promise<any> | null = null;
let appError: Error | null = null;

function getApp() {
  if (!appPromise) {
    appPromise = createApp().catch((err) => {
      appError = err;
      appPromise = null; // Allow retry on next request
      throw err;
    });
  }
  return appPromise;
}

export default async function handler(req: Request, res: Response) {
  try {
    const app = await getApp();
    return app(req, res);
  } catch (err: any) {
    console.error('Vercel function initialization error:', err);
    res.status(500).json({
      error: 'Server initialization failed',
      message: err?.message || 'Unknown error',
      hint: 'Check that MONGODB_URI environment variable is set correctly in Vercel and that MongoDB Atlas Network Access allows 0.0.0.0/0',
    });
  }
}
