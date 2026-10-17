import apiClient from './client';

/**
 * User Management & Profile API endpoints
 */
export const usersApi = {
  // Admin-only endpoints
  getUsers: (params) => apiClient.get('/users', { params }),
  getUserById: (id) => apiClient.get(`/users/${id}`),
  createUser: (data) => apiClient.post('/users', data),
  updateUser: (id, data) => apiClient.put(`/users/${id}`, data),
  updateUserStatus: (id, status) => apiClient.patch(`/users/${id}/status`, { status }),

  // Current User profile endpoints
  getProfile: () => apiClient.get('/users/me'),
  updateProfile: (data) => apiClient.patch('/users/me', data),
  updatePassword: (data) => apiClient.patch('/users/me/password', data),
};

export default usersApi;
