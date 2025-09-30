const axios = require('axios');
const CerebrasLog = require('../models/CerebrasLog');

const CEREBRAS_API_URL = 'https://api.cerebras.ai/v1/chat/completions';
const CEREBRAS_API_KEY = process.env.CEREBRAS_API_KEY;

/**
 * Analyze batch of logs with Cerebras for pattern detection
 */
async function analyzeBatchWithCerebras(rawLogs) {
  try {
    console.log(`🧠 Sending ${rawLogs.length} logs to Cerebras for analysis...`);
    
    // Prepare logs for Cerebras (summarized format)
    const logSummaries = rawLogs.map(log => ({
      id: log._id.toString(),
      timestamp: log.timestamp,
      level: log.level,
      message: log.message,
      errorCode: log.errorCode || 'N/A',
      endpoint: log.endpoint || 'N/A',
      city: log.city || 'N/A'
    }));
    
    // Cerebras prompt for pattern detection
    const prompt = `You are an expert log analyzer. Analyze these application logs and detect patterns, anomalies, and clusters.

LOGS TO ANALYZE:
${JSON.stringify(logSummaries, null, 2)}

TASK:
1. Detect recurring error patterns and cluster them
2. Assign anomaly score (0-1) to each log where:
   - 0.0-0.3 = Normal operation
   - 0.3-0.6 = Minor issue
   - 0.6-0.8 = Significant anomaly
   - 0.8-1.0 = Critical anomaly
3. Group related logs into cluster labels (e.g., "Payment_Gateway_Errors", "Database_Timeouts")
4. Assign severity level: LOW, MEDIUM, HIGH, CRITICAL

Return ONLY valid JSON array with this structure:
[
  {
    "logId": "original_log_id",
    "anomalyScore": 0.75,
    "clusterLabel": "Payment_Gateway_Errors",
    "patternId": "payment_decline_spike",
    "severityLevel": "HIGH"
  }
]`;

    const response = await axios.post(
      CEREBRAS_API_URL,
      {
        model: 'llama3.1-8b', // Fast Cerebras model
        messages: [
          {
            role: 'system',
            content: 'You are a log analysis AI. Return only valid JSON arrays, no markdown.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.1, // Low temperature for consistent results
        max_tokens: 2000
      },
      {
        headers: {
          'Authorization': `Bearer ${CEREBRAS_API_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000 // 10 second timeout
      }
    );
    
    // Parse Cerebras response
    let analysisResults = [];
    try {
      const content = response.data.choices[0].message.content;
      // Remove markdown code blocks if present
      const jsonContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      analysisResults = JSON.parse(jsonContent);
    } catch (parseError) {
      console.error('❌ Failed to parse Cerebras response:', parseError.message);
      return [];
    }
    
    console.log(`✅ Cerebras analyzed ${analysisResults.length} logs successfully`);
    return analysisResults;
    
  } catch (error) {
    console.error('❌ Cerebras API error:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
    return [];
  }
}

/**
 * Store Cerebras analysis results in database
 */
async function storeCerebrasResults(rawLogs, analysisResults) {
  try {
    const cerebrasLogs = [];
    
    for (const result of analysisResults) {
      const originalLog = rawLogs.find(log => log._id.toString() === result.logId);
      
      if (originalLog) {
        cerebrasLogs.push({
          originalLogId: originalLog._id,
          timestamp: originalLog.timestamp,
          level: originalLog.level,
          message: originalLog.message,
          anomalyScore: result.anomalyScore || 0,
          clusterLabel: result.clusterLabel || 'Uncategorized',
          patternId: result.patternId || 'unknown',
          severityLevel: result.severityLevel || 'LOW'
        });
      }
    }
    
    if (cerebrasLogs.length > 0) {
      await CerebrasLog.insertMany(cerebrasLogs, { ordered: false });
      console.log(`✅ Stored ${cerebrasLogs.length} Cerebras-enhanced logs`);
    }
    
  } catch (error) {
    console.error('❌ Error storing Cerebras results:', error.message);
  }
}

module.exports = {
  analyzeBatchWithCerebras,
  storeCerebrasResults
};