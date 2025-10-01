// frontend/src/Pages/SmartAlerts.js
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './SmartAlerts.css';

const API_BASE = 'http://localhost:5000/api';

const SmartAlerts = () => {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [evaluating, setEvaluating] = useState(false);
  const [selectedAlert, setSelectedAlert] = useState(null);

  useEffect(() => {
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 30000);
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
      {/* Header */}
      <div className="alerts-header">
        <div>
          <h1 className="alerts-title">Smart Alerts</h1>
          <p className="alerts-subtitle">
            AI-powered alert system that only notifies when it matters
          </p>
        </div>
        <button 
          onClick={evaluateNow} 
          disabled={evaluating}
          className="evaluate-button"
        >
          {evaluating ? 'Evaluating...' : 'Evaluate Now'}
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
      </div>

      {/* Alerts List */}
      {alerts.length === 0 ? (
        <div className="no-alerts">
          <div className="no-alerts-icon">✓</div>
          <h2>All Clear</h2>
          <p>No alerts detected. Your system is running smoothly.</p>
        </div>
      ) : (
        <div className="alerts-list">
          {alerts.map(alert => {
            const statusBadge = getStatusBadge(alert.status);

            return (
              <div 
                key={alert.id} 
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
                      {new Date(alert.timestamp).toLocaleTimeString()}
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
                      onClick={() => acknowledgeAlert(alert.id)}
                      className="btn btn-acknowledge"
                    >
                      Acknowledge
                    </button>
                  )}
                  {(alert.status === 'active' || alert.status === 'acknowledged') && (
                    <button
                      onClick={() => resolveAlert(alert.id)}
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
                  onClick={() => acknowledgeAlert(selectedAlert.id)}
                  className="btn btn-acknowledge"
                >
                  Acknowledge
                </button>
              )}
              {(selectedAlert.status === 'active' || selectedAlert.status === 'acknowledged') && (
                <button
                  onClick={() => resolveAlert(selectedAlert.id)}
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