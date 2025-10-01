import React from 'react';
import StatCard from '../common/StatCard';
import './StatsOveriew.css';

const StatsOverview = ({ stats, loading }) => {
  if (loading) {
    return (
      <div className="stats-overview">
        <div className="stats-grid">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="stat-card-skeleton"></div>
          ))}
        </div>
      </div>
    );
  }

  const totalLogs = stats?.total || 0;
  const errorCount = (stats?.byLevel?.ERROR || 0) + (stats?.byLevel?.CRITICAL || 0);
  const errorRate = totalLogs > 0 ? ((errorCount / totalLogs) * 100).toFixed(1) : 0;

  return (
    <div className="stats-overview">
      <div className="stats-grid">
        <StatCard
          title="Total Logs"
          value={totalLogs.toLocaleString()}
          subtitle="All time"
          color="blue"
          icon="📊"
        />
        
        <StatCard
          title="Error Rate"
          value={`${errorRate}%`}
          subtitle={`${errorCount.toLocaleString()} errors detected`}
          color="red"
          icon="⚠️"
        />
        
      
      </div>
    </div>
  );
};

export default StatsOverview;