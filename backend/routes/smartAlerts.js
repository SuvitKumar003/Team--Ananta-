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
    const limit = parseInt(req.query.limit) || 10;
    const alerts = smartAlertEngine.getRecentAlerts(limit);
    
    res.json({
      success: true,
      alerts,
      total: alerts.length
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
    const alert = smartAlertEngine.acknowledgeAlert(alertId);
    
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
    const alert = smartAlertEngine.resolveAlert(alertId);
    
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

module.exports = router;