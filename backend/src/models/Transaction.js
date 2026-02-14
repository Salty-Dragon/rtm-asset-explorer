import mongoose from 'mongoose';

const transactionSchema = new mongoose.Schema({
  txid: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  blockHeight: {
    type: Number,
    required: true,
    index: true
  },
  blockHash: {
    type: String,
    required: true
  },
  timestamp: {
    type: Date,
    required: true,
    index: true
  },
  confirmations: {
    type: Number,
    default: 0
  },
  size: {
    type: Number,
    required: true
  },
  fee: {
    type: Number,
    default: 0
  },
  inputs: [{
    txid: String,
    vout: Number,
    address: String,
    amount: Number,
    scriptSig: String
  }],
  outputs: [{
    n: Number,
    address: String,
    amount: Number,
    scriptPubKey: String,
    spent: { type: Boolean, default: false },
    spentTxid: String,
    spentAt: Date
  }],
  type: {
    type: String,
    enum: ['standard', 'asset_create', 'asset_transfer', 'asset_mint', 'asset_update', 'future'],
    default: 'standard',
    index: true
  },
  assetData: {
    assetId: String,
    assetName: String,
    amount: Number,
    from: String,
    to: String,
    operation: {
      type: String,
      enum: ['create', 'mint', 'transfer', 'update']
    }
  },
  futureData: {
    maturity: Number,
    lockTime: Number,
    unlockHeight: Number,
    unlockTime: Date,
    lockedAmount: Number,
    assetId: String
  }
}, {
  timestamps: true
});

// Compound indexes for common queries
transactionSchema.index({ 'outputs.address': 1, timestamp: -1 });
transactionSchema.index({ 'inputs.address': 1, timestamp: -1 });
transactionSchema.index({ type: 1, timestamp: -1 });
transactionSchema.index({ 'assetData.assetId': 1 });

const Transaction = mongoose.model('Transaction', transactionSchema);

export default Transaction;
