// frontend/src/Pages/SmartAlerts.js
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './SmartAlerts.css';

const API_BASE = 'https://team-ananta-9hz7.onrender.com//api';

const SmartAlerts = () => {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [evaluating, setEvaluating] = useState(false);
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [lastEvaluated, setLastEvaluated] = useState(null);

  useEffect(() => {
    // Auto-evaluate on page load
    evaluateAndFetchAlerts();
    
    // Refresh alerts every 30 seconds
    const alertInterval = setInterval(fetchAlerts, 30000);
    
    // Auto-evaluate every 5 minutes (same as backend cron)
    const evalInterval = setInterval(evaluateAndFetchAlerts, 5 * 60 * 1000);
    
    return () => {
      clearInterval(alertInterval);
      clearInterval(evalInterval);
    };
  }, []);

  const fetchAlerts = async () => {
    try {
      setLoading(true);
      // Fetch alerts from last 24 hours
      const response = await axios.get(`${API_BASE}/alerts?hours=24&limit=100`);
      if (response.data.success) {
        setAlerts(response.data.alerts);
      }
    } catch (error) {
      console.error('Error fetching alerts:', error);
    } finally {
      setLoading(false);
    }
  };

  const evaluateAlerts = async () => {
    try {
      setEvaluating(true);
      const response = await axios.post(`${API_BASE}/alerts/evaluate`);
      setLastEvaluated(new Date());
      return response.data;
    } catch (error) {
      console.error('Error evaluating alerts:', error);
      return null;
    } finally {
      setEvaluating(false);
    }
  };

  // Combined function: evaluate then fetch
  const evaluateAndFetchAlerts = async () => {
    await evaluateAlerts();
    await fetchAlerts();
  };

  // Manual evaluation (button click)
  const evaluateNow = async () => {
    await evaluateAndFetchAlerts();
  };

  const acknowledgeAlert = async (alertId) => {
    try {
      await axios.post(`${API_BASE}/alerts/${alertId}/acknowledge`);
      await fetchAlerts();
      setSelectedAlert(null);
    } catch (error) {
      console.error('Error acknowledging alert:', error);
    }
  };

  const resolveAlert = async (alertId) => {
    try {
      await axios.post(`${API_BASE}/alerts/${alertId}/resolve`);
      await fetchAlerts();
      setSelectedAlert(null);
    } catch (error) {
      console.error('Error resolving alert:', error);
    }
  };

  const getSeverityClass = (severity) => {
    return `alert-severity-${severity.toLowerCase()}`;
  };

  const getStatusBadge = (status) => {
    const badges = {
      active: { label: 'Active', class: 'status-active' },
      acknowledged: { label: 'Acknowledged', class: 'status-acknowledged' },
      resolved: { label: 'Resolved', class: 'status-resolved' }
    };
    return badges[status] || badges.active;
  };

  const formatTimeAgo = (timestamp) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffMs = now - time;
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  const activeAlerts = alerts.filter(a => a.status === 'active');
  const acknowledgedAlerts = alerts.filter(a => a.status === 'acknowledged');
  const resolvedAlerts = alerts.filter(a => a.status === 'resolved');

  if (loading && alerts.length === 0) {
    return (
      <div className="smart-alerts-container">
        <div className="loading-spinner">
          {evaluating ? 'Evaluating alerts...' : 'Loading alerts...'}
        </div>
      </div>
    );
  }

  return (
    <div className="smart-alerts-container">
      {/* Header */}
      <div className="alerts-header">
        <div>
          <h1 className="alerts-title">Smart Alerts (24h)</h1>
          <p className="alerts-subtitle">
            AI-powered alert system • Auto-evaluates every 5 minutes
            {lastEvaluated && (
              <span className="last-evaluated">
                {' • Last checked: '}{formatTimeAgo(lastEvaluated)}
              </span>
            )}
          </p>
        </div>
        <button 
          onClick={evaluateNow} 
          disabled={evaluating}
          className="evaluate-button"
        >
          {evaluating ? (
            <>
              <span className="spinner-small"></span>
              Evaluating...
            </>
          ) : (
            '🔄 Evaluate Now'
          )}
        </button>
      </div>

      {/* Stats Cards */}
      <div className="alerts-stats">
        <div className="stat1-card active">
          <div className="stat-number">{activeAlerts.length}</div>
          <div className="stat-label">Active Alerts</div>
        </div>
        <div className="stat1-card acknowledged">
          <div className="stat-number">{acknowledgedAlerts.length}</div>
          <div className="stat-label">Acknowledged</div>
        </div>
        <div className="stat1-card resolved">
          <div className="stat-number">{resolvedAlerts.length}</div>
          <div className="stat-label">Resolved</div>
        </div>
        <div className="stat1-card total">
          <div className="stat-number">{alerts.length}</div>
          <div className="stat-label">Total (24h)</div>
        </div>
      </div>

      {/* Alerts List */}
      {alerts.length === 0 ? (
        <div className="no-alerts">
          <div className="no-alerts-icon">✓</div>
          <h2>All Clear</h2>
          <p>No alerts detected in the last 24 hours. Your system is running smoothly.</p>
        </div>
      ) : (
        <div className="alerts-list">
          {alerts.map(alert => {
            const statusBadge = getStatusBadge(alert.status);

            return (
              <div 
                key={alert.alertId} 
                className={`alert-card ${getSeverityClass(alert.severity)}`}
              >
                {/* Alert Header */}
                <div className="alert-header">
                  <div className="alert-info">
                    <div className="alert-badges">
                      <span className="alert-severity">{alert.severity}</span>
                      <span className={`alert-status ${statusBadge.class}`}>
                        {statusBadge.label}
                      </span>
                    </div>
                    <h3 className="alert-title">{alert.title}</h3>
                    <p className="alert-description">{alert.description}</p>
                  </div>
                </div>

                {/* Quick Stats */}
                <div className="alert-stats">
                  {alert.affectedLogs && (
                    <div className="stat-item">
                      <span className="stat-label">Affected Logs</span>
                      <span className="stat-value">{alert.affectedLogs}</span>
                    </div>
                  )}
                  {alert.affectedUsers && (
                    <div className="stat-item">
                      <span className="stat-label">Affected Users</span>
                      <span className="stat-value">{alert.affectedUsers}</span>
                    </div>
                  )}
                  {alert.estimatedRevenueLoss && (
                    <div className="stat-item revenue-loss">
                      <span className="stat-label">Est. Revenue Loss</span>
                      <span className="stat-value">{alert.estimatedRevenueLoss}</span>
                    </div>
                  )}
                  <div className="stat-item">
                    <span className="stat-label">Time</span>
                    <span className="stat-value">
                      {formatTimeAgo(alert.createdAt || alert.timestamp)}
                    </span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="alert-actions">
                  <button
                    onClick={() => setSelectedAlert(alert)}
                    className="btn btn-details"
                  >
                    Show Details
                  </button>
                  {alert.status === 'active' && (
                    <button
                      onClick={() => acknowledgeAlert(alert.alertId)}
                      className="btn btn-acknowledge"
                    >
                      Acknowledge
                    </button>
                  )}
                  {(alert.status === 'active' || alert.status === 'acknowledged') && (
                    <button
                      onClick={() => resolveAlert(alert.alertId)}
                      className="btn btn-resolve"
                    >
                      Resolve
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal */}
      {selectedAlert && (
        <div className="modal-overlay" onClick={() => setSelectedAlert(null)}>
          <div className={`modal-content ${getSeverityClass(selectedAlert.severity)}`} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <div className="alert-badges">
                  <span className="alert-severity">{selectedAlert.severity}</span>
                  <span className={`alert-status ${getStatusBadge(selectedAlert.status).class}`}>
                    {getStatusBadge(selectedAlert.status).label}
                  </span>
                </div>
                <h2 className="modal-title">{selectedAlert.title}</h2>
                <p className="modal-description">{selectedAlert.description}</p>
                <p className="modal-timestamp">
                  {formatTimeAgo(selectedAlert.createdAt || selectedAlert.timestamp)} • 
                  {' '}{new Date(selectedAlert.createdAt || selectedAlert.timestamp).toLocaleString()}
                </p>
              </div>
              <button className="modal-close" onClick={() => setSelectedAlert(null)}>
                ✕
              </button>
            </div>

            <div className="modal-body">
              {/* Top Errors */}
              {selectedAlert.topErrors && selectedAlert.topErrors.length > 0 && (
                <div className="details-section">
                  <h4 className="details-title">Top Errors</h4>
                  <div className="error-list">
                    {selectedAlert.topErrors.map((err, idx) => (
                      <div key={idx} className="error-item">
                        <span className="error-text">{err.error}</span>
                        <span className="error-count">{err.count}x</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Affected Endpoints */}
              {selectedAlert.affectedEndpoints && selectedAlert.affectedEndpoints.length > 0 && (
                <div className="details-section">
                  <h4 className="details-title">Affected Endpoints</h4>
                  <div className="endpoint-tags">
                    {selectedAlert.affectedEndpoints.map((endpoint, idx) => (
                      <span key={idx} className="endpoint-tag">{endpoint}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Suggested Action */}
              {selectedAlert.suggestedAction && (
                <div className="details-section">
                  <div className="suggested-action">
                    <h4 className="details-title">Suggested Action</h4>
                    <p>{selectedAlert.suggestedAction}</p>
                  </div>
                </div>
              )}

              {/* Runbook */}
              {selectedAlert.runbook && selectedAlert.runbook.length > 0 && (
                <div className="details-section">
                  <h4 className="details-title">Runbook</h4>
                  <ol className="runbook-list">
                    {selectedAlert.runbook.map((step, idx) => (
                      <li key={idx} className="runbook-step">
                        <span className="step-number">{idx + 1}</span>
                        <span className="step-text">{step}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              )}
            </div>

            <div className="modal-footer">
              {selectedAlert.status === 'active' && (
                <button
                  onClick={() => acknowledgeAlert(selectedAlert.alertId)}
                  className="btn btn-acknowledge"
                >
                  Acknowledge
                </button>
              )}
              {(selectedAlert.status === 'active' || selectedAlert.status === 'acknowledged') && (
                <button
                  onClick={() => resolveAlert(selectedAlert.alertId)}
                  className="btn btn-resolve"
                >
                  Resolve
                </button>
              )}
              <button
                onClick={() => setSelectedAlert(null)}
                className="btn btn-details"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SmartAlerts;