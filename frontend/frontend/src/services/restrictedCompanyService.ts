import api from '@/utils/api';

export interface RestrictedCompanyRecord {
  id?: string;
  isin: string;
  instrumentName: string;
  securityType: string;
  restrictionLevel: string;
  restrictedFor?: string;
  reasonOfRestriction: string;
  remark?: string;
  startDate: string;
  endDate: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateRestrictedCompanyRequest {
  isin: string;
  instrumentName: string;
  securityType: string;
  restrictionLevel: string;
  restrictedFor?: string;
  reasonOfRestriction: string;
  remark?: string;
  startDate: string;
  endDate: string;
}

export const restrictedCompanyService = {
  // Get all restricted companies
  getAll: async (): Promise<RestrictedCompanyRecord[]> => {
    const response = await api.get('/v1/restricted-companies');
    return response.data.data;
  },

  // Get restricted company by ID
  getById: async (id: string): Promise<RestrictedCompanyRecord> => {
    const response = await api.get(`/v1/restricted-companies/${id}`);
    return response.data.data;
  },

  // Create restricted company
  create: async (data: CreateRestrictedCompanyRequest): Promise<RestrictedCompanyRecord> => {
    const response = await api.post('/v1/restricted-companies', data);
    return response.data.data;
  },

  // Update restricted company
  update: async (id: string, data: Partial<RestrictedCompanyRecord>): Promise<RestrictedCompanyRecord> => {
    const response = await api.put(`/v1/restricted-companies/${id}`, data);
    return response.data.data;
  },

  // Delete restricted company
  delete: async (id: string): Promise<void> => {
    await api.delete(`/v1/restricted-companies/${id}`);
  },

  // Bulk create restricted companies
  bulkCreate: async (data: CreateRestrictedCompanyRequest[]): Promise<RestrictedCompanyRecord[]> => {
    const response = await api.post('/v1/restricted-companies/bulk', { restrictions: data });
    return response.data.data;
  },

  // Export to CSV
  exportToCsv: async (filters?: any): Promise<Blob> => {
    const response = await api.post('/v1/restricted-companies/export', filters, {
      responseType: 'blob',
    });
    return response.data;
  },
};
