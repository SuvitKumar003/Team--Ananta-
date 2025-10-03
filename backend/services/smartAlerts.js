// backend/services/smartAlerts.js
const CerebrasLog = require('../models/CerebrasLog');
const Log = require('../models/Log');
const Alert = require('../models/Alert'); // NEW: Import Alert model

const ALERT_RULES = {
  criticalEndpoints: ['/payment', '/checkout', '/login', '/api/payment'],
  spikeThreshold: 0.5,
  minAffectedUsers: 5,
  criticalErrorCodes: [
    'PAYMENT_GATEWAY_DOWN',
    'DATABASE_UNAVAILABLE', 
    'AUTH_SERVICE_DOWN',
    'CARD_DECLINED',
    'PAYMENT_GATEWAY_TIMEOUT'
  ],
  alertCooldown: 5 * 60 * 1000
};

class SmartAlertEngine {
  constructor() {
    this.baselineErrorRate = 0;
    this.lastAlertTime = {};
  }

  async evaluateAlerts() {
    try {
      console.log('🔔 Evaluating smart alerts...');

      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
      
      const [recentLogs, previousLogs] = await Promise.all([
        Log.find({ timestamp: { $gte: fiveMinutesAgo } }).lean(),
        Log.find({ 
          timestamp: { $gte: tenMinutesAgo, $lt: fiveMinutesAgo } 
        }).lean()
      ]);

      const currentErrorRate = this.calculateErrorRate(recentLogs);
      const previousErrorRate = this.calculateErrorRate(previousLogs);

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

      // CHANGED: Save alerts to MongoDB instead of memory
      const savedAlerts = [];
      for (const alertData of filteredAlerts) {
        try {
          const alert = new Alert(alertData);
          await alert.save();
          savedAlerts.push(alert);
          console.log(`✅ Alert saved: ${alert.title}`);
        } catch (error) {
          console.error('❌ Failed to save alert:', error.message);
        }
      }

      console.log(`✅ Smart alerts: ${savedAlerts.length} new, ${alerts.length - savedAlerts.length} suppressed`);

      return {
        success: true,
        alerts: savedAlerts,
        suppressed: alerts.length - savedAlerts.length,
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
      alertId: `alert_${Date.now()}_spike`,
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
      status: 'active'
    };
  }

  async createCriticalEndpointAlert(criticalFailures) {
    const endpoints = [...new Set(criticalFailures.map(log => log.endpoint))];
    
    this.lastAlertTime['CRITICAL_ENDPOINT'] = Date.now();

    return {
      alertId: `alert_${Date.now()}_endpoint`,
      type: 'CRITICAL_ENDPOINT_FAILURE',
      severity: 'CRITICAL',
      title: `🚨 Critical Endpoint Failure`,
      description: `${criticalFailures.length} failures on business-critical endpoints: ${endpoints.join(', ')}`,
      affectedEndpoints: endpoints,
      affectedUsers: new Set(criticalFailures.map(log => log.userId)).size,
      affectedLogs: criticalFailures.length,
      topErrors: this.getTopErrors(criticalFailures),
      suggestedAction: 'IMMEDIATE ACTION REQUIRED - Revenue-impacting',
      runbook: [
        'Alert on-call engineer immediately',
        'Check payment gateway / auth service status',
        'Enable backup systems if available',
        'Notify customer support team'
      ],
      status: 'active'
    };
  }

  async createHighValueErrorAlert(highValueErrors) {
    this.lastAlertTime['HIGH_VALUE_ERROR'] = Date.now();

    return {
      alertId: `alert_${Date.now()}_highvalue`,
      type: 'HIGH_VALUE_ERROR',
      severity: 'HIGH',
      title: `💰 Critical Error Code Detected`,
      description: `${highValueErrors.length} occurrences of business-critical errors`,
      topErrors: this.getTopErrors(highValueErrors),
      affectedUsers: new Set(highValueErrors.map(log => log.userId)).size,
      affectedLogs: highValueErrors.length,
      suggestedAction: 'Review payment/auth systems immediately',
      runbook: [
        'Check payment gateway connectivity',
        'Review database connection pool',
        'Check authentication service health',
        'Consider enabling circuit breaker'
      ],
      status: 'active'
    };
  }

  async createHighImpactAlert(errorLogs, affectedUsers) {
    this.lastAlertTime['HIGH_IMPACT'] = Date.now();

    return {
      alertId: `alert_${Date.now()}_impact`,
      type: 'HIGH_USER_IMPACT',
      severity: 'HIGH',
      title: `👥 Multiple Users Affected: ${affectedUsers} users`,
      description: `${errorLogs.length} errors affecting ${affectedUsers} unique users`,
      affectedUsers,
      affectedLogs: errorLogs.length,
      topErrors: this.getTopErrors(errorLogs),
      estimatedRevenueLoss: `$${(affectedUsers * 50).toFixed(2)}`,
      suggestedAction: 'High user impact - prioritize resolution',
      runbook: [
        'Notify customer support team',
        'Prepare customer communication',
        'Fix underlying issue ASAP',
        'Consider compensation for affected users'
      ],
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

  // CHANGED: Get alerts from MongoDB for last 24 hours
  async getRecentAlerts(limit = 100, hours = 24) {
    try {
      const cutoffTime = new Date(Date.now() - hours * 60 * 60 * 1000);
      
      const alerts = await Alert.find({
        createdAt: { $gte: cutoffTime }
      })
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean();

      return alerts;
    } catch (error) {
      console.error('❌ Error fetching recent alerts:', error);
      return [];
    }
  }

  // CHANGED: Acknowledge alert in MongoDB
  async acknowledgeAlert(alertId) {
    try {
      const alert = await Alert.findOneAndUpdate(
        { alertId },
        {
          status: 'acknowledged',
          acknowledgedAt: new Date()
        },
        { new: true }
      );
      
      return alert;
    } catch (error) {
      console.error('❌ Error acknowledging alert:', error);
      return null;
    }
  }

  // CHANGED: Resolve alert in MongoDB
  async resolveAlert(alertId) {
    try {
      const alert = await Alert.findOneAndUpdate(
        { alertId },
        {
          status: 'resolved',
          resolvedAt: new Date()
        },
        { new: true }
      );
      
      return alert;
    } catch (error) {
      console.error('❌ Error resolving alert:', error);
      return null;
    }
  }

  // NEW: Get alert statistics
  async getAlertStats(hours = 24) {
    try {
      const cutoffTime = new Date(Date.now() - hours * 60 * 60 * 1000);
      
      const stats = await Alert.aggregate([
        {
          $match: {
            createdAt: { $gte: cutoffTime }
          }
        },
        {
          $group: {
            _id: '$type',
            count: { $sum: 1 },
            activeCoun: {
              $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] }
            }
          }
        }
      ]);

      const total = await Alert.countDocuments({
        createdAt: { $gte: cutoffTime }
      });

      const active = await Alert.countDocuments({
        createdAt: { $gte: cutoffTime },
        status: 'active'
      });

      return {
        total,
        active,
        byType: stats,
        timeRange: `Last ${hours} hours`
      };
    } catch (error) {
      console.error('❌ Error getting alert stats:', error);
      return null;
    }
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