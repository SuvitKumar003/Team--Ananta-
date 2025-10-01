// backend/routes/timeline.js
const express = require('express');
const router = express.Router();
const Log = require('../models/Log');
const CerebrasLog = require('../models/CerebrasLog');

/**
 * GET /api/timeline/session/:sessionId
 * Get complete user journey timeline for a session
 */
router.get('/session/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;

    // Find all logs for this session
    const sessionLogs = await Log.find({ sessionId })
      .sort({ timestamp: 1 }) // Chronological order
      .lean();

    if (sessionLogs.length === 0) {
      return res.json({
        success: false,
        message: 'No logs found for this session'
      });
    }

    // Get AI analysis for error logs
    const errorLogIds = sessionLogs
      .filter(log => log.level === 'ERROR' || log.level === 'CRITICAL')
      .map(log => log._id);

    const aiAnalysis = await CerebrasLog.find({
      originalLogId: { $in: errorLogIds }
    }).lean();

    // Build timeline
    const timeline = sessionLogs.map(log => {
      const analysis = aiAnalysis.find(
        ai => ai.originalLogId.toString() === log._id.toString()
      );

      return {
        timestamp: log.timestamp,
        action: deriveUserAction(log),
        level: log.level,
        endpoint: log.endpoint,
        message: log.message,
        city: log.city,
        responseTime: log.responseTime,
        errorCode: log.errorCode,
        // AI insights if available
        ...(analysis && {
          anomalyDetected: analysis.anomalyDetected,
          anomalyScore: analysis.anomalyScore,
          rootCause: analysis.rootCause,
          suggestedFix: analysis.suggestedFix,
          aiExplanation: analysis.aiExplanation
        })
      };
    });

    // Find error moments
    const errorIndex = timeline.findIndex(
      event => event.level === 'ERROR' || event.level === 'CRITICAL'
    );

    const leadingEvents = errorIndex > 0 
      ? timeline.slice(Math.max(0, errorIndex - 5), errorIndex)
      : [];

    const errorEvent = errorIndex >= 0 ? timeline[errorIndex] : null;

    // Build summary
    const duration = calculateDuration(timeline);
    
    res.json({
      success: true,
      sessionId,
      summary: {
        totalEvents: timeline.length,
        duration,
        userLocation: sessionLogs[0]?.city,
        errorOccurred: !!errorEvent,
        errorTimestamp: errorEvent?.timestamp
      },
      timeline,
      errorAnalysis: errorEvent ? {
        whatHappened: errorEvent.message,
        whyItHappened: errorEvent.rootCause,
        howToFix: errorEvent.suggestedFix,
        userImpact: deriveUserImpact(errorEvent, leadingEvents),
        leadingActions: leadingEvents.map(e => e.action)
      } : null
    });

  } catch (error) {
    console.error('Timeline error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/timeline/blast-radius/:errorCode
 * Get "blast radius" - how many users affected by same error
 */
router.get('/blast-radius/:errorCode', async (req, res) => {
  try {
    const { errorCode } = req.params;
    const hours = parseInt(req.query.hours) || 1;
    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);

    // Find all logs with same error code
    const affectedLogs = await Log.find({
      errorCode,
      timestamp: { $gte: cutoff }
    }).lean();

    if (affectedLogs.length === 0) {
      return res.json({
        success: true,
        blastRadius: {
          errorCode,
          affectedUsers: 0,
          totalOccurrences: 0,
          message: 'No occurrences found in specified time range'
        }
      });
    }

    const uniqueUsers = new Set(affectedLogs.map(l => l.userId)).size;
    const uniqueCities = new Set(affectedLogs.map(l => l.city));
    const uniqueEndpoints = new Set(affectedLogs.map(l => l.endpoint));

    // Group by time to see error spike pattern
    const errorsByMinute = {};
    affectedLogs.forEach(log => {
      const minute = new Date(log.timestamp).toISOString().slice(0, 16);
      errorsByMinute[minute] = (errorsByMinute[minute] || 0) + 1;
    });

    const peakMinute = Object.entries(errorsByMinute)
      .sort((a, b) => b[1] - a[1])[0];

    res.json({
      success: true,
      blastRadius: {
        errorCode,
        timeRange: `Last ${hours} hour(s)`,
        affectedUsers: uniqueUsers,
        affectedCities: Array.from(uniqueCities),
        affectedEndpoints: Array.from(uniqueEndpoints),
        totalOccurrences: affectedLogs.length,
        peakTime: peakMinute ? {
          time: peakMinute[0],
          count: peakMinute[1]
        } : null,
        timeline: errorsByMinute,
        estimatedRevenueLoss: `$${(uniqueUsers * 50).toFixed(2)}`
      }
    });

  } catch (error) {
    console.error('Blast radius error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/timeline/recent-sessions
 * Get recent sessions with errors
 */
router.get('/recent-sessions', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const hours = parseInt(req.query.hours) || 1;
    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);

    // Find sessions with errors
    const errorLogs = await Log.find({
      timestamp: { $gte: cutoff },
      $or: [{ level: 'ERROR' }, { level: 'CRITICAL' }]
    })
      .sort({ timestamp: -1 })
      .limit(limit * 3) // Get more to ensure unique sessions
      .lean();

    // Group by session
    const sessionMap = {};
    errorLogs.forEach(log => {
      if (!sessionMap[log.sessionId]) {
        sessionMap[log.sessionId] = {
          sessionId: log.sessionId,
          userId: log.userId,
          city: log.city,
          firstError: log.timestamp,
          errorCount: 0,
          errors: []
        };
      }
      sessionMap[log.sessionId].errorCount++;
      if (sessionMap[log.sessionId].errors.length < 3) {
        sessionMap[log.sessionId].errors.push({
          level: log.level,
          message: log.message,
          timestamp: log.timestamp
        });
      }
    });

    const sessions = Object.values(sessionMap).slice(0, limit);

    res.json({
      success: true,
      sessions,
      total: sessions.length
    });

  } catch (error) {
    console.error('Recent sessions error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Helper functions
function deriveUserAction(log) {
  if (log.endpoint?.includes('/cart')) return '🛒 Added to cart';
  if (log.endpoint?.includes('/payment')) return '💳 Payment attempt';
  if (log.endpoint?.includes('/events')) return '🎭 Browsed events';
  if (log.endpoint?.includes('/login')) return '🔐 Logged in';
  if (log.endpoint === '/') return '🏠 Visited homepage';
  if (log.level === 'ERROR') return '❌ Error occurred';
  if (log.level === 'CRITICAL') return '🚨 Critical error';
  return log.message?.substring(0, 50) || '📝 Action';
}

function calculateDuration(timeline) {
  if (timeline.length < 2) return '0 seconds';
  const start = new Date(timeline[0].timestamp);
  const end = new Date(timeline[timeline.length - 1].timestamp);
  const diffMs = end - start;
  const minutes = Math.floor(diffMs / 60000);
  const seconds = Math.floor((diffMs % 60000) / 1000);
  
  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }
  return `${seconds}s`;
}

function deriveUserImpact(errorEvent, leadingEvents) {
  const actions = leadingEvents.map(e => e.action).join(' → ');
  return `User completed: ${actions}, but failed at: ${errorEvent.action}. This likely caused frustration and potential revenue loss.`;
}

module.exports = router;