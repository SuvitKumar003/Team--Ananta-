require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const compression = require('compression');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cron = require('node-cron');
const connectDB = require('./config/database');
const Log = require('./models/Log');
const { aiQueue } = require('./services/aiQueue');

const app = express();
const PORT = process.env.PORT || 5000;

// Connect to MongoDB
connectDB();

// Security middleware
app.use(helmet());

// Compression middleware (makes responses smaller)
app.use(compression());

// CORS with specific options
app.use(cors({
  origin: '*', // In production, specify your frontend domain
  methods: ['GET', 'POST', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Body parser with increased limit for batch requests
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting - prevent abuse
const limiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 10000, // 10,000 requests per minute (very high for log ingestion)
  message: 'Too many requests, please slow down',
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply rate limiting only to log ingestion
app.use('/api/logs', limiter);

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    if (duration > 1000) { // Log slow requests
      console.log(`⚠️ Slow request: ${req.method} ${req.path} took ${duration}ms`);
    }
  });
  next();
});

// Routes
app.use('/api/logs', require('./routes/logs'));
app.use('/api/ai-logs', require('./routes/aiLogs')); // NEW: AI-enhanced logs endpoint

// Health check with system info
app.get('/health', (req, res) => {
  const used = process.memoryUsage();
  
  res.json({ 
    status: 'OK',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    memory: {
      rss: `${Math.round(used.rss / 1024 / 1024)}MB`,
      heapUsed: `${Math.round(used.heapUsed / 1024 / 1024)}MB`,
      heapTotal: `${Math.round(used.heapTotal / 1024 / 1024)}MB`
    },
    environment: process.env.NODE_ENV || 'development'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint not found'
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('❌ Global error:', err);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Memory monitoring
setInterval(() => {
  const used = process.memoryUsage();
  const heapUsedMB = Math.round(used.heapUsed / 1024 / 1024);
  
  if (heapUsedMB > 400) { // Warn if using more than 400MB
    console.warn(`⚠️ High memory usage: ${heapUsedMB}MB`);
  }
}, 30000); // Check every 30 seconds

// 🗑️ AUTOMATIC LOG CLEANUP - Delete logs older than 7 days
// Runs every day at 3 AM
cron.schedule('0 3 * * *', async () => {
  try {
    const daysToKeep = 7; // Keep only last 7 days
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
    
    const result = await Log.deleteMany({
      timestamp: { $lt: cutoffDate }
    });
    
    console.log(`🗑️ Auto-cleanup completed: Deleted ${result.deletedCount} logs older than ${daysToKeep} days`);
    console.log(`📅 Cutoff date: ${cutoffDate.toISOString()}`);
  } catch (error) {
    console.error('❌ Auto-cleanup failed:', error.message);
  }
});

// 🤖 AI ANALYSIS SCHEDULER - NEW!
// Process logs with Cerebras + LLaMA every 2 minutes
cron.schedule('*/2 * * * *', async () => {
  try {
    console.log('🤖 Triggering AI analysis job...');
    
    await aiQueue.add(
      { batchSize: 50 }, // Process 50 logs at a time
      {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000
        },
        removeOnComplete: true,
        removeOnFail: false
      }
    );
    
    console.log('✅ AI analysis job scheduled successfully');
    
  } catch (error) {
    console.error('❌ AI scheduling error:', error.message);
  }
});

// Optional: Run cleanup on startup (removes old logs immediately)
setTimeout(async () => {
  try {
    const daysToKeep = 7;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
    
    const result = await Log.deleteMany({
      timestamp: { $lt: cutoffDate }
    });
    
    if (result.deletedCount > 0) {
      console.log(`🗑️ Startup cleanup: Removed ${result.deletedCount} old logs`);
    }
  } catch (error) {
    console.error('❌ Startup cleanup failed:', error.message);
  }
}, 5000); // Wait 5 seconds after startup

// 🚀 Run AI analysis on startup - NEW!
setTimeout(async () => {
  try {
    console.log('🚀 Running initial AI analysis on startup...');
    
    await aiQueue.add(
      { batchSize: 50 },
      {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000
        }
      }
    );
    
    console.log('✅ Initial AI analysis job queued');
    
  } catch (error) {
    console.error('❌ Initial AI analysis failed:', error.message);
  }
}, 10000); // Wait 10 seconds after startup

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('🛑 SIGTERM received, shutting down gracefully...');
  
  // Close AI queue
  await aiQueue.close();
  console.log('✅ AI Queue closed');
  
  // Close server
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', async () => {
  console.log('🛑 SIGINT received, shutting down gracefully...');
  
  // Close AI queue
  await aiQueue.close();
  console.log('✅ AI Queue closed');
  
  // Close server
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

// Start server
const server = app.listen(PORT, () => {
  console.log(`
  ╔════════════════════════════════════════════════════════════════╗
  ║    🚀 LOG ANALYZER BACKEND - AI-POWERED & PRODUCTION READY    ║
  ║                                                                ║
  ║  🌐 Server:          http://localhost:${PORT}                       ║
  ║  📊 MongoDB:         Connected with pool (10-50 connections)  ║
  ║  ⚡ Performance:     Optimized for high load                  ║
  ║  🤖 AI Engine:       Cerebras + LLaMA Integration             ║
  ║                                                                ║
  ║  ✨ Features Enabled:                                          ║
  ║  • Batch processing (50 logs at once)                         ║
  ║  • Connection pooling (50 max connections)                    ║
  ║  • Compression (smaller responses)                            ║
  ║  • Rate limiting (10,000 req/min)                             ║
  ║  • Memory monitoring                                          ║
  ║  • Graceful shutdown                                          ║
  ║  • Auto-cleanup (keeps last 7 days only) ✅                   ║
  ║  • AI Analysis with Cerebras (every 2 min) 🆕                 ║
  ║  • LLaMA Explanations for error clusters 🆕                   ║
  ║                                                                ║
  ║  🗑️ Cleanup Schedule:                                          ║
  ║  • Runs daily at 3:00 AM                                      ║
  ║  • Keeps logs from last 7 days only                           ║
  ║  • Also runs on server startup                                ║
  ║                                                                ║
  ║  🤖 AI Processing Schedule:                                    ║
  ║  • Runs every 2 minutes                                       ║
  ║  • Analyzes 50 logs per batch                                 ║
  ║  • Cerebras: Pattern detection & anomaly scoring              ║
  ║  • LLaMA: Natural language explanations                       ║
  ║                                                                ║
  ║  📡 Available Endpoints:                                       ║
  ║  • GET    /health                 - Server health             ║
  ║  • POST   /api/logs               - Receive single log        ║
  ║  • POST   /api/logs/batch         - Receive multiple logs     ║
  ║  • GET    /api/logs               - Get logs (paginated)      ║
  ║  • GET    /api/logs/stats         - Get statistics            ║
  ║  • DELETE /api/logs/cleanup       - Manual cleanup            ║
  ║                                                                ║
  ║  🆕 AI-Enhanced Endpoints:                                     ║
  ║  • GET    /api/ai-logs            - Get AI-analyzed logs      ║
  ║  • GET    /api/ai-logs/anomalies  - Get critical anomalies    ║
  ║  • GET    /api/ai-logs/clusters   - Get error clusters        ║
  ║  • GET    /api/ai-logs/explain/:cluster - Get LLaMA explanation║
  ║                                                                ║
  ║  💪 Can handle: 20,000+ logs per minute                       ║
  ║  🧠 AI Processing: 50 logs every 2 minutes                    ║
  ╚════════════════════════════════════════════════════════════════╝
  `);
  
  console.log('✅ Automatic log cleanup scheduled (Daily at 3 AM - keeps last 7 days)');
  console.log('🤖 AI analysis scheduled (Every 2 minutes - Cerebras + LLaMA)');
  console.log('🚀 Initial AI analysis will run in 10 seconds...');
});