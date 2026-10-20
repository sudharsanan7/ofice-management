import apiClient from './client';

const notificationsApi = {
  getNotifications: (params) => apiClient.get('/notifications', { params }),
  markRead: (id) => apiClient.patch(`/notifications/${id}/read`),
  markAllRead: () => apiClient.patch('/notifications/read-all')
};

export default notificationsApi;
