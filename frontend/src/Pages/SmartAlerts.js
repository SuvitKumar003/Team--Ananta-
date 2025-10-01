// frontend/src/Pages/SmartAlerts.js
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './SmartAlerts.css';

const API_BASE = 'http://localhost:5000/api';

const SmartAlerts = () => {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [evaluating, setEvaluating] = useState(false);

  useEffect(() => {
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, []);

  const fetchAlerts = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE}/alerts`);
      if (response.data.success) {
        setAlerts(response.data.alerts);
      }
    } catch (error) {
      console.error('Error fetching alerts:', error);
    } finally {
      setLoading(false);
    }
  };

  const evaluateNow = async () => {
    try {
      setEvaluating(true);
      await axios.post(`${API_BASE}/alerts/evaluate`);
      await fetchAlerts();
    } catch (error) {
      console.error('Error evaluating alerts:', error);
    } finally {
      setEvaluating(false);
    }
  };

  const acknowledgeAlert = async (alertId) => {
    try {
      await axios.post(`${API_BASE}/alerts/${alertId}/acknowledge`);
      await fetchAlerts();
    } catch (error) {
      console.error('Error acknowledging alert:', error);
    }
  };

  const resolveAlert = async (alertId) => {
    try {
      await axios.post(`${API_BASE}/alerts/${alertId}/resolve`);
      await fetchAlerts();
    } catch (error) {
      console.error('Error resolving alert:', error);
    }
  };

  const getSeverityClass = (severity) => {
    return `alert-severity-${severity.toLowerCase()}`;
  };

  const getStatusBadge = (status) => {
    const badges = {
      active: { icon: '🔴', label: 'Active', class: 'status-active' },
      acknowledged: { icon: '🟡', label: 'Acknowledged', class: 'status-acknowledged' },
      resolved: { icon: '🟢', label: 'Resolved', class: 'status-resolved' }
    };
    return badges[status] || badges.active;
  };

  const activeAlerts = alerts.filter(a => a.status === 'active');
  const acknowledgedAlerts = alerts.filter(a => a.status === 'acknowledged');
  const resolvedAlerts = alerts.filter(a => a.status === 'resolved');

  if (loading && alerts.length === 0) {
    return (
      <div className="smart-alerts-container">
        <div className="loading-spinner">Loading alerts...</div>
      </div>
    );
  }

  return (
    <div className="smart-alerts-container">
      <div className="alerts-header">
        <div>
          <h1 className="alerts-title">🔔 Smart Alerts</h1>
          <p className="alerts-subtitle">
            AI-powered alert system that only notifies when it matters
          </p>
        </div>
        <button 
          onClick={evaluateNow} 
          disabled={evaluating}
          className="evaluate-button"
        >
          {evaluating ? '⏳ Evaluating...' : '🔍 Evaluate Now'}
        </button>
      </div>

      <div className="alerts-stats">
        <div className="stat-card active">
          <div className="stat-number">{activeAlerts.length}</div>
          <div className="stat-label">Active Alerts</div>
        </div>
        <div className="stat-card acknowledged">
          <div className="stat-number">{acknowledgedAlerts.length}</div>
          <div className="stat-label">Acknowledged</div>
        </div>
        <div className="stat-card resolved">
          <div className="stat-number">{resolvedAlerts.length}</div>
          <div className="stat-label">Resolved</div>
        </div>
      </div>

      {alerts.length === 0 ? (
        <div className="no-alerts">
          <div className="no-alerts-icon">✅</div>
          <h2>All Clear!</h2>
          <p>No alerts detected. Your system is running smoothly.</p>
        </div>
      ) : (
        <div className="alerts-list">
          {alerts.map(alert => {
            const statusBadge = getStatusBadge(alert.status);
            return (
              <div key={alert.id} className={`alert-card ${getSeverityClass(alert.severity)}`}>
                <div className="alert-header">
                  <div className="alert-info">
                    <div className="alert-severity">{alert.severity}</div>
                    <div className="alert-message">{alert.message}</div>
                  </div>
                  <div className={`alert-status ${statusBadge.class}`}>
                    <span className="status-icon">{statusBadge.icon}</span> {statusBadge.label}
                  </div>
                </div>
                <div className="alert-details">
                  <div><strong>First Seen:</strong> {new Date(alert.firstSeen).toLocaleString()}</div>
                  <div><strong>Last Seen:</strong> {new Date(alert.lastSeen).toLocaleString()}</div>
                  <div><strong>Occurrences:</strong> {alert.occurrences}</div>
                  {alert.affectedClusters && (
                    <div><strong>Affected Clusters:</strong> {alert.affectedClusters.join(', ')}</div>
                  )}
                  {alert.affectedServices && (
                    <div><strong>Affected Services:</strong> {alert.affectedServices.join(', ')}</div>
                  )}
                  