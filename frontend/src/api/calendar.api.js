import apiClient from './client';

const calendarApi = {
  getEvents: (params) => apiClient.get('/events', { params }),
  getAssignees: () => apiClient.get('/events/assignees'),
  createEvent: (data) => apiClient.post('/events', data),
  updateEvent: (id, data) => apiClient.put(`/events/${id}`, data),
  deleteEvent: (id) => apiClient.delete(`/events/${id}`)
};

export default calendarApi;
