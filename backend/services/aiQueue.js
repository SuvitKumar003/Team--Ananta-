const Queue = require('bull');
const Log = require('../models/Log');
const { analyzeBatchWithCerebras, storeCerebrasResults } = require('./cerebrasService');
const { enrichLogsWithExplanations } = require('./llamaService');

// Create AI processing queue
const aiQueue = new Queue('ai-log-processing', {
  redis: {
  host: process.env.REDIS_HOST || 'redis',
  port: process.env.REDIS_PORT || 6379
}
});

// Process AI analysis jobs
aiQueue.process(async (job) => {
  const { batchSize } = job.data;
  
  console.log(`🤖 AI Queue: Processing batch of ${batchSize} logs...`);
  
  try {
    // 1. Get unprocessed logs from raw collection
    const rawLogs = await Log.find({
      // Get logs not yet analyzed by Cerebras
      _id: {
        $nin: await require('../models/CerebrasLog').distinct('originalLogId')
      }
    })
    .sort({ timestamp: -1 })
    .limit(batchSize)
    .lean();
    
    if (rawLogs.length === 0) {
      console.log('ℹ️ No new logs to process');
      return { success: true, processed: 0 };
    }
    
    // 2. Send to Cerebras for analysis
    const analysisResults = await analyzeBatchWithCerebras(rawLogs);
    
    // 3. Store Cerebras results
    await storeCerebrasResults(rawLogs, analysisResults);
    
    // 4. Get unique clusters that need LLaMA explanations
    const clusters = [...new Set(analysisResults.map(r => r.clusterLabel))];
    
    // 5. Generate LLaMA explanations for high-severity clusters
    for (const cluster of clusters) {
      const clusterLogs = analysisResults.filter(r => r.clusterLabel === cluster);
      const avgScore = clusterLogs.reduce((sum, l) => sum + l.anomalyScore, 0) / clusterLogs.length;
      
      // Only explain clusters with high anomaly scores
      if (avgScore > 0.6) {
        await enrichLogsWithExplanations(cluster);
      }
    }
    
    console.log(`✅ AI processing completed: ${rawLogs.length} logs analyzed`);
    
    return {
      success: true,
      processed: rawLogs.length,
      clusters: clusters.length
    };
    
  } catch (error) {
    console.error('❌ AI Queue processing error:', error.message);
    throw error;
  }
});

// Queue event listeners
aiQueue.on('completed', (job, result) => {
  console.log(`✅ AI Job ${job.id} completed:`, result);
});

aiQueue.on('failed', (job, err) => {
  console.error(`❌ AI Job ${job.id} failed:`, err.message);
});

module.exports = { aiQueue };