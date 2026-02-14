import mongoose from 'mongoose';

const assetTransferSchema = new mongoose.Schema({
  txid: {
    type: String,
    required: true,
    index: true
  },
  assetId: {
    type: String,
    required: true,
    index: true
  },
  assetName: {
    type: String,
    required: true,
    index: true
  },
  from: {
    type: String,
    index: true
  },
  to: {
    type: String,
    required: true,
    index: true
  },
  amount: {
    type: Number,
    required: true
  },
  type: {
    type: String,
    enum: ['mint', 'transfer'],
    required: true,
    index: true
  },
  blockHeight: {
    type: Number,
    required: true,
    index: true
  },
  timestamp: {
    type: Date,
    required: true,
    index: true
  },
  confirmations: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Compound indexes for common queries
assetTransferSchema.index({ assetId: 1, timestamp: -1 });
assetTransferSchema.index({ from: 1, timestamp: -1 });
assetTransferSchema.index({ to: 1, timestamp: -1 });
assetTransferSchema.index({ assetName: 1, timestamp: -1 });
assetTransferSchema.index({ type: 1, timestamp: -1 });

const AssetTransfer = mongoose.model('AssetTransfer', assetTransferSchema);

export default AssetTransfer;
