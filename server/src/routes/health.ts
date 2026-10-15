import { Router, Request, Response } from 'express';
import { prisma } from '../db/prisma';
import { getTinyFishConfig } from '../services/tinyfish/client';

export const healthRouter = Router();

healthRouter.get('/health', async (_req: Request, res: Response) => {
  let dbStatus = 'ok';
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch (err: any) {
    dbStatus = `error: ${err.message}`;
  }

  const { apiKey } = getTinyFishConfig();
  const tinyFishStatus = apiKey && apiKey.length > 5 ? 'configured' : 'missing_api_key';

  const status = dbStatus === 'ok' ? 200 : 503;

  return res.status(status).json({
    status: dbStatus === 'ok' ? 'healthy' : 'degraded',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    services: {
      database: dbStatus,
      tinyFishApiKey: tinyFishStatus,
    },
  });
});
