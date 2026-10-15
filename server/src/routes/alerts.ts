import { Router, Request, Response } from 'express';
import { prisma } from '../db/prisma';

export const alertsRouter = Router();

// GET /api/alerts - List shortage and price alerts
alertsRouter.get('/', async (req: Request, res: Response) => {
  try {
    const unreadOnly = req.query.unreadOnly === 'true';

    const where: any = {};
    if (unreadOnly) {
      where.readAt = null;
    }

    const alerts = await prisma.alert.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        component: {
          select: {
            id: true,
            name: true,
            mpn: true,
            manufacturer: true,
          },
        },
      },
    });

    const unreadCount = await prisma.alert.count({
      where: { readAt: null },
    });

    return res.json({
      alerts,
      unreadCount,
    });
  } catch (err: any) {
    return res.status(500).json({
      error: 'Failed to fetch alerts',
      message: err.message,
    });
  }
});

// PATCH /api/alerts/:id/read - Mark an alert as read
alertsRouter.patch('/:id/read', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;

    const updated = await prisma.alert.update({
      where: { id },
      data: { readAt: new Date() },
    });

    return res.json({ alert: updated });
  } catch (err: any) {
    return res.status(404).json({
      error: 'Alert not found or failed to update',
      message: err.message,
    });
  }
});

// PATCH /api/alerts/read-all - Mark all alerts as read
alertsRouter.patch('/read-all', async (_req: Request, res: Response) => {
  try {
    const result = await prisma.alert.updateMany({
      where: { readAt: null },
      data: { readAt: new Date() },
    });

    return res.json({ success: true, updatedCount: result.count });
  } catch (err: any) {
    return res.status(500).json({
      error: 'Failed to mark all alerts as read',
      message: err.message,
    });
  }
});
