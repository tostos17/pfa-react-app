import axios from 'axios';

// Vite reads the .env file variable here. Fallback defaults to localhost if undefined.
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api/v1';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Automatically inject Bearer Token into requests
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('pfa_token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Intercept global response failures (e.g., 401 Unauthorized)
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('pfa_token');
      localStorage.removeItem('pfa_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);