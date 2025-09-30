import React, { useState, useEffect, useCallback } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { logAPI } from '../../services/api';
import { processTimeSeriesData } from '../../utils/helpers';
import './ErrorTimeline.css';

const ErrorTimeline = () => {
  const [timeSeriesData, setTimeSeriesData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState(12);

  // ✅ Wrap with useCallback
  const fetchTimeSeriesData = useCallback(async () => {
    try {
      setLoading(true);
      const response = await logAPI.getLogsTimeSeries(selectedPeriod);

      if (response.success && response.logs) {
        const processed = processTimeSeriesData(response.logs, selectedPeriod);
        setTimeSeriesData(processed);
      }
    } catch (error) {
      console.error('Error fetching time series data:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedPeriod]); // selectedPeriod is a dependency

  // ✅ useEffect now has a stable dependency
  useEffect(() => {
    fetchTimeSeriesData();
  }, [fetchTimeSeriesData]);

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="custom-tooltip">
          <p className="tooltip-label">{label}</p>
          {payload.map((entry, index) => (
            <p key={index} style={{ color: entry.color }}>
              {entry.name}: {entry.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <div className="timeline-loading">
        <div className="loading-skeleton"></div>
      </div>
    );
  }

  return (
    <div className="error-timeline">
      <div className="timeline-controls">
        <div className="period-selector">
          {[6, 12, 24].map(hours => (
            <button
              key={hours}
              className={`period-button ${selectedPeriod === hours ? 'active' : ''}`}
              onClick={() => setSelectedPeriod(hours)}
            >
              {hours}h
            </button>
          ))}
        </div>
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={timeSeriesData}>
          <defs>
            <linearGradient id="colorCritical" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8}/>
              <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
            </linearGradient>
            <linearGradient id="colorError" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#f97316" stopOpacity={0.8}/>
              <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
            </linearGradient>
            <linearGradient id="colorWarn" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.8}/>
              <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
            </linearGradient>
          </defs>

          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
          <XAxis dataKey="label" stroke="rgba(255,255,255,0.5)" style={{ fontSize: '0.75rem' }} />
          <YAxis stroke="rgba(255,255,255,0.5)" style={{ fontSize: '0.75rem' }} />
          <Tooltip content={<CustomTooltip />} />
          <Legend wrapperStyle={{ color: 'rgba(255,255,255,0.8)' }} />

          <Area type="monotone" dataKey="CRITICAL" stackId="1" stroke="#ef4444" fill="url(#colorCritical)" />
          <Area type="monotone" dataKey="ERROR" stackId="1" stroke="#f97316" fill="url(#colorError)" />
          <Area type="monotone" dataKey="WARN" stackId="1" stroke="#f59e0b" fill="url(#colorWarn)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

export default ErrorTimeline;
