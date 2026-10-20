import apiClient from './client';

const expensesApi = {
  getExpenses: (params) => apiClient.get('/expenses', { params }),
  createExpense: (data) => apiClient.post('/expenses', data, { headers: { 'Content-Type': 'multipart/form-data' } }),
  updateExpense: (id, data) => apiClient.put(`/expenses/${id}`, data, { headers: { 'Content-Type': 'multipart/form-data' } }),
  deleteExpense: (id) => apiClient.delete(`/expenses/${id}`),
  downloadReceipt: (id) => apiClient.get(`/expenses/${id}/receipt`, { responseType: 'blob' })
};

export default expensesApi;
