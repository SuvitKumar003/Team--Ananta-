import React from 'react';
import './StatCard.css';

const StatCard = ({ title, value, subtitle, trend, icon, color }) => {
  return (
    <div className={`stat-card stat-card-${color}`}>
      <div className="stat-card-header">
        <div className="stat-info">
          <h3 className="stat-title">{title}</h3>
          <div className="stat-value">{value}</div>
          {subtitle && <p className="stat-subtitle">{subtitle}</p>}
        </div>
        {icon && <div className="stat-icon">{icon}</div>}
      </div>
      
      {trend && (
        <div className={`stat-trend ${trend.direction}`}>
          <span className="trend-arrow">
            {trend.direction === 'up' ? '↑' : '↓'}
          </span>
          <span className="trend-value">{trend.value}</span>
          <span className="trend-label">{trend.label}</span>
        </div>
      )}
    </div>
  );
};

export default StatCard;