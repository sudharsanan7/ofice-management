import apiClient from './client';

const BASE = '/quotations';

const quotationsApi = {
  getQuotations: (params) => apiClient.get(BASE, { params }),
  getQuotationById: (id) => apiClient.get(`${BASE}/${id}`),
  createQuotation: (data) => apiClient.post(BASE, data),
  updateQuotation: (id, data) => apiClient.put(`${BASE}/${id}`, data),
  updateStatus: (id, status) =>
    apiClient.patch(`${BASE}/${id}/status`, { status }),
  deleteQuotation: (id) => apiClient.delete(`${BASE}/${id}`),
  duplicateQuotation: (id) => apiClient.post(`${BASE}/${id}/duplicate`),
  getSummary: () => apiClient.get(`${BASE}/stats/summary`),
  sendEmail: (id, data = {}) => apiClient.post(`${BASE}/${id}/send`, data),
  downloadPDF: (id) => apiClient.get(`${BASE}/${id}/pdf`, { responseType: 'blob' }),
};

export default quotationsApi;
