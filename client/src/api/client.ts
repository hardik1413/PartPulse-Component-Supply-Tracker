import {
  SearchComponentRequest,
  SearchComponentResponse,
  ComponentData,
  AlertData,
  BomData,
  ComponentHistoryResponse,
} from '../../../shared/types';

const API_BASE = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL.replace(/\/$/, '')}/api`
  : '/api';

export class ApiError extends Error {
  public statusCode: number;
  public code?: string;

  constructor(message: string, statusCode: number, code?: string) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.code = code;
  }
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  const response = await fetch(url, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new ApiError(
      data.error || data.message || `Request failed with status ${response.status}`,
      response.status,
      data.code
    );
  }

  return data as T;
}

export const api = {
  // Health
  checkHealth: () => request<{ status: string; services: Record<string, string> }>('/health'),

  // Search
  searchComponents: (params: SearchComponentRequest) =>
    request<SearchComponentResponse>('/components/search', {
      method: 'POST',
      body: JSON.stringify(params),
    }),

  // Tracked Components
  getComponents: () =>
    request<{
      components: (ComponentData & {
        supplierCount: number;
        lowestPrice: number | null;
        currency: string;
        stockStatus: string;
        unreadAlertsCount: number;
        lastCheckedAt: string;
      })[];
      metrics: {
        trackedComponents: number;
        totalSupplierListings: number;
        priceChangesCount: number;
        shortageAlertsCount: number;
      };
    }>('/components'),

  getComponent: (id: string) =>
    request<{ component: ComponentData & { listings: any[]; alerts: any[] } }>(`/components/${id}`),

  deleteComponent: (id: string) =>
    request<{ success: boolean; message: string }>(`/components/${id}`, {
      method: 'DELETE',
    }),

  refreshComponent: (id: string) =>
    request<{ message: string; component: any; searchResponse: SearchComponentResponse }>(
      `/components/${id}/refresh`,
      { method: 'POST' }
    ),

  getComponentHistory: (id: string) => request<ComponentHistoryResponse>(`/components/${id}/history`),

  // Alerts
  getAlerts: (unreadOnly = false) =>
    request<{ alerts: AlertData[]; unreadCount: number }>(`/alerts${unreadOnly ? '?unreadOnly=true' : ''}`),

  markAlertRead: (id: string) =>
    request<{ alert: AlertData }>(`/alerts/${id}/read`, {
      method: 'PATCH',
    }),

  markAllAlertsRead: () =>
    request<{ success: boolean; updatedCount: number }>('/alerts/read-all', {
      method: 'PATCH',
    }),

  // BOM
  getBoms: () => request<{ boms: BomData[] }>('/boms'),

  createBom: (name: string, description?: string) =>
    request<{ bom: BomData }>('/boms', {
      method: 'POST',
      body: JSON.stringify({ name, description }),
    }),

  getBom: (id: string) => request<{ bom: BomData }>(`/boms/${id}`),

  addBomItem: (bomId: string, componentId: string, requiredQuantity: number) =>
    request<{ item: any }>(`/boms/${bomId}/items`, {
      method: 'POST',
      body: JSON.stringify({ componentId, requiredQuantity }),
    }),

  removeBomItem: (bomId: string, itemId: string) =>
    request<{ success: boolean; message: string }>(`/boms/${bomId}/items/${itemId}`, {
      method: 'DELETE',
    }),
};
