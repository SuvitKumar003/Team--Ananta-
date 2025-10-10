import React from 'react';
import { Link } from 'react-router-dom';
import './Home.css';

const Home = () => {
  return (
    <div className="home-container">
      <div className="hero-section">
        <div className="hero-content">
          <h1 className="hero-title">
            Intelligent Log Analysis
            <span className="gradient-text"> Powered by AI</span>
          </h1>
          
          <p className="hero-description">
            Real-time log monitoring, anomaly detection, and AI-driven insights
            for modern applications. Built with Cerebras LLaMA 4 Scout.
          </p>

          <div className="hero-cta">
            <Link to="/dashboard" className="cta-button primary">
              Open Dashboard
            </Link>
          </div>
        </div>

        <div className="hero-stats">
          <div className="stat-item">
            <div className="stat-number">20K+</div>
            <div className="stat-label">Logs Per Minute</div>
          </div>
          <div className="stat-item">
            <div className="stat-number">99.9%</div>
            <div className="stat-label">Uptime</div>
          </div>
          <div className="stat-item">
            <div className="stat-number">AI</div>
            <div className="stat-label">Real-time Analysis</div>
          </div>
        </div>
      </div>

      <div className="features-section">
        <h2 className="section-title">Platform Capabilities</h2>
        
        <div className="features-grid">
          <div className="feature-card">
            <h3>Real-time Monitoring</h3>
            <p>Track system health and performance metrics in real-time with automated alerts.</p>
          </div>

          <div className="feature-card">
            <h3>AI-Powered Analysis</h3>
            <p>Leverage Cerebras LLaMA 4 for intelligent anomaly detection and root cause analysis.</p>
          </div>

          <div className="feature-card">
            <h3>Pattern Recognition</h3>
            <p>Automatically cluster similar issues and identify recurring problems.</p>
          </div>

          <div className="feature-card">
            <h3>Advanced Analytics</h3>
            <p>Comprehensive dashboards with timeline views, severity distributions, and trends.</p>
          </div>

          <div className="feature-card">
            <h3>High Performance</h3>
            <p>Process 20,000+ logs per minute with optimized database pooling and caching.</p>
          </div>

          <div className="feature-card">
            <h3>AI Insights</h3>
            <p>Natural language insights and recommendations from your AI assistant.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
