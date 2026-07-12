import api from '@/utils/api';
import { 
  TransactionRecord, 
  CreateTransactionRequest,
  ApiResponse,
  NarrationOption
} from '@/types';

export const transactionService = {
  // Get all transactions
  getAll: async (): Promise<TransactionRecord[]> => {
    const response = await api.get<ApiResponse<TransactionRecord[]>>('/v1/transactions');
    return response.data.data || [];
  },

  // Get transaction by ID
  getById: async (id: string): Promise<TransactionRecord> => {
    const response = await api.get<ApiResponse<TransactionRecord>>(`/v1/transactions/${id}`);
    return response.data.data;
  },

  // Create transactions
  create: async (request: CreateTransactionRequest): Promise<TransactionRecord[]> => {
    const response = await api.post<ApiResponse<TransactionRecord[]>>('/v1/transactions', request);
    return response.data.data || [];
  },

  // Update transaction
  update: async (id: string, data: Partial<TransactionRecord>): Promise<TransactionRecord> => {
    const response = await api.put<ApiResponse<TransactionRecord>>(`/v1/transactions/${id}`, data);
    return response.data.data;
  },

  // Delete transaction
  delete: async (id: string): Promise<void> => {
    await api.delete(`/v1/transactions/${id}`);
  },

  // Get narration options for specific FIP and transaction type
  getNarrationOptions: async (fipId: string, transactionType: string): Promise<NarrationOption[]> => {
    const response = await api.get<ApiResponse<NarrationOption[]>>('/v1/config/narrations/options', {
      params: { fipId, transactionType }
    });
    return response.data.data || [];
  },

  // Validate duplicate transaction
  validateDuplicate: async (data: {
    isin: string;
    fipId: string;
    transactionType: string;
    settlementId: string;
    quantity: number;
  }): Promise<{ isDuplicate: boolean; message?: string }> => {
    const response = await api.post<ApiResponse<{ isDuplicate: boolean; message?: string }>>('/v1/transactions/validate-duplicate', data);
    return response.data.data;
  },

  // Save as draft
  saveDraft: async (request: CreateTransactionRequest): Promise<{ draftId: string }> => {
    const response = await api.post<ApiResponse<{ draftId: string }>>('/v1/transactions/draft', request);
    return response.data.data;
  },

  // Get drafts
  // Note: unknown is used as Draft types are not in types index yet
  getDrafts: async (): Promise<unknown[]> => {
    const response = await api.get<ApiResponse<unknown[]>>('/v1/transactions/drafts');
    return response.data.data || [];
  },

  // Export transactions
  exportToCsv: async (filters?: Record<string, string>): Promise<Blob> => {
    const response = await api.post('/v1/transactions/export', filters, {
      responseType: 'blob',
    });
    return response.data;
  },
};