export type StockStatus = 'IN_STOCK' | 'OUT_OF_STOCK' | 'LIMITED_STOCK' | 'BACKORDER' | 'UNKNOWN';

export type VerificationStatus = 'VERIFIED' | 'UNVERIFIED' | 'POTENTIAL_MATCH' | 'NEEDS_VERIFICATION';

export type AlertType = 'PRICE_INCREASE' | 'PRICE_DECREASE' | 'OUT_OF_STOCK' | 'IN_STOCK' | 'AVAILABILITY_CHANGE';

export interface ComponentSpecs {
  voltage?: string;
  current?: string;
  interface?: string;
  package?: string;
  operatingTemp?: string;
  mountingType?: string;
  pinCount?: number | string;
  dimensions?: string;
  [key: string]: any;
}

export interface SupplierListingData {
  id?: string;
  componentId?: string;
  supplierName: string;
  productUrl: string;
  price: number | null;
  currency: string;
  stockStatus: StockStatus;
  stockQuantity: number | null;
  leadTime: string | null;
  packageQuantity?: number;
  specifications: ComponentSpecs;
  verificationStatus: VerificationStatus;
  lastCheckedAt: string;
}

export interface ComponentData {
  id: string;
  name: string;
  manufacturer: string;
  mpn: string;
  normalizedMpn: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
  listings?: SupplierListingData[];
  alerts?: AlertData[];
}

export interface SnapshotData {
  id: string;
  supplierListingId: string;
  price: number | null;
  currency: string;
  stockStatus: StockStatus;
  stockQuantity: number | null;
  leadTime: string | null;
  packageQuantity: number;
  capturedAt: string;
}

export interface AlertData {
  id: string;
  componentId: string;
  supplierListingId: string | null;
  type: AlertType;
  message: string;
  previousValue: string | null;
  currentValue: string | null;
  readAt: string | null;
  createdAt: string;
  component?: {
    id: string;
    name: string;
    mpn: string;
    manufacturer: string;
  };
}

export interface BomItemData {
  id: string;
  bomId: string;
  componentId: string;
  requiredQuantity: number;
  createdAt: string;
  updatedAt: string;
  component?: ComponentData;
  bestListing?: SupplierListingData | null;
  estimatedCost?: number | null;
}

export interface BomData {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
  items: BomItemData[];
  totalEstimatedCost: number;
  unresolvedCount: number;
}

export interface SearchComponentRequest {
  query: string;
  manufacturer?: string;
  technicalRequirement?: string;
  maxSuppliers?: number;
  saveToDatabase?: boolean;
  useAgentFallback?: boolean;
}

export interface SearchResultItem {
  supplier: string;
  name: string;
  mpn: string;
  manufacturer: string;
  price: number | null;
  currency: string;
  stockStatus: StockStatus;
  stockQuantity: number | null;
  leadTime: string | null;
  productUrl: string;
  specifications: ComponentSpecs;
  verificationStatus: VerificationStatus;
  isLowestPrice?: boolean;
  comparable: boolean;
  incomparabilityReason?: string;
  substituteCandidate?: boolean;
}

export interface SearchComponentResponse {
  query: string;
  searchedMpn: string;
  normalizedMpn: string;
  results: SearchResultItem[];
  substitutes: SearchResultItem[];
  componentId?: string;
  snapshotTimestamp: string;
  totalFound: number;
  tinyFishMethodUsed: 'SEARCH_AND_FETCH' | 'AGENT_FALLBACK';
  executionTimeMs: number;
  errors?: string[];
}

export interface PriceHistoryPoint {
  date: string;
  timestamp: string;
  supplier: string;
  price: number | null;
  currency: string;
  stockStatus: StockStatus;
  stockQuantity: number | null;
}

export interface ComponentHistoryResponse {
  component: ComponentData;
  history: PriceHistoryPoint[];
  stats: {
    currentLowestPrice: number | null;
    currency: string;
    previousLowestPrice: number | null;
    percentChange: number | null;
    currentStockStatus: StockStatus;
    previousStockStatus: StockStatus;
    totalSnapshots: number;
  };
  alerts: AlertData[];
}
