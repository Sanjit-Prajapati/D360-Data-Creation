import api from '@/utils/api';

export interface TransactionRecord {
  id?: string;
  isin: string;
  transactionDate: string;
  fipId: string;
  transactionType: string;
  narration: string;
  settlementId: string;
  quantity: number;
  rate: number;
  amount: number;
  dynamicFields?: Record<string, string>;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateTransactionRequest {
  securities: {
    isin: string;
    transactions: Omit<TransactionRecord, 'id' | 'isin' | 'createdAt' | 'updatedAt'>[];
  }[];
}

export const transactionService = {
  // Get all transactions
  getAll: async (): Promise<TransactionRecord[]> => {
    const response = await api.get('/v1/transactions');
    return response.data.data;
  },

  // Get transaction by ID
  getById: async (id: string): Promise<TransactionRecord> => {
    const response = await api.get(`/v1/transactions/${id}`);
    return response.data.data;
  },

  // Create transactions
  create: async (request: CreateTransactionRequest): Promise<TransactionRecord[]> => {
    const response = await api.post('/v1/transactions', request);
    return response.data.data;
  },

  // Update transaction
  update: async (id: string, data: Partial<TransactionRecord>): Promise<TransactionRecord> => {
    const response = await api.put(`/v1/transactions/${id}`, data);
    return response.data.data;
  },

  // Delete transaction
  delete: async (id: string): Promise<void> => {
    await api.delete(`/v1/transactions/${id}`);
  },

  // Get narration options for specific FIP and transaction type
  getNarrationOptions: async (fipId: string, transactionType: string) => {
    const response = await api.get('/v1/config/narrations/options', {
      params: { fipId, transactionType }
    });
    return response.data.data;
  },

  // Validate duplicate transaction
  validateDuplicate: async (data: {
    isin: string;
    fipId: string;
    transactionType: string;
    settlementId: string;
    quantity: number;
  }): Promise<{ isDuplicate: boolean; message?: string }> => {
    const response = await api.post('/v1/transactions/validate-duplicate', data);
    return response.data.data;
  },

  // Save as draft
  saveDraft: async (request: CreateTransactionRequest): Promise<{ draftId: string }> => {
    const response = await api.post('/v1/transactions/draft', request);
    return response.data.data;
  },

  // Get drafts
  getDrafts: async (): Promise<any[]> => {
    const response = await api.get('/v1/transactions/drafts');
    return response.data.data;
  },

  // Export transactions
  exportToCsv: async (filters?: any): Promise<Blob> => {
    const response = await api.post('/v1/transactions/export', filters, {
      responseType: 'blob',
    });
    return response.data;
  },
};

// Helper function to format enum labels
export const formatEnumLabel = (enumValue: string): string => {
  return enumValue
    .split('_')
    .map(word => word.charAt(0) + word.slice(1).toLowerCase())
    .join(' ');
};