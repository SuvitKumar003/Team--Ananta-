import axios from 'axios';

const API_BASE_URL = 'http://localhost:5000/api';

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// API functions
export const logAPI = {
  // Get log statistics
  getStats: async () => {
    const response = await api.get('/logs/stats');
    return response.data;
  },

  // Get logs with filters
  getLogs: async (params = {}) => {
    const response = await api.get('/logs', { params });
    return response.data;
  },
   getLogsTimeSeries: async (hours = 12) => {
    const endTime = new Date();
    const startTime = new Date(endTime.getTime() - (hours * 60 * 60 * 1000));
    
    const response = await api.get('/logs', {
      params: {
        startDate: startTime.toISOString(),
        endDate: endTime.toISOString(),
        limit: 10000, // pull enough logs for analysis
      }
    });
    return response.data;
  },

  // === AI Logs APIs ===
  getAILogs: async (params = {}) => {
    const response = await api.get('/ailogs', { params });
    return response.data;
  },

  getAnomalies: async () => {
    const response = await api.get('/ailogs/anomalies');
    return response.data;
  },

  getClusters: async () => {
    const response = await api.get('/ailogs/clusters');
    return response.data;
  },

  getClusterExplanation: async (clusterLabel) => {
    const response = await api.get(`/ailogs/explain/${clusterLabel}`);
    return response.data;
  },

  // Get queue stats
  getQueueStats: async () => {
    const response = await api.get('/logs/queue/stats');
    return response.data;
  },
};

// === Smart Alerts APIs ===
export const alertAPI = {
  // Get all alerts (last 24 hours by default)
  getAlerts: async (hours = 24, limit = 100) => {
    const response = await api.get('/alerts', {
      params: { hours, limit }
    });
    return response.data;
  },

  // Get only active alerts
  getActiveAlerts: async (hours = 24) => {
    const response = await api.get('/alerts/active', {
      params: { hours }
    });
    return response.data;
  },

  // Get alert statistics
  getAlertStats: async (hours = 24) => {
    const response = await api.get('/alerts/stats', {
      params: { hours }
    });
    return response.data;
  },

  // Manually trigger alert evaluation
  evaluateAlerts: async () => {
    const response = await api.post('/alerts/evaluate');
    return response.data;
  },

  // Acknowledge an alert
  acknowledgeAlert: async (alertId) => {
    const response = await api.post(`/alerts/${alertId}/acknowledge`);
    return response.data;
  },

  // Resolve an alert
  resolveAlert: async (alertId) => {
    const response = await api.post(`/alerts/${alertId}/resolve`);
    return response.data;
  },

  // Get alerts by type
  getAlertsByType: async (type, hours = 24) => {
    const response = await api.get(`/alerts/type/${type}`, {
      params: { hours }
    });
    return response.data;
  },
};

export default api;
