import apiClient from './client';

const paymentsApi = {
  getPayments: (params) => apiClient.get('/payments', { params }),
  createPayment: (data) => apiClient.post('/payments', data),
  deletePayment: (id) => apiClient.delete(`/payments/${id}`)
};

export default paymentsApi;
