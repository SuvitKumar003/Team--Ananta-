const mongoose = require('mongoose');

const LogSchema = new mongoose.Schema({
  timestamp: {
    type: Date,
    required: true,
    default: Date.now
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
  service: {
    type: String,
    default: 'ticketbooking-platform'
  },
  userId: String,
  sessionId: String,
  requestId: String,
  endpoint: String,
  errorCode: String,
  errorMessage: String,
  responseTime: Number,
  // AI Analysis fields (will be added later by Cerebras)
  anomalyDetected: {
    type: Boolean,
    default: false
  },
  rootCause: String,
  aiExplanation: String,
  suggestedFix: String,
  // Metadata
  city: String,
  details: mongoose.Schema.Types.Mixed
}, {
  timestamps: true // Automatically adds createdAt and updatedAt
});

// Index for faster queries
LogSchema.index({ timestamp: -1 });
LogSchema.index({ level: 1 });
LogSchema.index({ anomalyDetected: 1 });

module.exports = mongoose.model('Log', LogSchema);