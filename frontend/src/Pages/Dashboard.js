import React, { useState, useEffect } from 'react';
import { logAPI } from '../services/api';
import StatsOverview from '../components/dashboard/StatsOverview';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ErrorTimeline from '../components/dashboard/ErrorTimeline';
import './Dashboard.css';

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  const fetchStats = async () => {
    try {
      setLoading(true);
      const data = await logAPI.getStats();
      
      if (data.success) {
        setStats(data.stats);
        setError(null);
      } else {
        setError('Failed to fetch statistics');
      }
    } catch (err) {
      console.error('Error fetching stats:', err);
      setError(err.message || 'Failed to connect to backend');
    } finally {
      setLoading(false);
      setLastUpdated(new Date());
    }
  };

  useEffect(() => {
    fetchStats();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchStats, 30000);
    
    return () => clearInterval(interval);
  }, []);

  if (loading && !stats) {
    return <LoadingSpinner message="Loading dashboard..." />;
  }

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <div>
          <h1 className="dashboard-title">Analytics Dashboard</h1>
          <p className="dashboard-subtitle">
            Real-time system monitoring and insights
          </p>
        </div>
        
        <div className="dashboard-actions">
          <button 
            className="refresh-button"
            onClick={fetchStats}
            disabled={loading}
          >
            <span className={loading ? 'refresh-icon spinning' : 'refresh-icon'}>
              ↻
            </span>
            Refresh
          </button>
          
          <div className="last-updated">
            Last updated: {lastUpdated.toLocaleTimeString()}
          </div>
        </div>
      </div>

      {error && (
        <div className="error-banner">
          <span className="error-icon">⚠</span>
          <span>{error}</span>
          <button onClick={fetchStats} className="error-retry">
            Retry
          </button>
        </div>
      )}

      <StatsOverview stats={stats} loading={loading} />

<div className="dashboard-grid">
        <div className="dashboard-section">
          <div className="section-header">
            <h2 className="section-title">Error Timeline</h2>
            <span className="section-badge">Live</span>
          </div>
          <div className="section-content">
            <ErrorTimeline />
          </div>
        </div>

        <div className="dashboard-section">
          <div className="section-header">
            <h2 className="section-title">Severity Distribution</h2>
            <span className="section-badge">Coming Soon</span>
          </div>
          <div className="section-content placeholder">
            Pie chart will appear here
          </div>
        </div>
      </div>

      <div className="dashboard-section full-width">
        <div className="section-header">
          <h2 className="section-title">Critical Issues</h2>
          <span className="section-badge">Coming Soon</span>
        </div>
        <div className="section-content placeholder">
          Critical issues table will appear here
        </div>
      </div>
    </div>
  );
};

export default Dashboard;