import apiClient from './client';

export const settingsApi = {
  getSettings: () => apiClient.get('/settings'),
  updateSettings: (data) => {
    // If data is FormData (for logo upload), configure multipart header
    const isFormData = data instanceof FormData;
    return apiClient.put('/settings', data, {
      headers: isFormData ? { 'Content-Type': 'multipart/form-data' } : undefined
    });
  }
};

export default settingsApi;
