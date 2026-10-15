import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../db/prisma';
import { searchTinyFish, buildTargetedSearchQuery } from '../services/tinyfish/search';
import { fetchSupplierPages } from '../services/tinyfish/fetch';
import { runAgentFallback } from '../services/tinyfish/agent';
import { ExtractedSupplierData } from '../services/tinyfish/parser';
import { normalizeMpn, compareMpns } from '../services/matching/mpnNormalizer';
import { matchComponent } from '../services/matching/matcher';
import { compareSupplierPrices, calculatePriceChange } from '../services/matching/comparer';
import { detectAlerts } from '../services/alerts/alertDetector';
import { SearchResultItem, SearchComponentResponse, StockStatus } from '../../../shared/types';

export const componentsRouter = Router();

// In-flight request tracker to prevent duplicate concurrent API requests for the same query
const activeSearchRequests = new Map<string, Promise<SearchComponentResponse>>();

const searchSchema = z.object({
  query: z.string().min(1, 'Search query or MPN is required').max(150),
  manufacturer: z.string().max(100).optional(),
  technicalRequirement: z.string().max(150).optional(),
  maxSuppliers: z.number().int().min(1).max(10).optional().default(5),
  saveToDatabase: z.boolean().optional().default(false),
  useAgentFallback: z.boolean().optional().default(false),
});

/**
 * Execute Search + Fetch + Matching pipeline
 */
async function executeSearchPipeline(
  query: string,
  manufacturer?: string,
  technicalRequirement?: string,
  maxSuppliers: number = 5,
  useAgentFallback: boolean = false
): Promise<SearchComponentResponse> {
  const startTime = Date.now();
  const normalizedQueryMpn = normalizeMpn(query);
  const errors: string[] = [];

  // Step 1: Targeted Query Construction & TinyFish Search
  const targetedQuery = buildTargetedSearchQuery(query, manufacturer, technicalRequirement);
  const searchResult = await searchTinyFish(targetedQuery, { maxResults: maxSuppliers });

  if (searchResult.suppliers.length === 0) {
    return {
      query,
      searchedMpn: query,
      normalizedMpn: normalizedQueryMpn,
      results: [],
      substitutes: [],
      snapshotTimestamp: new Date().toISOString(),
      totalFound: 0,
      tinyFishMethodUsed: 'SEARCH_AND_FETCH',
      executionTimeMs: Date.now() - startTime,
      errors: ['No supplier listings found for the specified query.'],
    };
  }

  // Step 2: Fetch clean supplier content for discovered URLs
  const candidateUrls = searchResult.suppliers.map((s) => s.url);
  const { successful: fetchedListings, failures: fetchFailures } = await fetchSupplierPages(
    candidateUrls,
    {
      expectedMpn: query,
      expectedManufacturer: manufacturer,
    }
  );

  for (const failure of fetchFailures) {
    errors.push(`${failure.url}: ${failure.error}`);
  }

  // Step 3: Optional Agent fallback for interactive or un-extractable listings
  let methodUsed: 'SEARCH_AND_FETCH' | 'AGENT_FALLBACK' = 'SEARCH_AND_FETCH';
  if (useAgentFallback && fetchedListings.some((l) => l.price === null && l.stockStatus === 'UNKNOWN')) {
    const unparsed = fetchedListings.find((l) => l.price === null && l.stockStatus === 'UNKNOWN');
    if (unparsed) {
      try {
        const agentResult = await runAgentFallback(unparsed.productUrl, query, manufacturer);
        if (agentResult) {
          methodUsed = 'AGENT_FALLBACK';
          const idx = fetchedListings.indexOf(unparsed);
          fetchedListings[idx] = agentResult;
        }
      } catch (agentErr: any) {
        errors.push(`Agent fallback note: ${agentErr.message}`);
      }
    }
  }

  // Step 4: Component Matching & Categorization (Direct matches vs Potential Substitutes)
  const directMatches: SearchResultItem[] = [];
  const substituteCandidates: SearchResultItem[] = [];

  for (const item of fetchedListings) {
    const match = matchComponent(
      {
        mpn: query,
        manufacturer,
        componentName: query,
        specifications: {},
      },
      {
        componentName: item.componentName,
        mpn: item.mpn,
        manufacturer: item.manufacturer,
        specifications: item.specifications,
      }
    );

    const resultItem: SearchResultItem = {
      supplier: item.supplierName,
      name: item.componentName,
      mpn: item.mpn,
      manufacturer: item.manufacturer,
      price: item.price,
      currency: item.currency,
      stockStatus: item.stockStatus,
      stockQuantity: item.stockQuantity,
      leadTime: item.leadTime,
      productUrl: item.productUrl,
      specifications: item.specifications,
      verificationStatus: item.verificationStatus,
      comparable: false,
    };

    if (match.isMatch) {
      directMatches.push(resultItem);
    } else if (match.isSubstitute) {
      resultItem.substituteCandidate = true;
      substituteCandidates.push(resultItem);
    } else {
      // Direct listing from query search
      directMatches.push(resultItem);
    }
  }

  // Step 5: Safe Price Comparison and Lowest Price Highlighting
  const evaluatedDirect = compareSupplierPrices(directMatches);
  const evaluatedSubstitutes = compareSupplierPrices(substituteCandidates);

  return {
    query,
    searchedMpn: query,
    normalizedMpn: normalizedQueryMpn,
    results: evaluatedDirect,
    substitutes: evaluatedSubstitutes,
    snapshotTimestamp: new Date().toISOString(),
    totalFound: evaluatedDirect.length + evaluatedSubstitutes.length,
    tinyFishMethodUsed: methodUsed,
    executionTimeMs: Date.now() - startTime,
    errors: errors.length > 0 ? errors : undefined,
  };
}

// POST /api/components/search - Search for electronic components & compare suppliers
componentsRouter.post('/search', async (req: Request, res: Response) => {
  try {
    const parsed = searchSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: parsed.error.format(),
      });
    }

    const { query, manufacturer, technicalRequirement, maxSuppliers, saveToDatabase, useAgentFallback } = parsed.data;
    const cacheKey = `${query.toLowerCase().trim()}_${(manufacturer || '').toLowerCase().trim()}_${maxSuppliers}`;

    // Prevent duplicate rapid submissions from hammering TinyFish
    let searchPromise = activeSearchRequests.get(cacheKey);
    if (!searchPromise) {
      searchPromise = executeSearchPipeline(
        query,
        manufacturer,
        technicalRequirement,
        maxSuppliers,
        useAgentFallback
      ).finally(() => {
        activeSearchRequests.delete(cacheKey);
      });
      activeSearchRequests.set(cacheKey, searchPromise);
    }

    const result = await searchPromise;

    // If saveToDatabase requested or component is already in database, persist records & snapshots
    if (saveToDatabase && result.results.length > 0) {
      const savedComponent = await persistComponentAndSnapshots(
        query,
        manufacturer || result.results[0]?.manufacturer || 'Unknown',
        result.results
      );
      result.componentId = savedComponent.id;
    }

    return res.json(result);
  } catch (err: any) {
    const status = err.statusCode || 500;
    return res.status(status).json({
      error: err.message || 'Component search failed',
      code: err.errorCode || 'SEARCH_ERROR',
      details: err.details,
    });
  }
});

// Helper function to persist component, listings, snapshots, and detect alerts
async function persistComponentAndSnapshots(
  mpn: string,
  manufacturer: string,
  results: SearchResultItem[]
) {
  const normMpn = normalizeMpn(mpn);
  const primaryName = results[0]?.name || mpn;

  return await prisma.$transaction(async (tx) => {
    // Upsert component
    const component = await tx.component.upsert({
      where: {
        manufacturer_mpn: {
          manufacturer,
          mpn,
        },
      },
      update: {
        normalizedMpn: normMpn,
        name: primaryName,
        updatedAt: new Date(),
      },
      create: {
        name: primaryName,
        manufacturer,
        mpn,
        normalizedMpn: normMpn,
      },
    });

    for (const item of results) {
      // Find existing listing
      const existingListing = await tx.supplierListing.findFirst({
        where: {
          componentId: component.id,
          supplierName: item.supplier,
          productUrl: item.productUrl,
        },
        include: {
          snapshots: {
            orderBy: { capturedAt: 'desc' },
            take: 1,
          },
        },
      });

      const listing = await tx.supplierListing.upsert({
        where: {
          componentId_supplierName_productUrl: {
            componentId: component.id,
            supplierName: item.supplier,
            productUrl: item.productUrl,
          },
        },
        update: {
          price: item.price,
          currency: item.currency,
          stockStatus: item.stockStatus,
          stockQuantity: item.stockQuantity,
          leadTime: item.leadTime,
          specifications: JSON.stringify(item.specifications),
          verificationStatus: item.verificationStatus,
          lastCheckedAt: new Date(),
        },
        create: {
          componentId: component.id,
          supplierName: item.supplier,
          productUrl: item.productUrl,
          price: item.price,
          currency: item.currency,
          stockStatus: item.stockStatus,
          stockQuantity: item.stockQuantity,
          leadTime: item.leadTime,
          specifications: JSON.stringify(item.specifications),
          verificationStatus: item.verificationStatus,
          lastCheckedAt: new Date(),
        },
      });

      // Create snapshot
      await tx.snapshot.create({
        data: {
          supplierListingId: listing.id,
          price: item.price,
          currency: item.currency,
          stockStatus: item.stockStatus,
          stockQuantity: item.stockQuantity,
          leadTime: item.leadTime,
          packageQuantity: 1,
        },
      });

      // Detect alerts by comparing previous snapshot
      const previousSnapshot = existingListing?.snapshots?.[0] || null;
      if (previousSnapshot) {
        const detected = detectAlerts({
          componentId: component.id,
          supplierListingId: listing.id,
          componentName: component.name,
          mpn: component.mpn,
          supplierName: listing.supplierName,
          previous: {
            price: previousSnapshot.price,
            currency: previousSnapshot.currency,
            stockStatus: previousSnapshot.stockStatus as StockStatus,
            stockQuantity: previousSnapshot.stockQuantity,
          },
          current: {
            price: item.price,
            currency: item.currency,
            stockStatus: item.stockStatus,
            stockQuantity: item.stockQuantity,
          },
        });

        for (const alert of detected) {
          // Avoid duplicate alerts within the last hour
          const existingRecentAlert = await tx.alert.findFirst({
            where: {
              componentId: component.id,
              supplierListingId: listing.id,
              type: alert.type,
              createdAt: {
                gte: new Date(Date.now() - 60 * 60 * 1000),
              },
            },
          });

          if (!existingRecentAlert) {
            await tx.alert.create({
              data: {
                componentId: component.id,
                supplierListingId: listing.id,
                type: alert.type,
                message: alert.message,
                previousValue: alert.previousValue,
                currentValue: alert.currentValue,
              },
            });
          }
        }
      }
    }

    return component;
  });
}

// GET /api/components - List tracked components with dashboard metrics
componentsRouter.get('/', async (_req: Request, res: Response) => {
  try {
    const components = await prisma.component.findMany({
      orderBy: { updatedAt: 'desc' },
      include: {
        listings: {
          orderBy: { price: 'asc' },
        },
        alerts: {
          where: { readAt: null },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    const enriched = components.map((c) => {
      // Find lowest in-stock price
      const inStockListings = c.listings.filter(
        (l) => l.price !== null && (l.stockStatus === 'IN_STOCK' || l.stockStatus === 'LIMITED_STOCK')
      );
      const lowestListing = inStockListings[0] || c.listings[0] || null;

      // Check stock status summary
      let overallStock: StockStatus = 'UNKNOWN';
      if (c.listings.some((l) => l.stockStatus === 'IN_STOCK')) {
        overallStock = 'IN_STOCK';
      } else if (c.listings.some((l) => l.stockStatus === 'LIMITED_STOCK')) {
        overallStock = 'LIMITED_STOCK';
      } else if (c.listings.some((l) => l.stockStatus === 'OUT_OF_STOCK')) {
        overallStock = 'OUT_OF_STOCK';
      }

      return {
        id: c.id,
        name: c.name,
        manufacturer: c.manufacturer,
        mpn: c.mpn,
        normalizedMpn: c.normalizedMpn,
        description: c.description,
        createdAt: c.createdAt.toISOString(),
        updatedAt: c.updatedAt.toISOString(),
        supplierCount: c.listings.length,
        lowestPrice: lowestListing?.price ?? null,
        currency: lowestListing?.currency ?? 'USD',
        stockStatus: overallStock,
        unreadAlertsCount: c.alerts.length,
        lastCheckedAt: c.listings[0]?.lastCheckedAt?.toISOString() ?? c.updatedAt.toISOString(),
        listings: c.listings,
      };
    });

    // Real database metrics for Dashboard Page
    const totalTracked = components.length;
    const totalListings = await prisma.supplierListing.count();
    const shortageAlertsCount = await prisma.alert.count({
      where: {
        type: { in: ['OUT_OF_STOCK', 'PRICE_INCREASE'] },
      },
    });
    const priceChangesCount = await prisma.alert.count({
      where: {
        type: { in: ['PRICE_INCREASE', 'PRICE_DECREASE'] },
      },
    });

    return res.json({
      components: enriched,
      metrics: {
        trackedComponents: totalTracked,
        totalSupplierListings: totalListings,
        priceChangesCount,
        shortageAlertsCount,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to fetch tracked components', message: err.message });
  }
});

// GET /api/components/:id - Get specific component details
componentsRouter.get('/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;

    const component = await prisma.component.findUnique({
      where: { id },
      include: {
        listings: {
          orderBy: { price: 'asc' },
          include: {
            snapshots: {
              orderBy: { capturedAt: 'desc' },
              take: 20,
            },
          },
        },
        alerts: {
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
      },
    });

    if (!component) {
      return res.status(404).json({ error: 'Component not found' });
    }

    return res.json({ component });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to fetch component', message: err.message });
  }
});

// DELETE /api/components/:id - Remove component from tracking
componentsRouter.delete('/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;

    await prisma.component.delete({
      where: { id },
    });

    return res.json({ success: true, message: 'Component removed from tracking' });
  } catch (err: any) {
    return res.status(404).json({ error: 'Component not found or already deleted', message: err.message });
  }
});

// POST /api/components/:id/refresh - Run a fresh check manually
componentsRouter.post('/:id/refresh', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;

    const component = await prisma.component.findUnique({
      where: { id },
    });

    if (!component) {
      return res.status(404).json({ error: 'Component not found' });
    }

    const searchResponse = await executeSearchPipeline(
      component.mpn,
      component.manufacturer,
      undefined,
      5,
      false
    );

    if (searchResponse.results.length > 0) {
      await persistComponentAndSnapshots(
        component.mpn,
        component.manufacturer,
        searchResponse.results
      );
    }

    const updated = await prisma.component.findUnique({
      where: { id },
      include: {
        listings: {
          orderBy: { price: 'asc' },
        },
        alerts: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    return res.json({
      message: 'Refreshed successfully',
      component: updated,
      searchResponse,
    });
  } catch (err: any) {
    const status = err.statusCode || 500;
    return res.status(status).json({
      error: err.message || 'Refresh failed',
      code: err.errorCode || 'REFRESH_ERROR',
      details: err.details,
    });
  }
});

// GET /api/components/:id/history - Price and Stock History snapshots
componentsRouter.get('/:id/history', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;

    const component = await prisma.component.findUnique({
      where: { id },
      include: {
        listings: {
          include: {
            snapshots: {
              orderBy: { capturedAt: 'asc' },
            },
          },
        },
        alerts: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!component) {
      return res.status(404).json({ error: 'Component not found' });
    }

    // Build timeline points for Recharts
    const historyPoints: any[] = [];
    const allSnapshots: any[] = [];

    for (const listing of (component as any).listings || []) {
      for (const snap of listing.snapshots || []) {
        allSnapshots.push({
          date: snap.capturedAt.toISOString().split('T')[0],
          timestamp: snap.capturedAt.toISOString(),
          supplier: listing.supplierName,
          price: snap.price,
          currency: snap.currency,
          stockStatus: snap.stockStatus,
          stockQuantity: snap.stockQuantity,
        });
      }
    }

    // Sort chronologically
    allSnapshots.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    // Calculate previous vs current lowest price & percentage change
    const validPriceSnapshots = allSnapshots.filter((s) => s.price !== null && s.price > 0);
    const totalSnapshots = allSnapshots.length;

    let currentLowestPrice: number | null = null;
    let previousLowestPrice: number | null = null;
    let percentChange: number | null = null;
    let baseCurrency = 'USD';

    if (validPriceSnapshots.length >= 1) {
      const latest = validPriceSnapshots[validPriceSnapshots.length - 1];
      currentLowestPrice = latest.price;
      baseCurrency = latest.currency;

      if (validPriceSnapshots.length >= 2) {
        const prev = validPriceSnapshots[validPriceSnapshots.length - 2];
        previousLowestPrice = prev.price;

        const changeEval = calculatePriceChange(
          prev.price,
          prev.currency,
          latest.price,
          latest.currency
        );
        if (changeEval.valid) {
          percentChange = changeEval.percentageChange;
        }
      }
    }

    const currentStockStatus = allSnapshots[allSnapshots.length - 1]?.stockStatus || 'UNKNOWN';
    const previousStockStatus = allSnapshots.length >= 2 ? allSnapshots[allSnapshots.length - 2].stockStatus : currentStockStatus;

    return res.json({
      component,
      history: allSnapshots,
      stats: {
        currentLowestPrice,
        currency: baseCurrency,
        previousLowestPrice,
        percentChange,
        currentStockStatus,
        previousStockStatus,
        totalSnapshots,
      },
      alerts: (component as any).alerts || [],
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to fetch component history', message: err.message });
  }
});
