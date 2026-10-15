import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../db/prisma';

export const bomsRouter = Router();

const createBomSchema = z.object({
  name: z.string().min(1, 'BOM name is required').max(100),
  description: z.string().max(500).optional(),
});

const addBomItemSchema = z.object({
  componentId: z.string().min(1, 'Component ID is required'),
  requiredQuantity: z.number().int().positive().default(1),
});

// GET /api/boms - List all BOMs
bomsRouter.get('/', async (_req: Request, res: Response) => {
  try {
    const boms = await prisma.bom.findMany({
      orderBy: { updatedAt: 'desc' },
      include: {
        items: {
          include: {
            component: {
              include: {
                listings: {
                  where: {
                    price: { not: null },
                    stockStatus: { in: ['IN_STOCK', 'LIMITED_STOCK'] },
                  },
                  orderBy: { price: 'asc' },
                  take: 1,
                },
              },
            },
          },
        },
      },
    });

    const enriched = boms.map((bom) => {
      let totalEstimatedCost = 0;
      let unresolvedCount = 0;

      const items = bom.items.map((item) => {
        const best = item.component?.listings?.[0] || null;
        let itemCost: number | null = null;

        if (best && best.price !== null) {
          itemCost = Number((best.price * item.requiredQuantity).toFixed(2));
          totalEstimatedCost += itemCost;
        } else {
          unresolvedCount++;
        }

        return {
          id: item.id,
          bomId: item.bomId,
          componentId: item.componentId,
          requiredQuantity: item.requiredQuantity,
          createdAt: item.createdAt.toISOString(),
          updatedAt: item.updatedAt.toISOString(),
          component: item.component,
          bestListing: best,
          estimatedCost: itemCost,
        };
      });

      return {
        id: bom.id,
        name: bom.name,
        description: bom.description,
        createdAt: bom.createdAt.toISOString(),
        updatedAt: bom.updatedAt.toISOString(),
        items,
        totalEstimatedCost: Number(totalEstimatedCost.toFixed(2)),
        unresolvedCount,
        itemCount: items.length,
      };
    });

    return res.json({ boms: enriched });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to fetch BOMs', message: err.message });
  }
});

// POST /api/boms - Create a BOM
bomsRouter.post('/', async (req: Request, res: Response) => {
  try {
    const parsed = createBomSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: parsed.error.format(),
      });
    }

    const bom = await prisma.bom.create({
      data: {
        name: parsed.data.name,
        description: parsed.data.description,
      },
    });

    return res.status(201).json({ bom });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to create BOM', message: err.message });
  }
});

// GET /api/boms/:id - Get a specific BOM
bomsRouter.get('/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;

    const bom = await prisma.bom.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            component: {
              include: {
                listings: {
                  orderBy: { price: 'asc' },
                },
              },
            },
          },
        },
      },
    });

    if (!bom) {
      return res.status(404).json({ error: 'BOM not found' });
    }

    let totalEstimatedCost = 0;
    let unresolvedCount = 0;

    const items = bom.items.map((item: any) => {
      // Find best in-stock listing with valid price
      const inStockListings = item.component?.listings?.filter(
        (l: any) => l.price !== null && (l.stockStatus === 'IN_STOCK' || l.stockStatus === 'LIMITED_STOCK')
      ) || [];

      const best = inStockListings[0] || item.component?.listings?.[0] || null;
      let itemCost: number | null = null;

      if (best && best.price !== null && (best.stockStatus === 'IN_STOCK' || best.stockStatus === 'LIMITED_STOCK')) {
        itemCost = Number((best.price * item.requiredQuantity).toFixed(2));
        totalEstimatedCost += itemCost;
      } else {
        unresolvedCount++;
      }

      return {
        id: item.id,
        bomId: item.bomId,
        componentId: item.componentId,
        requiredQuantity: item.requiredQuantity,
        createdAt: item.createdAt.toISOString(),
        updatedAt: item.updatedAt.toISOString(),
        component: item.component,
        bestListing: best,
        estimatedCost: itemCost,
      };
    });

    return res.json({
      bom: {
        id: bom.id,
        name: bom.name,
        description: bom.description,
        createdAt: bom.createdAt.toISOString(),
        updatedAt: bom.updatedAt.toISOString(),
        items,
        totalEstimatedCost: Number(totalEstimatedCost.toFixed(2)),
        unresolvedCount,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to fetch BOM', message: err.message });
  }
});

// POST /api/boms/:id/items - Add a component to BOM
bomsRouter.post('/:id/items', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const parsed = addBomItemSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: parsed.error.format(),
      });
    }

    const { componentId, requiredQuantity } = parsed.data;

    // Check BOM exists
    const bomExists = await prisma.bom.findUnique({ where: { id } });
    if (!bomExists) {
      return res.status(404).json({ error: 'BOM not found' });
    }

    // Check Component exists
    const componentExists = await prisma.component.findUnique({ where: { id: componentId } });
    if (!componentExists) {
      return res.status(404).json({ error: 'Component not found' });
    }

    const item = await prisma.bomItem.upsert({
      where: {
        bomId_componentId: {
          bomId: id,
          componentId,
        },
      },
      update: {
        requiredQuantity,
      },
      create: {
        bomId: id,
        componentId,
        requiredQuantity,
      },
      include: {
        component: true,
      },
    });

    return res.status(201).json({ item });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to add item to BOM', message: err.message });
  }
});

// DELETE /api/boms/:id/items/:itemId - Remove item from BOM
bomsRouter.delete('/:id/items/:itemId', async (req: Request, res: Response) => {
  try {
    const itemId = req.params.itemId as string;

    await prisma.bomItem.delete({
      where: { id: itemId },
    });

    return res.json({ success: true, message: 'Item removed from BOM' });
  } catch (err: any) {
    return res.status(404).json({ error: 'Item not found or already deleted', message: err.message });
  }
});
