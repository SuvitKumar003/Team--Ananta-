const mongoose = require('mongoose');

const CerebrasLogSchema = new mongoose.Schema({
  // Reference to original log
  originalLogId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Log',
    required: true
  },
  
  // Original log data (duplicated for faster queries)
  timestamp: Date,
  level: String,
  message: String,
  
  // Cerebras AI Analysis
  anomalyScore: {
    type: Number,
    min: 0,
    max: 1,
    default: 0
  },
  clusterLabel: String, // e.g., "Payment_Gateway_Errors", "Database_Timeouts"
  patternId: String, // Unique identifier for recurring patterns
  severityLevel: {
    type: String,
    enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
    default: 'LOW'
  },
  
  // LLaMA Explanation (added on-demand)
  aiExplanation: String,
  rootCauseAnalysis: String,
  suggestedFix: String,
  
  // Metadata
  processedAt: {
    type: Date,
    default: Date.now
  },
  isExplained: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Indexes for fast queries
CerebrasLogSchema.index({ anomalyScore: -1 });
CerebrasLogSchema.index({ clusterLabel: 1 });
CerebrasLogSchema.index({ timestamp: -1 });
CerebrasLogSchema.index({ severityLevel: 1 });

module.exports = mongoose.model('CerebrasLog', CerebrasLogSchema);