import apiClient from './client';

const reportsApi = {
  getSummary: (params) => apiClient.get('/reports', { params }),
  export: (params) => apiClient.get('/reports/export', { params, responseType: 'blob' })
};

export default reportsApi;
