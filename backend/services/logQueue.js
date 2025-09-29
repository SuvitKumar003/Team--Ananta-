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

// Batch processing configuration
const BATCH_SIZE = 50; // Process 50 logs at once
const BATCH_TIMEOUT = 1000; // Or after 1 second
let logBatch = [];
let batchTimer = null;

// Process logs in batches for better performance
async function processBatch(logs) {
  try {
    if (logs.length === 0) return;
    
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

// Add log to batch
function addToBatch(logData) {
  logBatch.push(logData);
  
  // If batch is full, process immediately
  if (logBatch.length >= BATCH_SIZE) {
    clearTimeout(batchTimer);
    flushBatch();
  } else {
    // Otherwise, wait for timeout
    if (!batchTimer) {
      batchTimer = setTimeout(flushBatch, BATCH_TIMEOUT);
    }
  }
}

// Flush the current batch
async function flushBatch() {
  if (logBatch.length === 0) return;
  
  const currentBatch = [...logBatch];
  logBatch = [];
  batchTimer = null;
  
  await processBatch(currentBatch);
}

// Define queue processor
logQueue.process(async (job) => {
  const { logData } = job.data;
  
  // Add to batch instead of direct insert
  addToBatch(logData);
  
  return { success: true, message: 'Log queued for batch processing' };
});

// Queue event listeners
logQueue.on('completed', (job, result) => {
  // Silent success (too many logs to print each one)
});

logQueue.on('failed', (job, err) => {
  console.error(`❌ Job ${job.id} failed:`, err.message);
});

logQueue.on('error', (error) => {
  console.error('❌ Queue error:', error);
});

// Graceful shutdown - flush remaining logs
process.on('SIGTERM', async () => {
  console.log('🛑 Shutting down gracefully...');
  await flushBatch();
  await logQueue.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('🛑 Shutting down gracefully...');
  await flushBatch();
  await logQueue.close();
  process.exit(0);
});

// Periodic flush (every 2 seconds) to ensure no logs stuck
setInterval(() => {
  if (logBatch.length > 0) {
    flushBatch();
  }
}, 2000);

module.exports = { logQueue, addToBatch, flushBatch };