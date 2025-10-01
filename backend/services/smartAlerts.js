// backend/services/smartAlerts.js
const CerebrasLog = require('../models/CerebrasLog');
const Log = require('../models/Log');

/**
 * Smart Alert Engine
 * Only alerts when it REALLY matters (reduces alert fatigue)
 */

const ALERT_RULES = {
  // Critical endpoints that should NEVER fail
  criticalEndpoints: ['/payment', '/checkout', '/login', '/api/payment'],
  
  // Error rate spike threshold (50% increase)
  spikeThreshold: 0.5,
  
  // Minimum affected users to trigger alert
  minAffectedUsers: 5,
  
  // High-value error codes
  criticalErrorCodes: [
    'PAYMENT_GATEWAY_DOWN',
    'DATABASE_UNAVAILABLE', 
    'AUTH_SERVICE_DOWN',
    'CARD_DECLINED',
    'PAYMENT_GATEWAY_TIMEOUT'
  ],
  
  // Alert cooldown (5 minutes between same alerts)
  alertCooldown: 5 * 60 * 1000
};

class SmartAlertEngine {
  constructor() {
    this.baselineErrorRate = 0;
    this.lastAlertTime = {};
    this.recentAlerts = [];
  }

  /**
   * Main alert evaluation function
   */
  async evaluateAlerts() {
    try {
      console.log('🔔 Evaluating smart alerts...');

      // Get logs from last 5 minutes
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
      
      const [recentLogs, previousLogs] = await Promise.all([
        Log.find({ timestamp: { $gte: fiveMinutesAgo } }).lean(),
        Log.find({ 
          timestamp: { $gte: tenMinutesAgo, $lt: fiveMinutesAgo } 
        }).lean()
      ]);

      // Calculate current and previous error rates
      const currentErrorRate = this.calculateErrorRate(recentLogs);
      const previousErrorRate = this.calculateErrorRate(previousLogs);

      // Update baseline on first run
      if (this.baselineErrorRate === 0) {
        this.baselineErrorRate = previousErrorRate || 0.1;
      }

      const alerts = [];

      // RULE 1: Error Rate Spike Detection
      if (this.detectSpike(currentErrorRate, previousErrorRate)) {
        const errorLogs = recentLogs.filter(
          log => log.level === 'ERROR' || log.level === 'CRITICAL'
        );
        alerts.push(await this.createSpikeAlert(errorLogs, currentErrorRate, previousErrorRate));
      }

      // RULE 2: Critical Endpoint Failures
      const criticalFailures = recentLogs.filter(log => 
        (log.level === 'ERROR' || log.level === 'CRITICAL') &&
        ALERT_RULES.criticalEndpoints.some(endpoint => 
          log.endpoint?.includes(endpoint)
        )
      );

      if (criticalFailures.length >= 3) {
        alerts.push(await this.createCriticalEndpointAlert(criticalFailures));
      }

      // RULE 3: High-Value Error Codes
      const highValueErrors = recentLogs.filter(log =>
        ALERT_RULES.criticalErrorCodes.some(code =>
          log.errorCode?.includes(code)
        )
      );

      if (highValueErrors.length >= 5) {
        alerts.push(await this.createHighValueErrorAlert(highValueErrors));
      }

      // RULE 4: Multiple Users Affected
      const errorLogs = recentLogs.filter(
        log => log.level === 'ERROR' || log.level === 'CRITICAL'
      );
      const affectedUsers = new Set(errorLogs.map(log => log.userId)).size;

      if (affectedUsers >= ALERT_RULES.minAffectedUsers) {
        alerts.push(await this.createHighImpactAlert(errorLogs, affectedUsers));
      }

      // Filter alerts (cooldown period)
      const filteredAlerts = alerts.filter(alert => 
        this.shouldSendAlert(alert.type)
      );

      // Store alerts
      this.recentAlerts = [
        ...filteredAlerts.map(a => ({ ...a, timestamp: new Date() })),
        ...this.recentAlerts.slice(0, 49) // Keep last 50
      ];

      console.log(`✅ Smart alerts: ${filteredAlerts.length} new, ${alerts.length - filteredAlerts.length} suppressed`);

      return {
        success: true,
        alerts: filteredAlerts,
        suppressed: alerts.length - filteredAlerts.length,
        currentErrorRate,
        previousErrorRate
      };

    } catch (error) {
      console.error('❌ Smart alert error:', error);
      return { success: false, error: error.message };
    }
  }

  calculateErrorRate(logs) {
    if (logs.length === 0) return 0;
    const errorCount = logs.filter(
      log => log.level === 'ERROR' || log.level === 'CRITICAL'
    ).length;
    return errorCount / logs.length;
  }

  detectSpike(currentRate, previousRate) {
    if (previousRate === 0) return false;
    const increase = (currentRate - previousRate) / previousRate;
    return increase > ALERT_RULES.spikeThreshold && currentRate > 0.1;
  }

  shouldSendAlert(alertType) {
    const lastAlert = this.lastAlertTime[alertType];
    if (!lastAlert) return true;
    
    const timeSinceLastAlert = Date.now() - lastAlert;
    return timeSinceLastAlert > ALERT_RULES.alertCooldown;
  }

  async createSpikeAlert(errorLogs, currentRate, previousRate) {
    const increase = ((currentRate - previousRate) / previousRate * 100).toFixed(1);
    
    this.lastAlertTime['ERROR_SPIKE'] = Date.now();

    return {
      id: `alert_${Date.now()}_spike`,
      type: 'ERROR_SPIKE',
      severity: 'HIGH',
      title: `⚠️ Error Rate Spike Detected (+${increase}%)`,
      description: `Error rate jumped from ${(previousRate * 100).toFixed(1)}% to ${(currentRate * 100).toFixed(1)}%`,
      affectedLogs: errorLogs.length,
      topErrors: this.getTopErrors(errorLogs),
      suggestedAction: 'Investigate top error patterns immediately',
      runbook: [
        'Check recent deployments or config changes',
        'Review infrastructure metrics (CPU, memory, network)',
        'Check external service status',
        'Consider rollback if errors persist'
      ],
      timestamp: new Date(),
      status: 'active'
    };
  }

  async createCriticalEndpointAlert(criticalFailures) {
    const endpoints = [...new Set(criticalFailures.map(log => log.endpoint))];
    
    this.lastAlertTime['CRITICAL_ENDPOINT'] = Date.now();

    return {
      id: `alert_${Date.now()}_endpoint`,
      type: 'CRITICAL_ENDPOINT_FAILURE',
      severity: 'CRITICAL',
      title: `🚨 Critical Endpoint Failure`,
      description: `${criticalFailures.length} failures on business-critical endpoints: ${endpoints.join(', ')}`,
      affectedEndpoints: endpoints,
      affectedUsers: new Set(criticalFailures.map(log => log.userId)).size,
      topErrors: this.getTopErrors(criticalFailures),
      suggestedAction: 'IMMEDIATE ACTION REQUIRED - Revenue-impacting',
      runbook: [
        'Alert on-call engineer immediately',
        'Check payment gateway / auth service status',
        'Enable backup systems if available',
        'Notify customer support team'
      ],
      timestamp: new Date(),
      status: 'active'
    };
  }

  async createHighValueErrorAlert(highValueErrors) {
    this.lastAlertTime['HIGH_VALUE_ERROR'] = Date.now();

    return {
      id: `alert_${Date.now()}_highvalue`,
      type: 'HIGH_VALUE_ERROR',
      severity: 'HIGH',
      title: `💰 Critical Error Code Detected`,
      description: `${highValueErrors.length} occurrences of business-critical errors`,
      topErrors: this.getTopErrors(highValueErrors),
      affectedUsers: new Set(highValueErrors.map(log => log.userId)).size,
      suggestedAction: 'Review payment/auth systems immediately',
      runbook: [
        'Check payment gateway connectivity',
        'Review database connection pool',
        'Check authentication service health',
        'Consider enabling circuit breaker'
      ],
      timestamp: new Date(),
      status: 'active'
    };
  }

  async createHighImpactAlert(errorLogs, affectedUsers) {
    this.lastAlertTime['HIGH_IMPACT'] = Date.now();

    return {
      id: `alert_${Date.now()}_impact`,
      type: 'HIGH_USER_IMPACT',
      severity: 'HIGH',
      title: `👥 Multiple Users Affected: ${affectedUsers} users`,
      description: `${errorLogs.length} errors affecting ${affectedUsers} unique users`,
      affectedUsers,
      topErrors: this.getTopErrors(errorLogs),
      estimatedRevenueLoss: `$${(affectedUsers * 50).toFixed(2)}`,
      suggestedAction: 'High user impact - prioritize resolution',
      runbook: [
        'Notify customer support team',
        'Prepare customer communication',
        'Fix underlying issue ASAP',
        'Consider compensation for affected users'
      ],
      timestamp: new Date(),
      status: 'active'
    };
  }

  getTopErrors(errorLogs) {
    const errorCounts = {};
    errorLogs.forEach(log => {
      const key = log.errorCode || log.message?.substring(0, 50) || 'unknown';
      errorCounts[key] = (errorCounts[key] || 0) + 1;
    });

    return Object.entries(errorCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([error, count]) => ({ error, count }));
  }

  getRecentAlerts(limit = 10) {
    return this.recentAlerts.slice(0, limit);
  }

  acknowledgeAlert(alertId) {
    const alert = this.recentAlerts.find(a => a.id === alertId);
    if (alert) {
      alert.status = 'acknowledged';
      alert.acknowledgedAt = new Date();
    }
    return alert;
  }

  resolveAlert(alertId) {
    const alert = this.recentAlerts.find(a => a.id === alertId);
    if (alert) {
      alert.status = 'resolved';
      alert.resolvedAt = new Date();
    }
    return alert;
  }
}

// Create singleton instance
const smartAlertEngine = new SmartAlertEngine();

// Auto-run every 5 minutes
setInterval(async () => {
  await smartAlertEngine.evaluateAlerts();
}, 5 * 60 * 1000);

// Run once on startup after 30 seconds
setTimeout(async () => {
  console.log('🚀 Running initial smart alert check...');
  await smartAlertEngine.evaluateAlerts();
}, 30000);

module.exports = { smartAlertEngine };