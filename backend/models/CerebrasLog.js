const mongoose = require('mongoose');

// New collection for AI-analyzed logs
const CerebrasLogSchema = new mongoose.Schema({
  // Original log data
  originalLogId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Log',
    required: true
  },
  timestamp: {
    type: Date,
    required: true
  },
  level: {
    type: String,
    enum: ['INFO', 'WARN', 'ERROR', 'CRITICAL'],
    required: true
  },
  message: {
    type: String,
    required: true
  },
  service: String,
  userId: String,
  sessionId: String,
  requestId: String,
  endpoint: String,
  city: String,
  
  // AI Analysis Results (from Cerebras)
  anomalyDetected: {
    type: Boolean,
    default: false
  },
  anomalyScore: {
    type: Number,
    min: 0,
    max: 1,
    default: 0
  },
  rootCause: String,
  aiExplanation: String,
  suggestedFix: String,
  severity: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'low'
  },
  category: String, // e.g., 'payment_failure', 'database_error', 'performance'
  
  // Clustering information
  clusterId: String,
  clusterName: String,
  similarLogsCount: Number,
  
  // Analysis metadata
  analyzedAt: {
    type: Date,
    default: Date.now
  },
  aiModel: {
    type: String,
    default: 'llama-4-scout-17b-16e-instruct'
  },
  analysisVersion: {
    type: String,
    default: '1.0'
  },
  
  // Full AI response (for debugging)
  fullAiResponse: mongoose.Schema.Types.Mixed
}, {
  timestamps: true,
  collection: 'cerebraslogs' // Explicitly set collection name
});

// Indexes for fast querying
CerebrasLogSchema.index({ timestamp: -1 });
CerebrasLogSchema.index({ anomalyDetected: 1 });
CerebrasLogSchema.index({ severity: 1 });
CerebrasLogSchema.index({ clusterId: 1 });
CerebrasLogSchema.index({ analyzedAt: -1 });

module.exports = mongoose.model('CerebrasLog', CerebrasLogSchema);