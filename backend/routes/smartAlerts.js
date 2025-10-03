// backend/routes/smartAlerts.js
const express = require('express');
const router = express.Router();
const { smartAlertEngine } = require('../services/smartAlerts');

/**
 * GET /api/alerts
 * Get recent smart alerts
 */
router.get('/', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100;
    const hours = parseInt(req.query.hours) || 24; // Default to 24 hours
    
    const alerts = await smartAlertEngine.getRecentAlerts(limit, hours);
    
    res.json({
      success: true,
      alerts,
      total: alerts.length,
      timeRange: `Last ${hours} hours`
    });
  } catch (error) {
    console.error('Error fetching alerts:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/alerts/stats
 * Get alert statistics for the specified time range
 */
router.get('/stats', async (req, res) => {
  try {
    const hours = parseInt(req.query.hours) || 24;
    const stats = await smartAlertEngine.getAlertStats(hours);
    
    res.json({
      success: true,
      stats
    });
  } catch (error) {
    console.error('Error fetching alert stats:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/alerts/active
 * Get only active (unresolved) alerts
 */
router.get('/active', async (req, res) => {
  try {
    const hours = parseInt(req.query.hours) || 24;
    const Alert = require('../models/Alert');
    
    const cutoffTime = new Date(Date.now() - hours * 60 * 60 * 1000);
    
    const activeAlerts = await Alert.find({
      createdAt: { $gte: cutoffTime },
      status: 'active'
    })
      .sort({ createdAt: -1 })
      .lean();
    
    res.json({
      success: true,
      alerts: activeAlerts,
      total: activeAlerts.length,
      timeRange: `Last ${hours} hours`
    });
  } catch (error) {
    console.error('Error fetching active alerts:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/alerts/evaluate
 * Manually trigger alert evaluation
 */
router.post('/evaluate', async (req, res) => {
  try {
    const result = await smartAlertEngine.evaluateAlerts();
    res.json(result);
  } catch (error) {
    console.error('Error evaluating alerts:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/alerts/:alertId/acknowledge
 * Acknowledge an alert
 */
router.post('/:alertId/acknowledge', async (req, res) => {
  try {
    const { alertId } = req.params;
    const alert = await smartAlertEngine.acknowledgeAlert(alertId);
    
    if (!alert) {
      return res.status(404).json({
        success: false,
        error: 'Alert not found'
      });
    }
    
    res.json({
      success: true,
      alert
    });
  } catch (error) {
    console.error('Error acknowledging alert:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/alerts/:alertId/resolve
 * Resolve an alert
 */
router.post('/:alertId/resolve', async (req, res) => {
  try {
    const { alertId } = req.params;
    const alert = await smartAlertEngine.resolveAlert(alertId);
    
    if (!alert) {
      return res.status(404).json({
        success: false,
        error: 'Alert not found'
      });
    }
    
    res.json({
      success: true,
      alert
    });
  } catch (error) {
    console.error('Error resolving alert:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/alerts/type/:type
 * Get alerts by type (ERROR_SPIKE, CRITICAL_ENDPOINT_FAILURE, etc.)
 */
router.get('/type/:type', async (req, res) => {
  try {
    const { type } = req.params;
    const hours = parseInt(req.query.hours) || 24;
    const Alert = require('../models/Alert');
    
    const cutoffTime = new Date(Date.now() - hours * 60 * 60 * 1000);
    
    const alerts = await Alert.find({
      createdAt: { $gte: cutoffTime },
      type
    })
      .sort({ createdAt: -1 })
      .lean();
    
    res.json({
      success: true,
      alerts,
      total: alerts.length,
      type,
      timeRange: `Last ${hours} hours`
    });
  } catch (error) {
    console.error('Error fetching alerts by type:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;