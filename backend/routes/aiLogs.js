const express = require('express');
const router = express.Router();
const CerebrasLog = require('../models/CerebrasLog');
const { explainErrorCluster } = require('../services/llamaService');

// Get AI-analyzed logs with filters
router.get('/', async (req, res) => {
  try {
    const {
      clusterLabel,
      minAnomalyScore = 0,
      severityLevel,
      limit = 100,
      page = 1
    } = req.query;
    
    let query = {};
    
    if (clusterLabel) query.clusterLabel = clusterLabel;
    if (severityLevel) query.severityLevel = severityLevel;
    if (minAnomalyScore) query.anomalyScore = { $gte: parseFloat(minAnomalyScore) };
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const [logs, total] = await Promise.all([
      CerebrasLog.find(query)
        .sort({ anomalyScore: -1, timestamp: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      CerebrasLog.countDocuments(query)
    ]);
    
    res.json({
      success: true,
      page: parseInt(page),
      total,
      logs
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get top anomalies (critical issues)
router.get('/anomalies', async (req, res) => {
  try {
    const criticalLogs = await CerebrasLog.find({
      anomalyScore: { $gte: 0.7 }
    })
    .sort({ anomalyScore: -1, timestamp: -1 })
    .limit(20)
    .lean();
    
    res.json({
      success: true,
      count: criticalLogs.length,
      anomalies: criticalLogs
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get cluster summary
router.get('/clusters', async (req, res) => {
  try {
    const clusters = await CerebrasLog.aggregate([
      {
        $group: {
          _id: '$clusterLabel',
          count: { $sum: 1 },
          avgAnomalyScore: { $avg: '$anomalyScore' },
          maxSeverity: { $max: '$severityLevel' },
          latestOccurrence: { $max: '$timestamp' }
        }
      },
      {
        $sort: { avgAnomalyScore: -1 }
      }
    ]);
    
    res.json({
      success: true,
      clusters
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get explanation for a specific cluster
router.get('/explain/:clusterLabel', async (req, res) => {
  try {
    const { clusterLabel } = req.params;
    
    // Get sample logs from cluster
    const logs = await CerebrasLog.find({ clusterLabel })
      .sort({ anomalyScore: -1 })
      .limit(10)
      .lean();
    
    if (logs.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Cluster not found'
      });
    }
    
    // Check if already explained
    if (logs[0].aiExplanation) {
      return res.json({
        success: true,
        explanation: logs[0].aiExplanation,
        cached: true
      });
    }
    
    // Generate new explanation
    const explanation = await explainErrorCluster(clusterLabel, logs);
    
    // Update logs with explanation
    await CerebrasLog.updateMany(
      { clusterLabel },
      {
        $set: {
          aiExplanation: explanation,
          isExplained: true
        }
      }
    );
    
    res.json({
      success: true,
      explanation,
      cached: false
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;