const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// MongoDB connection
const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/alfie-burn-tool';
    
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log('✅ MongoDB connected successfully');
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error);
    process.exit(1);
  }
};

// Transaction Schema
const transactionSchema = new mongoose.Schema({
  walletAddress: { type: String, required: true, index: true },
  transactionId: { type: String, required: true, unique: true, index: true },
  transactionType: { type: String, enum: ['BURN', 'CLOSE_EMPTY_ACCOUNTS'], required: true, index: true },
  timestamp: { type: Date, required: true, index: true },
  blockHeight: { type: Number, index: true },
  solRewards: { type: Number, required: true, min: 0 },
  commission: { type: Number, required: true, min: 0 },
  totalValue: { type: Number, min: 0 },
  hasAlfieBalance: { type: Boolean, required: true, index: true },
  burnDetails: {
    tokensCount: { type: Number },
    burnedTokens: [{
      id: String,
      mintAddress: String,
      tokenAccount: String,
      symbol: String,
      name: String,
      image: String,
      balance: Number,
      decimals: Number,
      price: Number,
      value: Number
    }]
  },
  closeDetails: {
    accountsCount: { type: Number },
    closedAccounts: [{
      id: String,
      mintAddress: String,
      tokenAccount: String,
      symbol: String,
      name: String,
      image: String,
      rentLamports: Number,
      rentSOL: Number
    }],
    totalRentRecovered: Number
  },
  userAgent: String,
  ipAddress: String
}, {
  timestamps: true,
  collection: 'transactions'
});

// Indexes for better performance
transactionSchema.index({ walletAddress: 1, timestamp: -1 });
transactionSchema.index({ transactionType: 1, timestamp: -1 });
transactionSchema.index({ hasAlfieBalance: 1, timestamp: -1 });

const Transaction = mongoose.model('Transaction', transactionSchema);

// Routes

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'API is running', timestamp: new Date().toISOString() });
});

// Record burn transaction
app.post('/api/transactions/burn', async (req, res) => {
  try {
    const {
      walletAddress,
      transactionId,
      timestamp,
      blockHeight,
      solRewards,
      commission,
      totalValue,
      hasAlfieBalance,
      tokensCount,
      burnedTokens,
      userAgent,
      ipAddress
    } = req.body;

    // Check if transaction already exists
    const existingTransaction = await Transaction.findOne({ transactionId });
    if (existingTransaction) {
      return res.status(400).json({ error: 'Transaction already recorded' });
    }

    const transaction = new Transaction({
      walletAddress,
      transactionId,
      transactionType: 'BURN',
      timestamp: new Date(timestamp),
      blockHeight,
      solRewards,
      commission,
      totalValue,
      hasAlfieBalance,
      burnDetails: {
        tokensCount,
        burnedTokens
      },
      userAgent,
      ipAddress
    });

    await transaction.save();
    
    console.log(`✅ Burn transaction recorded: ${transactionId}`);
    res.status(201).json({ success: true, transactionId, message: 'Burn transaction recorded' });
  } catch (error) {
    console.error('❌ Error recording burn transaction:', error);
    res.status(500).json({ error: 'Failed to record burn transaction', details: error.message });
  }
});

// Record close accounts transaction
app.post('/api/transactions/close', async (req, res) => {
  try {
    const {
      walletAddress,
      transactionId,
      timestamp,
      blockHeight,
      solRewards,
      commission,
      hasAlfieBalance,
      accountsCount,
      closedAccounts,
      totalRentRecovered,
      userAgent,
      ipAddress
    } = req.body;

    // Check if transaction already exists
    const existingTransaction = await Transaction.findOne({ transactionId });
    if (existingTransaction) {
      return res.status(400).json({ error: 'Transaction already recorded' });
    }

    const transaction = new Transaction({
      walletAddress,
      transactionId,
      transactionType: 'CLOSE_EMPTY_ACCOUNTS',
      timestamp: new Date(timestamp),
      blockHeight,
      solRewards,
      commission,
      hasAlfieBalance,
      closeDetails: {
        accountsCount,
        closedAccounts,
        totalRentRecovered
      },
      userAgent,
      ipAddress
    });

    await transaction.save();
    
    console.log(`✅ Close accounts transaction recorded: ${transactionId}`);
    res.status(201).json({ success: true, transactionId, message: 'Close accounts transaction recorded' });
  } catch (error) {
    console.error('❌ Error recording close transaction:', error);
    res.status(500).json({ error: 'Failed to record close transaction', details: error.message });
  }
});

// Get transactions by wallet
app.get('/api/transactions/wallet/:walletAddress', async (req, res) => {
  try {
    const { walletAddress } = req.params;
    const { limit = 50, offset = 0 } = req.query;

    const transactions = await Transaction
      .find({ walletAddress })
      .sort({ timestamp: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(offset))
      .lean();

    res.json({ transactions, count: transactions.length });
  } catch (error) {
    console.error('❌ Error fetching wallet transactions:', error);
    res.status(500).json({ error: 'Failed to fetch transactions', details: error.message });
  }
});

// Get wallet statistics
app.get('/api/stats/wallet/:walletAddress', async (req, res) => {
  try {
    const { walletAddress } = req.params;

    const stats = await Transaction.aggregate([
      { $match: { walletAddress } },
      {
        $group: {
          _id: '$transactionType',
          count: { $sum: 1 },
          totalSolRewards: { $sum: '$solRewards' },
          totalCommission: { $sum: '$commission' },
          totalValue: { $sum: '$totalValue' }
        }
      }
    ]);

    res.json({ stats });
  } catch (error) {
    console.error('❌ Error fetching wallet stats:', error);
    res.status(500).json({ error: 'Failed to fetch wallet stats', details: error.message });
  }
});

// Get global statistics
app.get('/api/stats/global', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const matchConditions = {};
    if (startDate || endDate) {
      matchConditions.timestamp = {};
      if (startDate) matchConditions.timestamp.$gte = new Date(startDate);
      if (endDate) matchConditions.timestamp.$lte = new Date(endDate);
    }

    const stats = await Transaction.aggregate([
      { $match: matchConditions },
      {
        $group: {
          _id: null,
          totalTransactions: { $sum: 1 },
          totalSolRewards: { $sum: '$solRewards' },
          totalCommission: { $sum: '$commission' },
          totalValue: { $sum: '$totalValue' },
          uniqueWallets: { $addToSet: '$walletAddress' },
          alfieHolders: {
            $sum: { $cond: ['$hasAlfieBalance', 1, 0] }
          }
        }
      },
      {
        $addFields: {
          uniqueWalletsCount: { $size: '$uniqueWallets' }
        }
      },
      {
        $project: {
          uniqueWallets: 0
        }
      }
    ]);

    res.json({ stats: stats.length > 0 ? stats[0] : null });
  } catch (error) {
    console.error('❌ Error fetching global stats:', error);
    res.status(500).json({ error: 'Failed to fetch global stats', details: error.message });
  }
});

// Get recent transactions
app.get('/api/transactions/recent', async (req, res) => {
  try {
    const { limit = 100, transactionType } = req.query;
    
    const query = transactionType ? { transactionType } : {};
    const transactions = await Transaction
      .find(query)
      .sort({ timestamp: -1 })
      .limit(parseInt(limit))
      .lean();

    res.json({ transactions, count: transactions.length });
  } catch (error) {
    console.error('❌ Error fetching recent transactions:', error);
    res.status(500).json({ error: 'Failed to fetch recent transactions', details: error.message });
  }
});

// Check if transaction exists
app.get('/api/transactions/exists/:transactionId', async (req, res) => {
  try {
    const { transactionId } = req.params;
    
    const exists = await Transaction.exists({ transactionId });
    res.json({ exists: !!exists });
  } catch (error) {
    console.error('❌ Error checking transaction existence:', error);
    res.status(500).json({ error: 'Failed to check transaction', details: error.message });
  }
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('❌ Unhandled error:', error);
  res.status(500).json({ error: 'Internal server error' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Start server
const startServer = async () => {
  await connectDB();
  
  app.listen(PORT, () => {
    console.log(`🚀 API server running on http://localhost:${PORT}`);
    console.log(`📊 Health check: http://localhost:${PORT}/health`);
  });
};

startServer().catch(error => {
  console.error('❌ Failed to start server:', error);
  process.exit(1);
});