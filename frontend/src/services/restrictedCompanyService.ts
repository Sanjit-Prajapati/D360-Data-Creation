import api from '@/utils/api';
import { 
  RestrictedCompanyRecord, 
  CreateRestrictedCompanyRequest,
  ApiResponse 
} from '@/types';

export const restrictedCompanyService = {
  // Get all restricted companies
  getAll: async (): Promise<RestrictedCompanyRecord[]> => {
    const response = await api.get<ApiResponse<RestrictedCompanyRecord[]>>('/v1/restricted-companies');
    return response.data.data || [];
  },

  // Get restricted company by ID
  getById: async (id: string): Promise<RestrictedCompanyRecord> => {
    const response = await api.get<ApiResponse<RestrictedCompanyRecord>>(`/v1/restricted-companies/${id}`);
    return response.data.data;
  },

  // Create restricted company
  create: async (data: CreateRestrictedCompanyRequest): Promise<RestrictedCompanyRecord> => {
    const response = await api.post<ApiResponse<RestrictedCompanyRecord>>('/v1/restricted-companies', data);
    return response.data.data;
  },

  // Update restricted company
  update: async (id: string, data: Partial<RestrictedCompanyRecord>): Promise<RestrictedCompanyRecord> => {
    const response = await api.put<ApiResponse<RestrictedCompanyRecord>>(`/v1/restricted-companies/${id}`, data);
    return response.data.data;
  },

  // Delete restricted company
  delete: async (id: string): Promise<void> => {
    await api.delete(`/v1/restricted-companies/${id}`);
  },

  // Bulk create restricted companies
  bulkCreate: async (data: CreateRestrictedCompanyRequest[]): Promise<RestrictedCompanyRecord[]> => {
    const response = await api.post<ApiResponse<RestrictedCompanyRecord[]>>('/v1/restricted-companies/bulk', { restrictions: data });
    return response.data.data || [];
  },

  // Export to CSV
  exportToCsv: async (filters?: Record<string, string>): Promise<Blob> => {
    const response = await api.post('/v1/restricted-companies/export', filters, {
      responseType: 'blob',
    });
    return response.data;
  },
};
