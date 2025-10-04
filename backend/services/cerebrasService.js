const Queue = require('bull');
const Log = require('../models/Log');
const CerebrasLog = require('../models/CerebrasLog');
const axios = require('axios');

// Create AI analysis queue
const aiAnalysisQueue = new Queue('ai-analysis', {
  redis: {
  host: process.env.REDIS_HOST || 'redis',
  port: process.env.REDIS_PORT || 6379
},
  settings: {
    maxStalledCount: 2,
    lockDuration: 120000, // 2 minutes (AI calls can be slow)
  }
});

// Cerebras API configuration
const CEREBRAS_API_KEY = process.env.CEREBRAS_API_KEY;
const CEREBRAS_API_URL = 'https://api.cerebras.ai/v1/chat/completions';
const AI_MODEL = 'llama-4-scout-17b-16e-instruct';

// Analyze logs with Cerebras AI
async function analyzeLogs(logs) {
  if (!CEREBRAS_API_KEY) {
    console.error('❌ CEREBRAS_API_KEY not found in environment variables');
    return [];
  }

  try {
    console.log(`🧠 Sending ${logs.length} logs to Cerebras for analysis...`);

    // Prepare log summary for AI
    const logSummary = logs.map((log, idx) => ({
      id: idx,
      timestamp: log.timestamp,
      level: log.level,
      message: log.message,
      endpoint: log.endpoint,
      errorCode: log.errorCode,
      errorMessage: log.errorMessage,
      city: log.city,
      responseTime: log.responseTime
    }));

    // Create prompt for Cerebras
    const prompt = `You are an expert log analyzer for a ticket booking platform. Analyze these logs and identify:
1. Any anomalies or critical issues
2. Root causes of errors
3. Suggested fixes
4. Group similar issues into clusters

Logs to analyze:
${JSON.stringify(logSummary, null, 2)}

Return ONLY a valid JSON array (no markdown, no explanation) with this exact structure:
[
  {
    "logId": 0,
    "anomalyDetected": true/false,
    "anomalyScore": 0.0-1.0,
    "severity": "low"/"medium"/"high"/"critical",
    "category": "payment_failure"/"database_error"/"performance"/"other",
    "rootCause": "brief explanation in 1 line",
    "aiExplanation": "storytelling format — explain what happened step by step, why it happened, and what impact it caused, in 3–5 sentences also how it happened like user went to this step then failed here",
    "suggestedFix": "actionable fix in one line",
    "clusterId": "cluster_name",
    "clusterName": "Descriptive cluster name",
    "similarLogsCount": number
  }
]

IMPORTANT: Return ONLY valid JSON array, no other text.`;

    // Call Cerebras API
    const response = await axios.post(
      CEREBRAS_API_URL,
      {
        model: AI_MODEL,
        messages: [
          {
            role: 'system',
            content: 'You are a log analysis expert. Always respond with valid JSON only, no markdown formatting.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.1, // Low temperature for consistent analysis
        max_tokens: 8000,
        response_format: { type: "json_object" } // Force JSON response
      },
      {
        headers: {
          'Authorization': `Bearer ${CEREBRAS_API_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: 60000 // 60 second timeout
      }
    );

    // Extract AI response
    let aiResponse = response.data.choices[0].message.content;
    
    // Clean up response (remove markdown if present)
    aiResponse = aiResponse.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    
    console.log('📝 Raw AI Response (first 500 chars):', aiResponse.substring(0, 500));

    // Parse JSON response
    let analysisResults;
    try {
      // Try to parse as array first
      analysisResults = JSON.parse(aiResponse);
      
      // If it's an object with an array inside, extract it
      if (!Array.isArray(analysisResults)) {
        if (analysisResults.analyses) {
          analysisResults = analysisResults.analyses;
        } else if (analysisResults.results) {
          analysisResults = analysisResults.results;
        } else {
          // Convert single object to array
          analysisResults = [analysisResults];
        }
      }
    } catch (parseError) {
      console.error('❌ Failed to parse Cerebras response:', parseError.message);
      console.error('Raw response:', aiResponse);
      
      // Return default analysis for all logs
      return logs.map((log, idx) => ({
        logId: idx,
        anomalyDetected: log.level === 'ERROR' || log.level === 'CRITICAL',
        anomalyScore: log.level === 'CRITICAL' ? 0.9 : log.level === 'ERROR' ? 0.7 : 0.1,
        severity: log.level === 'CRITICAL' ? 'critical' : log.level === 'ERROR' ? 'high' : 'low',
        category: 'parsing_error',
        rootCause: 'AI analysis failed - JSON parsing error',
        aiExplanation: 'Unable to parse AI response',
        suggestedFix: 'Review AI prompt and response format',
        clusterId: 'unknown',
        clusterName: 'Unparsed Logs',
        similarLogsCount: 1
      }));
    }

    console.log(`✅ Successfully analyzed ${analysisResults.length} logs`);
    return analysisResults;

  } catch (error) {
    console.error('❌ Cerebras API error:', error.response?.data || error.message);
    
    // Return basic analysis on error
    return logs.map((log, idx) => ({
      logId: idx,
      anomalyDetected: log.level === 'ERROR' || log.level === 'CRITICAL',
      anomalyScore: log.level === 'CRITICAL' ? 0.9 : log.level === 'ERROR' ? 0.7 : 0.1,
      severity: log.level === 'CRITICAL' ? 'critical' : log.level === 'ERROR' ? 'high' : 'low',
      category: 'api_error',
      rootCause: 'AI analysis unavailable',
      aiExplanation: `Error: ${error.message}`,
      suggestedFix: 'Check Cerebras API connectivity',
      clusterId: 'error',
      clusterName: 'Analysis Failed',
      similarLogsCount: 1
    }));
  }
}

// Save analyzed logs to CerebrasLog collection
async function saveAnalyzedLogs(logs, analysisResults) {
  const savedLogs = [];

  for (let i = 0; i < logs.length; i++) {
    const log = logs[i];
    const analysis = analysisResults[i] || {};

    try {
      // Create new CerebrasLog document
      const cerebrasLog = new CerebrasLog({
        originalLogId: log._id,
        timestamp: log.timestamp,
        level: log.level,
        message: log.message,
        service: log.service,
        userId: log.userId,
        sessionId: log.sessionId,
        requestId: log.requestId,
        endpoint: log.endpoint,
        city: log.city,
        
        // AI analysis fields
        anomalyDetected: analysis.anomalyDetected || false,
        anomalyScore: analysis.anomalyScore || 0,
        rootCause: analysis.rootCause,
        aiExplanation: analysis.aiExplanation,
        suggestedFix: analysis.suggestedFix,
        severity: analysis.severity || 'low',
        category: analysis.category,
        
        // Clustering
        clusterId: analysis.clusterId,
        clusterName: analysis.clusterName,
        similarLogsCount: analysis.similarLogsCount,
        
        // Metadata
        analyzedAt: new Date(),
        aiModel: AI_MODEL,
        fullAiResponse: analysis
      });

      await cerebrasLog.save();
      savedLogs.push(cerebrasLog);
      
    } catch (error) {
      console.error(`❌ Failed to save analyzed log ${i}:`, error.message);
    }
  }

  return savedLogs;
}

// Process AI analysis queue
aiAnalysisQueue.process(async (job) => {
  const { batchSize = 50 } = job.data;
  
  console.log(`🤖 AI Queue: Processing batch of ${batchSize} logs...`);

  try {
    // Get unanalyzed logs (not in CerebrasLog collection)
    const analyzedLogIds = await CerebrasLog.distinct('originalLogId');
    
    const logs = await Log.find({
      _id: { $nin: analyzedLogIds }
    })
      .sort({ timestamp: -1 })
      .limit(batchSize)
      .lean();

    if (logs.length === 0) {
      console.log('✅ No new logs to analyze');
      return { success: true, processed: 0, clusters: 0 };
    }

    console.log(`📊 Found ${logs.length} unanalyzed logs`);

    // Analyze with Cerebras
    const analysisResults = await analyzeLogs(logs);

    // Save to CerebrasLog collection
    const savedLogs = await saveAnalyzedLogs(logs, analysisResults);

    // Count anomalies and clusters
    const anomalies = savedLogs.filter(l => l.anomalyDetected).length;
    const clusters = new Set(savedLogs.map(l => l.clusterId)).size;

    console.log(`✅ AI processing completed: ${savedLogs.length} logs analyzed`);
    console.log(`🔍 Found ${anomalies} anomalies across ${clusters} clusters`);

    return {
      success: true,
      processed: savedLogs.length,
      anomalies,
      clusters
    };

  } catch (error) {
    console.error('❌ AI analysis job failed:', error.message);
    throw error;
  }
});

// Queue event listeners
aiAnalysisQueue.on('completed', (job, result) => {
  console.log(`✅ AI Job ${job.id} completed:`, result);
});

aiAnalysisQueue.on('failed', (job, err) => {
  console.error(`❌ AI Job ${job.id} failed:`, err.message);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  await aiAnalysisQueue.close();
});

process.on('SIGINT', async () => {
  await aiAnalysisQueue.close();
});

module.exports = { aiAnalysisQueue };