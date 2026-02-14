import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema({
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  },
  requestId: {
    type: String,
    required: true
  },
  method: {
    type: String,
    required: true
  },
  endpoint: {
    type: String,
    required: true
  },
  ip: {
    type: String,
    required: true,
    index: true
  },
  userAgent: String,
  apiKey: {
    type: String,
    index: true
  },
  userId: String,
  queryParams: mongoose.Schema.Types.Mixed,
  requestBody: mongoose.Schema.Types.Mixed,
  responseStatus: Number,
  responseTime: Number,
  blockchainVerified: Boolean,
  dataSource: {
    type: String,
    enum: ['blockchain', 'cache', 'database', 'ipfs']
  },
  assetId: {
    type: String,
    index: true
  },
  txid: {
    type: String,
    index: true
  },
  address: {
    type: String,
    index: true
  },
  success: Boolean,
  errorMessage: String
}, {
  timestamps: { createdAt: true, updatedAt: false }
});

// Compound indexes
auditLogSchema.index({ ip: 1, timestamp: -1 });
auditLogSchema.index({ apiKey: 1, timestamp: -1 });
auditLogSchema.index({ assetId: 1, timestamp: -1 });
auditLogSchema.index({ address: 1, timestamp: -1 });

// TTL index - automatically delete logs older than 90 days
auditLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 7776000 });

const AuditLog = mongoose.model('AuditLog', auditLogSchema);

export default AuditLog;
