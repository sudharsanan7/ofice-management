import apiClient from './client';

export const clientsApi = {
  getClients: (params) => apiClient.get('/clients', { params }),
  getClientDetails: (id) => apiClient.get(`/clients/${id}`),
  createClient: (data) => apiClient.post('/clients', data),
  updateClient: (id, data) => apiClient.put(`/clients/${id}`, data),
  setClientStatus: (id, status) => apiClient.patch(`/clients/${id}/status`, { status }),
  deleteClient: (id) => apiClient.delete(`/clients/${id}`),
  getClientActivity: (id) => apiClient.get(`/clients/${id}/activity`),
};

export default clientsApi;
