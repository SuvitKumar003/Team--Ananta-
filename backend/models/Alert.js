const mongoose = require('mongoose');

const AlertSchema = new mongoose.Schema({
  alertId: {
    type: String,
    required: true,
    unique: true
  },
  type: {
    type: String,
    enum: ['ERROR_SPIKE', 'CRITICAL_ENDPOINT_FAILURE', 'HIGH_VALUE_ERROR', 'HIGH_USER_IMPACT'],
    required: true
  },
  severity: {
    type: String,
    enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
    required: true
  },
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  affectedLogs: Number,
  affectedUsers: Number,
  affectedEndpoints: [String],
  topErrors: [{
    error: String,
    count: Number
  }],
  suggestedAction: String,
  runbook: [String],
  estimatedRevenueLoss: String,
  status: {
    type: String,
    enum: ['active', 'acknowledged', 'resolved'],
    default: 'active'
  },
  acknowledgedAt: Date,
  acknowledgedBy: String,
  resolvedAt: Date,
  resolvedBy: String,
  metadata: mongoose.Schema.Types.Mixed
}, {
  timestamps: true
});

// Indexes for fast querying
AlertSchema.index({ createdAt: -1 });
AlertSchema.index({ type: 1 });
AlertSchema.index({ severity: 1 });
AlertSchema.index({ status: 1 });

module.exports = mongoose.model('Alert', AlertSchema);