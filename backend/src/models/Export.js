import mongoose from 'mongoose';

const exportSchema = new mongoose.Schema({
  exportId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  type: {
    type: String,
    enum: ['asset', 'address', 'multi', 'legal', 'provenance'],
    required: true,
    index: true
  },
  status: {
    type: String,
    enum: ['pending_payment', 'payment_confirmed', 'queued', 'processing', 'completed', 'failed', 'expired'],
    default: 'pending_payment',
    required: true,
    index: true
  },
  // Payment fields
  paymentAddress: {
    type: String,
    required: true,
    index: true
  },
  paymentTxid: {
    type: String,
    index: true
  },
  paymentAmountUSD: {
    type: Number,
    required: true,
    default: 2.00
  },
  paymentExpiration: {
    type: Date,
    required: true,
    index: true
  },
  paymentConfirmed: {
    type: Boolean,
    default: false
  },
  paymentConfirmedAt: Date,
  
  // Request data
  requestData: {
    assetId: String,
    assetIds: [String],
    address: String,
    addresses: [String],
    includeTransactions: { type: Boolean, default: true },
    includeAddresses: { type: Boolean, default: true },
    includeMedia: { type: Boolean, default: false },
    retention: { type: Number, default: 604800 }, // 7 days in seconds
    legalInfo: {
      caseReference: String,
      court: String,
      purpose: String,
      requestingParty: String
    }
  },
  
  // Results
  fileHash: String,
  ipfsHash: { type: String, required: false }, // Optional - IPFS no longer used
  ipfsPinned: { type: Boolean, default: false, required: false }, // Optional - IPFS no longer used
  signature: String,
  assetName: String, // Blockchain token name (RTM_EXPORTS/...)
  blockchainTxid: String,
  blockchainConfirmed: { type: Boolean, default: false },
  
  // File paths (local storage)
  filePath: String,
  expiresAt: Date,
  downloadCount: { type: Number, default: 0 },
  
  // Queue position
  queuePosition: Number,
  queueStartedAt: Date,
  queueCompletedAt: Date,
  
  // Progress tracking
  progress: { type: Number, default: 0 }, // 0-100
  progressMessage: String,
  
  // Error tracking
  errorMessage: String,
  retryCount: { type: Number, default: 0 },
  
  // Request metadata
  requestIp: String,
  userAgent: String
}, {
  timestamps: true
});

// Indexes
exportSchema.index({ createdAt: -1 });
exportSchema.index({ status: 1, createdAt: -1 });
exportSchema.index({ paymentAddress: 1, paymentConfirmed: 1 });
exportSchema.index({ expiresAt: 1 });
exportSchema.index({ assetName: 1 });

// Methods
exportSchema.methods.isExpired = function() {
  return this.expiresAt && new Date() > this.expiresAt;
};

exportSchema.methods.canDownload = function() {
  return this.status === 'completed' && !this.isExpired();
};

// Statics
exportSchema.statics.generateExportId = function() {
  return 'exp_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 10);
};

const Export = mongoose.model('Export', exportSchema);

export default Export;
