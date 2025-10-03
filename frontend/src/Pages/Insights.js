import React, { useState, useEffect } from 'react';
import {
  Brain,
  AlertTriangle,
  TrendingUp,
  Search,
  X,
  CheckCircle,
  XCircle,
  Info,
  Zap,
  Target,
  Lightbulb,
  Clock,
  Activity,
} from 'lucide-react';
import './Insights.css';
const Insights = () => {
      const [logs, setLogs] = useState([]);
      const [filteredLogs, setFilteredLogs] = useState([]);
      const [loading, setLoading] = useState(true);
      const [selectedLog, setSelectedLog] = useState(null);
      const [stats, setStats] = useState({
        total: 0,
        anomalies: 0,
        critical: 0,
        clusters: 0,
      });

      const [filters, setFilters] = useState({
        search: '',
        severity: 'all',
        anomalyOnly: false,
        category: 'all',
      });

      const API_BASE = 'https://log-analyzer1.onrender.com/api';

      useEffect(() => {
        fetchAILogs();
      }, []);

      useEffect(() => {
        applyFilters();
      }, [logs, filters]);

      const fetchAILogs = async () => {
        setLoading(true);
        try {
          const [logsRes, anomaliesRes, clustersRes] = await Promise.all([
            fetch(`${API_BASE}/ailogs?limit=500`).then((r) => r.json()),
            fetch(`${API_BASE}/ailogs/anomalies`).then((r) => r.json()),
            fetch(`${API_BASE}/ailogs/clusters`).then((r) => r.json()),
            fetch(`${API_BASE}/ailogs/explain/:clusterLabel`).then((r) => r.json()),
          ]);

          setLogs(logsRes.logs || []);
          setStats({
            total: logsRes.total || 0,
            anomalies: anomaliesRes.count || 0,
            critical: logsRes.logs?.filter((l) => l.severity === 'critical').length || 0,
            clusters: clustersRes.clusters?.length || 0,
          });
        } catch (error) {
          console.error('Failed to fetch AI logs:', error);
        } finally {
          setLoading(false);
        }
      };

      const applyFilters = () => {
        let filtered = [...logs];

        if (filters.search) {
          const searchLower = filters.search.toLowerCase();
          filtered = filtered.filter(
            (log) =>
              log.message?.toLowerCase().includes(searchLower) ||
              log.rootCause?.toLowerCase().includes(searchLower) ||
              log.category?.toLowerCase().includes(searchLower)
          );
        }

        if (filters.severity !== 'all') {
          filtered = filtered.filter((log) => log.severity === filters.severity);
        }

        if (filters.anomalyOnly) {
          filtered = filtered.filter((log) => log.anomalyDetected);
        }

        if (filters.category !== 'all') {
          filtered = filtered.filter((log) => log.category === filters.category);
        }

        setFilteredLogs(filtered);
      };

      const getSeverityColor = (severity) => {
        const colors = {
          critical: 'severity-critical',
          high: 'severity-high',
          medium: 'severity-medium',
          low: 'severity-low',
        };
        return colors[severity] || colors.low;
      };

      const getSeverityIcon = (severity) => {
        if (severity === 'critical' || severity === 'high')
          return <AlertTriangle className="icon-small" />;
        if (severity === 'medium') return <Info className="icon-small" />;
        return <CheckCircle className="icon-small" />;
      };

      const getCategories = () => {
        const categories = new Set(logs.map((l) => l.category).filter(Boolean));
        return ['all', ...Array.from(categories)];
      };

      if (loading) {
        return (
          <div className="loading-container">
            <div className="loading-content">
              <Brain className="loading-icon" />
              <p className="loading-text">Loading AI Insights...</p>
            </div>
          </div>
        );
      }

      return (
        <div className="app-container">
          <div className="main-content">
            <div className="header">
              <div className="header-title">
                <Brain className="header-icon" />
                <h1 className="header-text">AI Insights</h1>
              </div>
              <p className="header-subtitle">
                AI-powered log analysis with anomaly detection and smart recommendations
              </p>
            </div>

            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-header">
                  <Activity className="stat-icon" />
                  <span className="stat-value">{stats.total}</span>
                </div>
                <p className="stat-label">Total Analyzed</p>
              </div>

              <div className="stat-card">
                <div className="stat-header">
                  <AlertTriangle className="stat-icon anomaly" />
                  <span className="stat-value">{stats.anomalies}</span>
                </div>
                <p className="stat-label">Anomalies Detected</p>
              </div>

              <div className="stat-card">
                <div className="stat-header">
                  <XCircle className="stat-icon critical" />
                  <span className="stat-value">{stats.critical}</span>
                </div>
                <p className="stat-label">Critical Issues</p>
              </div>

              <div className="stat-card">
                <div className="stat-header">
                  <TrendingUp className="stat-icon cluster" />
                  <span className="stat-value">{stats.clusters}</span>
                </div>
                <p className="stat-label">Issue Clusters</p>
              </div>
            </div>

            <div className="filter-card">
              <div className="filter-grid">
                <div className="search-container">
                  <Search className="search-icon" />
                  <input
                    type="text"
                    placeholder="Search logs..."
                    value={filters.search}
                    onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                    className="search-input"
                  />
                </div>

                <select
                  value={filters.severity}
                  onChange={(e) => setFilters({ ...filters, severity: e.target.value })}
                  className="filter-select"
                >
                  <option value="all">All Severities</option>
                  <option value="critical">Critical</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>

                <select
                  value={filters.category}
                  onChange={(e) => setFilters({ ...filters, category: e.target.value })}
                  className="filter-select"
                >
                  {getCategories().map((cat) => (
                    <option key={cat} value={cat}>
                      {cat === 'all' ? 'All Categories' : cat.replace(/_/g, ' ').toUpperCase()}
                    </option>
                  ))}
                </select>

                <label className="anomaly-toggle">
                  <input
                    type="checkbox"
                    checked={filters.anomalyOnly}
                    onChange={(e) => setFilters({ ...filters, anomalyOnly: e.target.checked })}
                    className="anomaly-checkbox"
                  />
                  <span className="anomaly-label">Anomalies Only</span>
                </label>
              </div>
            </div>

            <div className="logs-grid">
              {filteredLogs.length === 0 ? (
                <div className="no-logs-card">
                  <Brain className="no-logs-icon" />
                  <p className="no-logs-text">No logs found matching your filters</p>
                </div>
              ) : (
                filteredLogs.map((log) => (
                  <div
                    key={log._id}
                    onClick={() => setSelectedLog(log)}
                    className="log-card"
                  >
                    <div className="log-content">
                      <div className="log-main">
                        <div className="log-tags">
                          <span className={`severity-tag ${getSeverityColor(log.severity)}`}>
                            {getSeverityIcon(log.severity)}
                            {log.severity?.toUpperCase()}
                          </span>

                          {log.anomalyDetected && (
                            <span className="anomaly-tag">
                              <Zap className="icon-tiny" />
                              ANOMALY ({(log.anomalyScore * 100).toFixed(0)}%)
                            </span>
                          )}

                          {log.category && (
                            <span className="category-tag">
                              {log.category.replace(/_/g, ' ').toUpperCase()}
                            </span>
                          )}
                        </div>

                        <h3 className="log-title">
                          {log.message}
                        </h3>

                        <div className="log-meta">
                          <span className="meta-item">
                            <Clock className="icon-small" />
                            {new Date(log.timestamp).toLocaleString()}
                          </span>
                          {log.endpoint && (
                            <span className="meta-item">
                              <Activity className="icon-small" />
                              {log.endpoint}
                            </span>
                          )}
                        </div>

                        {log.rootCause && (
                          <div className="root-cause">
                            <div className="root-cause-content">
                              <Target className="icon-small orange" />
                              <div>
                                <p className="root-cause-label">Root Cause</p>
                                <p className="root-cause-text">{log.rootCause}</p>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="log-actions">
                        <button className="view-details-btn">View Details</button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {selectedLog && (
              <div className="modal-overlay">
                <div className="modal-content">
                  <div className="modal-header">
                    <div className="modal-header-content">
                      <div className="modal-tags">
                        <span className={`severity-tag large ${getSeverityColor(selectedLog.severity)}`}>
                          {getSeverityIcon(selectedLog.severity)}
                          {selectedLog.severity?.toUpperCase()}
                        </span>
                        {selectedLog.anomalyDetected && (
                          <span className="anomaly-tag large">
                            <Zap className="icon-small" />
                            ANOMALY SCORE: {(selectedLog.anomalyScore * 100).toFixed(0)}%
                          </span>
                        )}
                      </div>
                      <h2 className="modal-title">{selectedLog.message}</h2>
                      <p className="modal-timestamp">
                        {new Date(selectedLog.timestamp).toLocaleString()}
                      </p>
                    </div>
                    <button
                      onClick={() => setSelectedLog(null)}
                      className="modal-close-btn"
                    >
                      <X className="icon-medium" />
                    </button>
                  </div>

                  <div className="modal-body">
                    {selectedLog.aiExplanation && (
                      <div className="ai-explanation">
                        <div className="ai-explanation-content">
                          <Brain className="icon-medium purple" />
                          <div>
                            <h3 className="section-title">Deep Analysis</h3>
                            <p className="section-text">{selectedLog.aiExplanation}</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {selectedLog.rootCause && (
                      <div className="root-cause-section">
                        <div className="root-cause-content">
                          <Target className="icon-medium orange" />
                          <div>
                            <h3 className="section-title">Root Cause</h3>
                            <p className="section-text">{selectedLog.rootCause}</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {selectedLog.suggestedFix && (
                      <div className="suggested-fix">
                        <div className="suggested-fix-content">
                          <Lightbulb className="icon-medium green" />
                          <div>
                            <h3 className="section-title">Suggested Fix</h3>
                            <p className="section-text">{selectedLog.suggestedFix}</p>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="technical-details">
                      <h3 className="section-title">Technical Details</h3>
                      <div className="details-grid">
                        {selectedLog.level && (
                          <div>
                            <p className="detail-label">Level</p>
                            <p className="detail-value">{selectedLog.level}</p>
                          </div>
                        )}
                        {selectedLog.category && (
                          <div>
                            <p className="detail-label">Category</p>
                            <p className="detail-value">{selectedLog.category}</p>
                          </div>
                        )}
                        {selectedLog.service && (
                          <div>
                            <p className="detail-label">Service</p>
                            <p className="detail-value">{selectedLog.service}</p>
                          </div>
                        )}
                        {selectedLog.endpoint && (
                          <div>
                            <p className="detail-label">Endpoint</p>
                            <p className="detail-value">{selectedLog.endpoint}</p>
                          </div>
                        )}
                        {selectedLog.city && (
                          <div>
                            <p className="detail-label">Location</p>
                            <p className="detail-value">{selectedLog.city}</p>
                          </div>
                        )}
                        {selectedLog.clusterName && (
                          <div>
                            <p className="detail-label">Cluster</p>
                            <p className="detail-value">{selectedLog.clusterName}</p>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="metadata">
                      <h3 className="section-title">Analysis Metadata</h3>
                      <div className="details-grid">
                        <div>
                          <p className="detail-label">AI Model</p>
                          <p className="detail-value">
                            {selectedLog.aiModel || 'llama-4-scout-17b'}
                          </p>
                        </div>
                        <div>
                          <p className="detail-label">Analyzed At</p>
                          <p className="detail-value">
                            {selectedLog.analyzedAt
                              ? new Date(selectedLog.analyzedAt).toLocaleString()
                              : 'N/A'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      );
    };

export default Insights;