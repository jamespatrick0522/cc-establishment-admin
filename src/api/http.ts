import axios from 'axios';

const baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1';

export const http = axios.create({
  baseURL,
  timeout: 15000,
});

http.interceptors.request.use((config) => {
  const token = localStorage.getItem('establishment_access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});
