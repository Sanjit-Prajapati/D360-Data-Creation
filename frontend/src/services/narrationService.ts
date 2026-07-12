import api from '@/utils/api';
import {
  NarrationRecord,
  NarrationRecordFormData,
  ApiResponse,
} from '@/types';

interface BackendNarration {
  id: string;
  fipId?: string;
  narrationRegex?: string;
  transactionType?: string;
  transactionCategory?: string;
  direction?: string;
  createdAt?: string;
  updatedAt?: string;
}

// ─── Translation Helpers ────────────────────────────────────────────────────────

const mapToFrontend = (item: BackendNarration): NarrationRecord => ({
  id: item.id,
  fip_id: item.fipId || '',
  narration_regex: item.narrationRegex || '',
  // Store the raw backend enum value — display label is computed at render time
  transaction_type: item.transactionType || '',
  transaction_group: item.transactionCategory || '',
  direction: item.direction || 'CREDIT',
  created_at: item.createdAt ? item.createdAt.replace('T', ' ').substring(0, 19) : '',
  updated_at: item.updatedAt ? item.updatedAt.replace('T', ' ').substring(0, 19) : '',
});

const mapToBackend = (data: Partial<NarrationRecordFormData>) => {
  const result: Record<string, string> = {};
  if (data.fip_id !== undefined) result.fipId = data.fip_id;
  if (data.narration_regex !== undefined) result.narrationRegex = data.narration_regex;
  // Values are already backend enum strings (e.g. "BUY", "MARKET") — send directly
  if (data.transaction_type !== undefined) result.transactionType = data.transaction_type;
  if (data.transaction_group !== undefined) result.transactionCategory = data.transaction_group;
  if (data.direction !== undefined) result.direction = data.direction;
  return result;
};

// ─── Service Exports ────────────────────────────────────────────────────────────

export const narrationService = {
  getAll: async (filters?: Record<string, string>): Promise<NarrationRecord[]> => {
    const backendParams: Record<string, string | number> = {
      page: 0,
      size: 100000,
    };
    if (filters) {
      if (filters.search) backendParams.search = filters.search;
      if (filters.fip_id && filters.fip_id !== 'ALL') {
        backendParams.fipId = filters.fip_id;
      }
      if (filters.transaction_type && filters.transaction_type !== 'ALL') {
        backendParams.transactionType = filters.transaction_type;
      }
      if (filters.transaction_group && filters.transaction_group !== 'ALL') {
        backendParams.transactionCategory = filters.transaction_group;
      }
    }
    const response = await api.get<ApiResponse<BackendNarration[]>>('/v1/config/narrations', {
      params: backendParams,
    });
    return (response.data.data || []).map(mapToFrontend);
  },

  getById: async (id: string): Promise<NarrationRecord> => {
    const response = await api.get<ApiResponse<BackendNarration>>(`/v1/config/narrations/${id}`);
    return mapToFrontend(response.data.data);
  },

  create: async (data: NarrationRecordFormData & { fipIds: string[] }): Promise<NarrationRecord[]> => {
    const backendPayload: Record<string, string | string[]> = {
      fipIds: data.fipIds,
      transactionType: data.transaction_type,
      transactionCategory: data.transaction_group,
      narrationRegex: data.narration_regex,
      direction: data.direction,
    };
    const response = await api.post<ApiResponse<BackendNarration[]>>('/v1/config/narrations', backendPayload);
    return (response.data.data || []).map(mapToFrontend);
  },

  update: async (id: string, data: Partial<NarrationRecordFormData>): Promise<NarrationRecord> => {
    const backendPayload = mapToBackend(data);
    const response = await api.put<ApiResponse<BackendNarration>>(`/v1/config/narrations/${id}`, backendPayload);
    return mapToFrontend(response.data.data);
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/v1/config/narrations/${id}`);
  },

  getNarrationOptions: async (fipId: string, transactionType: string): Promise<NarrationRecord[]> => {
    const response = await api.get<ApiResponse<BackendNarration[]>>('/v1/config/narrations/options', {
      params: {
        fipId,
        transactionType,
      },
    });
    return (response.data.data || []).map(mapToFrontend);
  },

  // ─── Enum Metadata Endpoints ──────────────────────────────────────────────

  getTransactionTypes: async (): Promise<{ value: string; label: string }[]> => {
    const response = await api.get<ApiResponse<{ value: string; label: string }[]>>('/v1/config/narrations/transaction-types');
    return response.data.data || [];
  },

  getTransactionCategories: async (): Promise<{ value: string; label: string }[]> => {
    const response = await api.get<ApiResponse<{ value: string; label: string }[]>>('/v1/config/narrations/transaction-categories');
    return response.data.data || [];
  },

  getFipIds: async (): Promise<{ value: string; label: string }[]> => {
    const response = await api.get<ApiResponse<{ value: string; label: string }[]>>('/v1/config/narrations/fip-ids');
    return response.data.data || [];
  },
};
