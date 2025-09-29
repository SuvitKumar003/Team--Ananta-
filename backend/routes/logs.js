const express = require('express');
const router = express.Router();
const Log = require('../models/Log');
const { logQueue } = require('../services/logQueue');

// 📥 POST /api/logs - Receive new log (ULTRA FAST - just queue it)
router.post('/', async (req, res) => {
  try {
    const logData = req.body;
    
    // Validate essential fields
    if (!logData.level || !logData.message) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: level and message'
      });
    }
    
    // Add single log to queue
    await logQueue.add({ logData }, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 1000
      },
      removeOnComplete: true,
      removeOnFail: false
    });
    
    // Respond immediately (don't wait for database)
    res.status(202).json({
      success: true,
      message: 'Log queued for processing'
    });
    
  } catch (error) {
    console.error('❌ Error queueing log:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to queue log',
      error: error.message
    });
  }
});

// 📥 POST /api/logs/batch - Receive multiple logs at once (EVEN FASTER!)
router.post('/batch', async (req, res) => {
  try {
    const { logs } = req.body;
    
    if (!Array.isArray(logs) || logs.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid batch: expected array of logs'
      });
    }
    
    console.log(`📦 Received batch of ${logs.length} logs, queuing for processing...`);
    
    // Add the entire batch as one job (more efficient)
    await logQueue.add({ logs }, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 1000
      },
      removeOnComplete: true,
      removeOnFail: false
    });
    
    res.status(202).json({
      success: true,
      message: `Batch of ${logs.length} logs queued for processing`
    });
    
  } catch (error) {
    console.error('❌ Error queueing batch:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to queue batch',
      error: error.message
    });
  }
});

// 📊 GET /api/logs - Get logs with filters and pagination
router.get('/', async (req, res) => {
  try {
    const { 
      level, 
      limit = 100, 
      page = 1,
      anomalyOnly,
      startDate,
      endDate 
    } = req.query;
    
    let query = {};
    
    if (level) {
      query.level = level;
    }
    
    if (anomalyOnly === 'true') {
      query.anomalyDetected = true;
    }
    
    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) query.timestamp.$gte = new Date(startDate);
      if (endDate) query.timestamp.$lte = new Date(endDate);
    }
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const [logs, total] = await Promise.all([
      Log.find(query)
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(), // Use lean() for faster queries (returns plain JS objects)
      Log.countDocuments(query)
    ]);
    
    res.json({
      success: true,
      page: parseInt(page),
      limit: parseInt(limit),
      total: total,
      pages: Math.ceil(total / parseInt(limit)),
      logs: logs
    });
    
  } catch (error) {
    console.error('❌ Error fetching logs:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch logs',
      error: error.message
    });
  }
});

// 📈 GET /api/logs/stats - Get statistics
router.get('/stats', async (req, res) => {
  try {
    const [stats, recentErrors] = await Promise.all([
      Log.aggregate([
        {
          $group: {
            _id: '$level',
            count: { $sum: 1 }
          }
        }
      ]),
      Log.find({ level: { $in: ['ERROR', 'CRITICAL'] } })
        .sort({ timestamp: -1 })
        .limit(10)
        .lean()
    ]);
    
    const anomalies = await Log.countDocuments({ anomalyDetected: true });
    const totalLogs = await Log.countDocuments();
    
    // Format stats
    const formattedStats = {
      total: totalLogs,
      anomalies: anomalies,
      byLevel: {}
    };
    
    stats.forEach(item => {
      formattedStats.byLevel[item._id] = item.count;
    });
    
    res.json({
      success: true,
      stats: formattedStats,
      recentErrors: recentErrors
    });
    
  } catch (error) {
    console.error('❌ Error fetching stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get stats',
      error: error.message
    });
  }
});

// 🗑️ DELETE /api/logs/cleanup - Clean old logs (optional)
router.delete('/cleanup', async (req, res) => {
  try {
    const { daysOld = 7 } = req.query;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - parseInt(daysOld));
    
    const result = await Log.deleteMany({
      timestamp: { $lt: cutoffDate }
    });
    
    res.json({
      success: true,
      message: `Deleted ${result.deletedCount} logs older than ${daysOld} days`
    });
    
  } catch (error) {
    console.error('❌ Error cleaning logs:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to clean logs',
      error: error.message
    });
  }
});

// 📊 GET /api/logs/queue/stats - Get queue statistics
router.get('/queue/stats', async (req, res) => {
  try {
    const [waiting, active, completed, failed] = await Promise.all([
      logQueue.getWaitingCount(),
      logQueue.getActiveCount(),
      logQueue.getCompletedCount(),
      logQueue.getFailedCount()
    ]);
    
    res.json({
      success: true,
      queue: {
        waiting,
        active,
        completed,
        failed,
        total: waiting + active
      }
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get queue stats',
      error: error.message
    });
  }
});

module.exports = router;