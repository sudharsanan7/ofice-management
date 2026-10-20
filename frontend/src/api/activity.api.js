import apiClient from './client';

const activityApi = {
  getLogs: (params) => apiClient.get('/logs', { params })
};

export default activityApi;
