const axios = require('axios');
const CerebrasLog = require('../models/CerebrasLog');

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_API_KEY = process.env.GROQ_API_KEY;

/**
 * Generate natural language explanation for a cluster of errors
 */
async function explainErrorCluster(clusterLabel, logs) {
  try {
    console.log(`🤖 Generating LLaMA explanation for cluster: ${clusterLabel}`);
    
    // Prepare log context
    const logContext = logs.map(log => ({
      timestamp: log.timestamp,
      level: log.level,
      message: log.message,
      anomalyScore: log.anomalyScore
    }));
    
    const prompt = `You are an expert DevOps engineer analyzing application errors.

ERROR CLUSTER: "${clusterLabel}"
AFFECTED LOGS (${logs.length} instances):
${JSON.stringify(logContext, null, 2)}

Provide a concise analysis with:
1. ROOT CAUSE: What's causing these errors?
2. IMPACT: How severe is this issue?
3. SUGGESTED FIX: What actions should developers take?

Keep response under 200 words, technical but clear.`;

    const response = await axios.post(
      GROQ_API_URL,
      {
        model: 'llama-3.1-70b-versatile', // Fast LLaMA via Groq
        messages: [
          {
            role: 'system',
            content: 'You are a senior DevOps engineer providing actionable error analysis.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 300
      },
      {
        headers: {
          'Authorization': `Bearer ${GROQ_API_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: 15000
      }
    );
    
    const explanation = response.data.choices[0].message.content;
    console.log(`✅ LLaMA explanation generated for ${clusterLabel}`);
    
    return explanation;
    
  } catch (error) {
    console.error('❌ LLaMA API error:', error.message);
    return 'Unable to generate explanation at this time.';
  }
}

/**
 * Add LLaMA explanation to Cerebras logs
 */
async function enrichLogsWithExplanations(clusterLabel) {
  try {
    // Get logs from this cluster
    const logs = await CerebrasLog.find({ 
      clusterLabel,
      isExplained: false 
    }).limit(50);
    
    if (logs.length === 0) return;
    
    // Generate explanation
    const explanation = await explainErrorCluster(clusterLabel, logs);
    
    // Update all logs in this cluster
    await CerebrasLog.updateMany(
      { clusterLabel, isExplained: false },
      {
        $set: {
          aiExplanation: explanation,
          isExplained: true
        }
      }
    );
    
    console.log(`✅ Added LLaMA explanation to ${logs.length} logs in cluster "${clusterLabel}"`);
    
  } catch (error) {
    console.error('❌ Error enriching logs with LLaMA:', error.message);
  }
}

module.exports = {
  explainErrorCluster,
  enrichLogsWithExplanations
};