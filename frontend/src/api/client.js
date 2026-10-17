import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// Request Interceptor: Attach JWT Token if present
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('officeflow_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Standardize error handling
apiClient.interceptors.response.use(
  (response) => {
    // Return standard data payload
    return response.data;
  },
  (error) => {
    const errorData = error.response?.data || {
      success: false,
      message: error.message || 'Network error occurred',
      data: null,
      errors: null,
    };

    // If 401 Unauthorized, notify or clear session if needed
    if (error.response?.status === 401) {
      // Clear token if expired or invalid
      if (window.location.pathname !== '/login') {
        localStorage.removeItem('officeflow_token');
        localStorage.removeItem('officeflow_user');
      }
    }

    return Promise.reject(errorData);
  }
);

export default apiClient;
