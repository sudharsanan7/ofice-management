import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? '/api' : 'http://localhost:5000/api');
let refreshPromise;

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
  async (error) => {
    const errorData = error.response?.data || {
      success: false,
      message: error.message || 'Network error occurred',
      data: null,
      errors: null,
    };
    if (error.response?.status) errorData.status = error.response.status;

    const originalRequest = error.config;
    const authPath = originalRequest?.url || '';
    if (error.response?.status === 401 && originalRequest && !originalRequest._retry &&
        !authPath.includes('/auth/login') && !authPath.includes('/auth/refresh') &&
        !authPath.includes('/auth/logout')) {
      originalRequest._retry = true;
      try {
        if (!refreshPromise) {
          refreshPromise = axios.post(`${API_BASE_URL}/auth/refresh`, {}, { withCredentials: true })
            .then((refreshed) => {
              const session = refreshed.data?.data;
              if (!session?.token || !session?.user) throw new Error('Refresh response did not contain a session.');
              localStorage.setItem('officeflow_token', session.token);
              localStorage.setItem('officeflow_user', JSON.stringify(session.user));
              return session.token;
            })
            .finally(() => { refreshPromise = null; });
        }
        const token = await refreshPromise;
        originalRequest.headers.Authorization = `Bearer ${token}`;
        return apiClient(originalRequest);
      } catch (_refreshError) {
        localStorage.removeItem('officeflow_token');
        localStorage.removeItem('officeflow_user');
        if (window.location.pathname !== '/login') window.location.assign('/login');
      }
    }
    return Promise.reject(errorData);
  }
);

export default apiClient;
