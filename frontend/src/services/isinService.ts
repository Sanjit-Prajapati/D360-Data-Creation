import api from '@/utils/api';
import {
  IsinMaster,
  IsinMasterFormData,
  IsinImportStats,
  ApiResponse,
} from '@/types';

interface BackendIsin {
  id: string;
  isin: string;
  securityName?: string;
  symbol?: string;
  securityType?: string;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
}

const mapToFrontend = (item: BackendIsin): IsinMaster => ({
  id: item.id,
  isin: item.isin,
  instrument_name: item.securityName || '',
  symbol: item.symbol || '',
  security_type: item.securityType || 'EQUITY',
  status: item.status || 'ACTIVE',
  created_at: item.createdAt ? item.createdAt.replace('T', ' ').substring(0, 19) : '',
  updated_at: item.updatedAt ? item.updatedAt.replace('T', ' ').substring(0, 19) : '',
});

const mapToBackend = (data: Partial<IsinMasterFormData>) => {
  const result: Record<string, string> = {};
  if (data.isin !== undefined) result.isin = data.isin;
  if (data.instrument_name !== undefined) result.securityName = data.instrument_name;
  if (data.symbol !== undefined) result.symbol = data.symbol;
  if (data.security_type !== undefined) result.securityType = data.security_type;
  if (data.status !== undefined) result.status = data.status;
  return result;
};

export const isinService = {
  getAll: async (filters?: Record<string, string>): Promise<IsinMaster[]> => {
    const backendParams: Record<string, string | number> = {
      page: 0,
      size: 100000, // Restored to 100000 since backend performance issues are fixed
    };
    if (filters) {
      if (filters.search) backendParams.search = filters.search;
      if (filters.security_type && filters.security_type !== 'ALL') {
        backendParams.securityType = filters.security_type;
      }
    }
    const response = await api.get<ApiResponse<BackendIsin[]>>('/v1/config/isins', {
      params: backendParams,
    });
    return (response.data.data || []).map(mapToFrontend);
  },

  getById: async (id: string): Promise<IsinMaster> => {
    const response = await api.get<ApiResponse<BackendIsin>>(`/v1/config/isins/${id}`);
    return mapToFrontend(response.data.data);
  },

  create: async (data: IsinMasterFormData): Promise<IsinMaster> => {
    const backendPayload = mapToBackend(data);
    const response = await api.post<ApiResponse<BackendIsin>>('/v1/config/isins', backendPayload);
    return mapToFrontend(response.data.data);
  },

  update: async (id: string, data: Partial<IsinMasterFormData>): Promise<IsinMaster> => {
    const backendPayload = mapToBackend(data);
    const response = await api.put<ApiResponse<BackendIsin>>(`/v1/config/isins/${id}`, backendPayload);
    return mapToFrontend(response.data.data);
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/v1/config/isins/${id}`);
  },

  exportData: async (filters?: Record<string, string>): Promise<Blob> => {
    const backendParams: Record<string, string> = {};
    if (filters) {
      if (filters.search) backendParams.search = filters.search; // Fixed bug: was assigning to itself
      if (filters.security_type && filters.security_type !== 'ALL') {
        backendParams.securityType = filters.security_type;
      }
    }
    const response = await api.get('/v1/config/isins/export', {
      params: backendParams,
      responseType: 'blob',
    });
    return response.data;
  },

  importCsv: async (file: File): Promise<IsinImportStats> => {
    // Client-side security: extension check
    if (!file.name.toLowerCase().endsWith('.csv')) {
      throw new Error('Only CSV files (.csv) are allowed for import.');
    }
    // Client-side security: file size limit (50 MB)
    const MAX_SIZE_BYTES = 50 * 1024 * 1024;
    if (file.size > MAX_SIZE_BYTES) {
      throw new Error(`File is too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Maximum allowed size is 50 MB.`);
    }
    // Client-side security: empty file check
    if (file.size === 0) {
      throw new Error('The selected file is empty. Please choose a valid CSV file.');
    }

    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post<ApiResponse<IsinImportStats>>(
      '/v1/config/isins/import',
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    );
    return response.data.data;
  },
};
