const Queue = require('bull');
const Log = require('../models/Log');

// Create a queue for processing logs
const logQueue = new Queue('log-processing', {
  redis: {
    host: '127.0.0.1',
    port: 6379
  },
  settings: {
    maxStalledCount: 3, // Retry failed jobs 3 times
    lockDuration: 30000, // Lock for 30 seconds
  }
});

// Process logs in batches for better performance
async function processBatch(logs) {
  try {
    if (!logs || logs.length === 0) {
      console.log('⚠️ Empty batch received, skipping...');
      return [];
    }
    
    // Bulk insert into MongoDB (MUCH faster than one-by-one)
    const result = await Log.insertMany(logs, { ordered: false });
    
    console.log(`✅ Batch saved: ${result.length} logs inserted`);
    return result;
  } catch (error) {
    console.error('❌ Batch insert error:', error.message);
    
    // If batch fails, try individual inserts as fallback
    let successCount = 0;
    for (const logData of logs) {
      try {
        await new Log(logData).save();
        successCount++;
      } catch (e) {
        console.error('Failed to save individual log:', e.message);
      }
    }
    console.log(`⚠️ Fallback: ${successCount}/${logs.length} logs saved individually`);
    return successCount;
  }
}

// Define queue processor - UPDATED to handle both single logs and batches
logQueue.process(async (job) => {
  const { logData, logs } = job.data;
  
  // Handle batch processing (from /api/logs/batch endpoint)
  if (logs && Array.isArray(logs)) {
    console.log(`📦 Processing batch of ${logs.length} logs`);
    await processBatch(logs);
    return { success: true, message: `Batch of ${logs.length} logs processed` };
  }
  
  // Handle single log processing (from /api/logs endpoint)
  if (logData) {
    console.log(`📄 Processing single log: ${logData.level} - ${logData.message}`);
    await processBatch([logData]); // Process as batch of 1
    return { success: true, message: 'Single log processed' };
  }
  
  // If neither format is found
  console.error('❌ Invalid job data format:', job.data);
  throw new Error('Invalid job data format');
});

// Queue event listeners
logQueue.on('completed', (job, result) => {
  // Log completion for debugging
  console.log(`✅ Job ${job.id} completed: ${result.message}`);
});

logQueue.on('failed', (job, err) => {
  console.error(`❌ Job ${job.id} failed:`, err.message);
});

logQueue.on('error', (error) => {
  console.error('❌ Queue error:', error);
});

logQueue.on('stalled', (job) => {
  console.warn(`⚠️ Job ${job.id} stalled, will be retried`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('🛑 Shutting down queue gracefully...');
  await logQueue.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('🛑 Shutting down queue gracefully...');
  await logQueue.close();
  process.exit(0);
});

module.exports = { logQueue };