import axios from 'axios';

const API_URL = import.meta.env.DEV ? 'http://localhost:4000/api' : '/api';

export const api = {
  getBots: () => axios.get(`${API_URL}/bots`),
  getBot: (id: string) => axios.get(`${API_URL}/bots/${id}`),
  createBot: (data: any) => axios.post(`${API_URL}/bots`, data),
  updateBot: (id: string, data: any) => axios.patch(`${API_URL}/bots/${id}`, data),
  deleteBot: (id: string) => axios.delete(`${API_URL}/bots/${id}`),
  getTrades: (botId: string) => axios.get(`${API_URL}/trades/${botId}`),
  getBalanceSnapshots: (botId: string) => axios.get(`${API_URL}/balance-snapshots/${botId}`),
  getPriceSnapshots: (botId: string, limit?: number) => 
    axios.get(`${API_URL}/price-snapshots/${botId}?limit=${limit || 100}`),
  getAdvisor: (botId: string) => axios.get(`${API_URL}/advisor/${botId}`),

  // ─── NEW ENDPOINTS ────────────────────────────────────────────────
  login: (password: string) => axios.post(`${API_URL}/auth/login`, { password }),
  getStatus: (botId: string) => axios.get(`${API_URL}/bots/${botId}/status`),
  getStats: (botId: string) => axios.get(`${API_URL}/bots/${botId}/stats`),

  // ─── AUTH HELPERS ──────────────────────────────────────────────────
  setAuthToken: (token: string | null) => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      delete axios.defaults.headers.common['Authorization'];
    }
  },
};