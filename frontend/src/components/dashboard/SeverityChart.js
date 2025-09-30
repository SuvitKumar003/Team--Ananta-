import React from 'react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip
} from 'recharts';
import { calculatePercentage } from '../../utils/helpers';
import './SeverityChart.css';

const SeverityChart = ({ stats, loading }) => {
  if (loading) {
    return (
      <div className="severity-loading">
        <div className="loading-skeleton"></div>
      </div>
    );
  }

  const byLevel = stats?.byLevel || {};
  const total = stats?.total || 0;

  const data = [
    { 
      name: 'INFO', 
      value: byLevel.INFO || 0, 
      color: '#3b82f6',
      percentage: calculatePercentage(byLevel.INFO || 0, total)
    },
    { 
      name: 'WARN', 
      value: byLevel.WARN || 0, 
      color: '#f59e0b',
      percentage: calculatePercentage(byLevel.WARN || 0, total)
    },
    { 
      name: 'ERROR', 
      value: byLevel.ERROR || 0, 
      color: '#f97316',
      percentage: calculatePercentage(byLevel.ERROR || 0, total)
    },
    { 
      name: 'CRITICAL', 
      value: byLevel.CRITICAL || 0, 
      color: '#ef4444',
      percentage: calculatePercentage(byLevel.CRITICAL || 0, total)
    }
  ].filter(item => item.value > 0);

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="severity-tooltip">
          <p className="tooltip-title">{data.name}</p>
          <p className="tooltip-value">{data.value.toLocaleString()} logs</p>
          <p className="tooltip-percentage">{data.percentage}%</p>
        </div>
      );
    }
    return null;
  };

  const CustomLegend = ({ payload }) => {
    return (
      <div className="severity-legend">
        {payload.map((entry, index) => (
          <div key={index} className="legend-item">
            <div 
              className="legend-color" 
              style={{ backgroundColor: entry.color }}
            ></div>
            <div className="legend-info">
              <span className="legend-name">{entry.value}</span>
              <span className="legend-stats">
                {data[index].value.toLocaleString()} ({data[index].percentage}%)
              </span>
            </div>
          </div>
        ))}
      </div>
    );
  };

  if (data.length === 0) {
    return (
      <div className="severity-empty">
        <p>No log data available</p>
      </div>
    );
  }

  return (
    <div className="severity-chart">
      <ResponsiveContainer width="100%" height={400}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            outerRadius={90}
            fill="#8884d8"
            dataKey="value"
            animationBegin={0}
            animationDuration={800}
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend content={<CustomLegend />} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

export default SeverityChart;