// backend/services/aiSearchService.js
const axios = require('axios');
const CerebrasLog = require('../models/CerebrasLog');
const Log = require('../models/Log');

const CEREBRAS_API_KEY = process.env.CEREBRAS_API_KEY;
const CEREBRAS_API_URL = 'https://api.cerebras.ai/v1/chat/completions';

/**
 * AI-Powered Natural Language Log Search
 * This is the MAIN function that powers the AI Copilot Chat
 */
async function aiLogSearch(userQuery, timeRange = 24) {
  console.log(`🔍 AI Copilot Search: "${userQuery}"`);

  try {
    // Step 1: Get recent logs (last 24 hours by default)
    const cutoffTime = new Date(Date.now() - timeRange * 60 * 60 * 1000);
    
    // Fetch both raw logs and AI-analyzed logs
    const [rawLogs, aiLogs] = await Promise.all([
      Log.find({
        timestamp: { $gte: cutoffTime },
        $or: [
          { level: 'ERROR' },
          { level: 'CRITICAL' },
          { level: 'WARN' }
        ]
      })
        .sort({ timestamp: -1 })
        .limit(500)
        .lean(),
      
      CerebrasLog.find({
        timestamp: { $gte: cutoffTime },
        anomalyDetected: true
      })
        .sort({ anomalyScore: -1 })
        .limit(100)
        .lean()
    ]);

    console.log(`📊 Found ${rawLogs.length} raw logs, ${aiLogs.length} AI-analyzed logs`);

    if (rawLogs.length === 0) {
      return {
        success: true,
        answer: "No critical issues found in the specified time range. Your system looks healthy! ✅",
        relevantLogs: [],
        totalLogsAnalyzed: 0
      };
    }

    // Step 2: Prepare condensed log context for AI
    const logContext = prepareLogContext(rawLogs, aiLogs);

    // Step 3: Create AI prompt for semantic search
    const prompt = createSearchPrompt(userQuery, logContext, timeRange);

    // Step 4: Call Cerebras AI
    console.log('🧠 Calling Cerebras AI...');
    const aiResponse = await callCerebrasAI(prompt);

    // Step 5: Parse AI response
    const analysis = parseAIResponse(aiResponse);

    // Step 6: Find relevant logs based on AI's analysis
    const relevantLogs = findRelevantLogs(rawLogs, aiLogs, analysis);

    console.log(`✅ AI Search completed: ${relevantLogs.length} relevant logs found`);

    return {
      success: true,
      query: userQuery,
      answer: analysis.answer || 'Analysis completed.',
      rootCause: analysis.rootCause,
      impact: analysis.impact,
      suggestedFixes: analysis.suggestedFixes || [],
      timeline: analysis.timeline,
      relevantLogs: relevantLogs.slice(0, 10), // Return top 10
      totalLogsAnalyzed: rawLogs.length,
      analysisTime: new Date().toISOString()
    };

  } catch (error) {
    console.error('❌ AI Search error:', error.message);
    
    return {
      success: false,
      error: 'Failed to analyze logs with AI',
      details: error.message
    };
  }
}

/**
 * Prepare condensed log context for AI
 */
function prepareLogContext(rawLogs, aiLogs) {
  // Group logs by error type/message for better context
  const errorGroups = {};
  
  rawLogs.forEach(log => {
    const key = log.errorCode || log.message?.substring(0, 50) || 'unknown';
    
    if (!errorGroups[key]) {
      errorGroups[key] = {
        errorType: key,
        count: 0,
        level: log.level,
        cities: new Set(),
        endpoints: new Set(),
        firstSeen: log.timestamp,
        lastSeen: log.timestamp,
        samples: []
      };
    }
    
    errorGroups[key].count++;
    if (log.city) errorGroups[key].cities.add(log.city);
    if (log.endpoint) errorGroups[key].endpoints.add(log.endpoint);
    if (new Date(log.timestamp) > new Date(errorGroups[key].lastSeen)) {
      errorGroups[key].lastSeen = log.timestamp;
    }
    
    // Keep a few samples
    if (errorGroups[key].samples.length < 3) {
      errorGroups[key].samples.push({
        timestamp: log.timestamp,
        message: log.message,
        city: log.city,
        endpoint: log.endpoint
      });
    }
  });

  // Convert to array and format
  const formattedGroups = Object.values(errorGroups).map(group => ({
    errorType: group.errorType,
    occurrences: group.count,
    level: group.level,
    affectedCities: Array.from(group.cities),
    affectedEndpoints: Array.from(group.endpoints),
    firstSeen: group.firstSeen,
    lastSeen: group.lastSeen,
    samples: group.samples
  }));

  // Add AI analysis context
  const aiContext = aiLogs.slice(0, 20).map(log => ({
    message: log.message,
    anomalyScore: log.anomalyScore,
    rootCause: log.rootCause,
    severity: log.severity,
    clusterName: log.clusterName
  }));

  return {
    errorGroups: formattedGroups.slice(0, 10), // Top 10 error groups
    aiAnalysis: aiContext,
    stats: {
      totalErrors: rawLogs.length,
      criticalCount: rawLogs.filter(l => l.level === 'CRITICAL').length,
      errorCount: rawLogs.filter(l => l.level === 'ERROR').length,
      warnCount: rawLogs.filter(l => l.level === 'WARN').length
    }
  };
}

/**
 * Create AI prompt for search
 */
function createSearchPrompt(userQuery, logContext, timeRange) {
  return `You are an expert DevOps engineer analyzing production logs.

USER QUESTION: "${userQuery}"

TIME RANGE: Last ${timeRange} hours

LOG SUMMARY:
- Total Errors: ${logContext.stats.totalErrors}
- Critical: ${logContext.stats.criticalCount}
- Error: ${logContext.stats.errorCount}
- Warning: ${logContext.stats.warnCount}

TOP ERROR PATTERNS:
${JSON.stringify(logContext.errorGroups, null, 2)}

AI ANOMALY ANALYSIS:
${JSON.stringify(logContext.aiAnalysis, null, 2)}

Your task:
1. Answer the user's question directly and clearly
2. Identify the ROOT CAUSE if asking about failures
3. Explain the IMPACT (how many users/requests affected)
4. Provide ACTIONABLE fixes (step-by-step)
5. Suggest a TIMELINE if relevant (when did this start?)

Respond in JSON format:
{
  "answer": "Direct, clear answer in 2-3 sentences",
  "rootCause": "Technical explanation of what's causing the issue",
  "impact": "How many users/requests affected, revenue impact if severe",
  "suggestedFixes": ["Fix 1", "Fix 2", "Fix 3"],
  "timeline": "When this issue started and current status",
  "relevantErrorTypes": ["error_code_1", "error_code_2"]
}

IMPORTANT: Be concise, technical but clear. Focus on actionable insights.`;
}

/**
 * Call Cerebras AI
 */
async function callCerebrasAI(prompt) {
  if (!CEREBRAS_API_KEY) {
    throw new Error('CEREBRAS_API_KEY not configured');
  }

  const response = await axios.post(
    CEREBRAS_API_URL,
    {
      model: 'llama-4-scout-17b-16e-instruct',
      messages: [
        {
          role: 'system',
          content: 'You are a senior DevOps engineer specializing in log analysis and incident response. Always respond with valid JSON only.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.2,
      max_tokens: 2000,
      response_format: { type: "json_object" }
    },
    {
      headers: {
        'Authorization': `Bearer ${CEREBRAS_API_KEY}`,
        'Content-Type': 'application/json'
      },
      timeout: 30000
    }
  );

  return response.data.choices[0].message.content;
}

/**
 * Parse AI response
 */
function parseAIResponse(aiResponse) {
  try {
    // Clean up response
    let cleaned = aiResponse.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    return JSON.parse(cleaned);
  } catch (error) {
    console.error('Failed to parse AI response:', error);
    return {
      answer: 'Analysis completed, but unable to parse detailed response.',
      rootCause: 'Unknown',
      impact: 'Unable to determine',
      suggestedFixes: ['Review logs manually for more details'],
      relevantErrorTypes: []
    };
  }
}

/**
 * Find relevant logs based on AI analysis
 */
function findRelevantLogs(rawLogs, aiLogs, analysis) {
  const relevantErrorTypes = analysis.relevantErrorTypes || [];
  
  // If AI specified error types, filter by those
  if (relevantErrorTypes.length > 0) {
    return rawLogs.filter(log => {
      const logKey = log.errorCode || log.message?.substring(0, 50) || '';
      return relevantErrorTypes.some(errType => 
        logKey.toLowerCase().includes(errType.toLowerCase())
      );
    }).slice(0, 20);
  }
  
  // Otherwise, return highest severity logs
  return rawLogs
    .sort((a, b) => {
      const severityOrder = { CRITICAL: 3, ERROR: 2, WARN: 1, INFO: 0 };
      return (severityOrder[b.level] || 0) - (severityOrder[a.level] || 0);
    })
    .slice(0, 20);
}

/**
 * Get trending issues (for quick insights)
 */
async function getTrendingIssues(hours = 1) {
  try {
    const cutoffTime = new Date(Date.now() - hours * 60 * 60 * 1000);
    
    const trending = await CerebrasLog.aggregate([
      {
        $match: {
          timestamp: { $gte: cutoffTime },
          anomalyDetected: true
        }
      },
      {
        $group: {
          _id: '$clusterName',
          count: { $sum: 1 },
          avgAnomalyScore: { $avg: '$anomalyScore' },
          latestOccurrence: { $max: '$timestamp' },
          severity: { $first: '$severity' },
          rootCause: { $first: '$rootCause' }
        }
      },
      {
        $sort: { count: -1 }
      },
      {
        $limit: 5
      }
    ]);

    return {
      success: true,
      trending,
      timeRange: `Last ${hours} hour(s)`
    };

  } catch (error) {
    console.error('Error getting trending issues:', error);
    return { success: false, error: error.message };
  }
}

module.exports = {
  aiLogSearch,
  getTrendingIssues
};