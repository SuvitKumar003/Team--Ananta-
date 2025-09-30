import React, { useState, useEffect } from 'react';
import { logAPI } from '../../services/api';
import './CriticalIssues.css';

const CriticalIssues = () => {
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState('timestamp');
  const [sortOrder, setSortOrder] = useState('desc');

  const fetchCriticalIssues = async () => {
    try {
      setLoading(true);
      const response = await logAPI.getLogs({
        level: 'ERROR,CRITICAL',
        limit: 20,
        page: 1
      });
      
      if (response.success && response.logs) {
        setIssues(response.logs);
      }
    } catch (error) {
      console.error('Error fetching critical issues:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCriticalIssues();
    
    // Refresh every 30 seconds
    const interval = setInterval(fetchCriticalIssues, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  const sortedIssues = [...issues].sort((a, b) => {
    let aVal = a[sortBy];
    let bVal = b[sortBy];
    
    if (sortBy === 'timestamp') {
      aVal = new Date(aVal).getTime();
      bVal = new Date(bVal).getTime();
    }
    
    if (sortOrder === 'asc') {
      return aVal > bVal ? 1 : -1;
    } else {
      return aVal < bVal ? 1 : -1;
    }
  });

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const getLevelBadgeClass = (level) => {
    return `level-badge level-${level.toLowerCase()}`;
  };

  if (loading) {
    return (
      <div className="issues-loading">
        <div className="loading-skeleton-table"></div>
      </div>
    );
  }

  if (issues.length === 0) {
    return (
      <div className="issues-empty">
        <div className="empty-icon">✓</div>
        <p className="empty-text">No critical issues detected</p>
        <p className="empty-subtext">All systems operating normally</p>
      </div>
    );
  }

  return (
    <div className="critical-issues">
      <div className="issues-header">
        <div className="issues-count">
          Showing {sortedIssues.length} critical issue{sortedIssues.length !== 1 ? 's' : ''}
        </div>
        <button className="refresh-issues" onClick={fetchCriticalIssues}>
          Refresh
        </button>
      </div>

      <div className="issues-table-wrapper">
        <table className="issues-table">
          <thead>
            <tr>
              <th onClick={() => handleSort('timestamp')} className="sortable">
                Timestamp
                {sortBy === 'timestamp' && (
                  <span className="sort-indicator">
                    {sortOrder === 'asc' ? '↑' : '↓'}
                  </span>
                )}
              </th>
              <th onClick={() => handleSort('level')} className="sortable">
                Level
                {sortBy === 'level' && (
                  <span className="sort-indicator">
                    {sortOrder === 'asc' ? '↑' : '↓'}
                  </span>
                )}
              </th>
              <th>Message</th>
              <th>Endpoint</th>
              <th>Error Code</th>
              <th>City</th>
            </tr>
          </thead>
          <tbody>
            {sortedIssues.map((issue, index) => (
              <tr key={issue._id || index} className="issue-row">
                <td className="timestamp-cell">
                  {formatTimestamp(issue.timestamp)}
                </td>
                <td>
                  <span className={getLevelBadgeClass(issue.level)}>
                    {issue.level}
                  </span>
                </td>
                <td className="message-cell">
                  <div className="message-content" title={issue.message}>
                    {issue.message}
                  </div>
                </td>
                <td className="endpoint-cell">
                  <code>{issue.endpoint || 'N/A'}</code>
                </td>
                <td className="error-code-cell">
                  {issue.errorCode ? (
                    <span className="error-code">{issue.errorCode}</span>
                  ) : (
                    <span className="not-available">N/A</span>
                  )}
                </td>
                <td className="city-cell">
                  {issue.city || 'Unknown'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default CriticalIssues;