import apiClient from './client';

const invoicesApi = {
  getInvoices: (params) => apiClient.get('/invoices', { params }),
  getInvoice: (id) => apiClient.get(`/invoices/${id}`),
  createInvoice: (data) => apiClient.post('/invoices', data),
  updateInvoice: (id, data) => apiClient.put(`/invoices/${id}`, data),
  convertQuotation: (id, data = {}) => apiClient.post(`/invoices/from-quotation/${id}`, data),
  sendEmail: (id, data) => apiClient.post(`/invoices/${id}/send`, data),
  downloadPDF: (id) => apiClient.get(`/invoices/${id}/pdf`, { responseType: 'blob' }),
  deleteInvoice: (id) => apiClient.delete(`/invoices/${id}`)
};

export default invoicesApi;
