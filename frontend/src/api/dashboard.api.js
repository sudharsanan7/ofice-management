import apiClient from './client';

const dashboardApi = {
  getSummary: () => apiClient.get('/dashboard')
};

export default dashboardApi;
