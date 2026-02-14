import mongoose from 'mongoose';

const blockSchema = new mongoose.Schema({
  height: {
    type: Number,
    required: true,
    unique: true,
    index: true
  },
  hash: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  previousHash: {
    type: String,
    required: true
  },
  merkleRoot: {
    type: String,
    required: true
  },
  timestamp: {
    type: Date,
    required: true,
    index: true
  },
  difficulty: {
    type: Number,
    required: true
  },
  nonce: {
    type: Number,
    required: true
  },
  size: {
    type: Number,
    required: true
  },
  transactionCount: {
    type: Number,
    default: 0
  },
  transactions: [{
    type: String
  }],
  miner: {
    type: String,
    index: true
  },
  reward: {
    type: Number,
    default: 0
  },
  confirmations: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Compound indexes
blockSchema.index({ miner: 1, timestamp: -1 });

const Block = mongoose.model('Block', blockSchema);

export default Block;
