import { TokenAccount, EmptyTokenAccount } from './solanaTokenUtils';
import axios from 'axios';

// API Configuration
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

// Type definitions for API
interface BurnedToken {
  id: string;
  mintAddress: string;
  tokenAccount: string;
  symbol: string;
  name: string;
  image?: string;
  balance: number;
  decimals: number;
  price?: number;
  value: number;
}

interface ClosedAccount {
  id: string;
  mintAddress: string;
  tokenAccount: string;
  symbol: string;
  name: string;
  image?: string;
  rentLamports: number;
  rentSOL: number;
}

// Convert TokenAccount to BurnedToken for database storage
export function convertToBurnedToken(token: TokenAccount): BurnedToken {
  return {
    id: token.id,
    mintAddress: token.mintAddress,
    tokenAccount: token.tokenAccount,
    symbol: token.symbol || 'UNKNOWN',
    name: token.name || 'Unknown Token',
    image: token.image,
    balance: token.balance,
    decimals: token.decimals,
    price: token.price,
    value: token.balance * (token.price || 0)
  };
}

// Convert EmptyTokenAccount to ClosedAccount for database storage
export function convertToClosedAccount(account: EmptyTokenAccount): ClosedAccount {
  return {
    id: account.id,
    mintAddress: account.mintAddress,
    tokenAccount: account.tokenAccount,
    symbol: account.symbol || 'UNKNOWN',
    name: account.name || 'Unknown Token',
    image: account.image,
    rentLamports: account.rentLamports,
    rentSOL: account.rentSOL
  };
}

// Get user's IP address (client-side approximation)
export function getUserIP(): string {
  // Note: This is a placeholder. In a real app, you'd get this from the server
  // For client-side apps, you might use a service like ipapi.co
  return 'client-side';
}

// Get user agent
export function getUserAgent(): string {
  return typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown';
}

// Record burn transaction
export async function recordBurnTransaction(
  walletAddress: string,
  transactionId: string,
  burnedTokens: TokenAccount[],
  solRewards: number,
  commission: number,
  hasAlfieBalance: boolean,
  blockHeight?: number
): Promise<void> {
  try {
    const totalValue = burnedTokens.reduce(
      (sum, token) => sum + (token.balance * (token.price || 0)),
      0
    );

    const data = {
      walletAddress,
      transactionId,
      timestamp: new Date().toISOString(),
      blockHeight,
      solRewards,
      commission,
      totalValue,
      hasAlfieBalance,
      tokensCount: burnedTokens.length,
      burnedTokens: burnedTokens.map(convertToBurnedToken),
      userAgent: getUserAgent(),
      ipAddress: getUserIP()
    };

    await axios.post(`${API_BASE_URL}/api/transactions/burn`, data);
    console.log('✅ Burn transaction recorded in database');
  } catch (error) {
    console.error('❌ Failed to record burn transaction:', error);
    // Don't throw error - we don't want to fail the UI operation if DB fails
  }
}

// Record close accounts transaction
export async function recordCloseTransaction(
  walletAddress: string,
  transactionId: string,
  closedAccounts: EmptyTokenAccount[],
  solRewards: number,
  commission: number,
  hasAlfieBalance: boolean,
  blockHeight?: number
): Promise<void> {
  try {
    const totalRentRecovered = closedAccounts.reduce(
      (sum, account) => sum + account.rentSOL,
      0
    );

    const data = {
      walletAddress,
      transactionId,
      timestamp: new Date().toISOString(),
      blockHeight,
      solRewards,
      commission,
      hasAlfieBalance,
      accountsCount: closedAccounts.length,
      closedAccounts: closedAccounts.map(convertToClosedAccount),
      totalRentRecovered,
      userAgent: getUserAgent(),
      ipAddress: getUserIP()
    };

    await axios.post(`${API_BASE_URL}/api/transactions/close`, data);
    console.log('✅ Close accounts transaction recorded in database');
  } catch (error) {
    console.error('❌ Failed to record close transaction:', error);
    // Don't throw error - we don't want to fail the UI operation if DB fails
  }
}

// Get user transaction history
export async function getUserTransactionHistory(
  walletAddress: string,
  limit: number = 20
) {
  try {
    const response = await axios.get(`${API_BASE_URL}/api/transactions/wallet/${walletAddress}`, {
      params: { limit }
    });
    return response.data.transactions;
  } catch (error) {
    console.error('Failed to fetch user transaction history:', error);
    return [];
  }
}

// Get user statistics
export async function getUserStats(walletAddress: string) {
  try {
    const response = await axios.get(`${API_BASE_URL}/api/stats/wallet/${walletAddress}`);
    return response.data.stats;
  } catch (error) {
    console.error('Failed to fetch user stats:', error);
    return null;
  }
}

// Check if transaction already exists (to prevent duplicates)
export async function checkTransactionExists(transactionId: string): Promise<boolean> {
  try {
    const response = await axios.get(`${API_BASE_URL}/api/transactions/exists/${transactionId}`);
    return response.data.exists;
  } catch (error) {
    console.error('Failed to check transaction existence:', error);
    return false;
  }
}

// Initialize database connection (call this when app starts)
export async function initializeDatabase(): Promise<void> {
  try {
    // Test API connection
    await axios.get(`${API_BASE_URL}/health`);
    console.log('🚀 Database API connection ready');
  } catch (error) {
    console.error('❌ Database API connection failed:', error);
    console.error('Make sure to start the API server: npm run api');
  }
}

export default {
  recordBurnTransaction,
  recordCloseTransaction,
  getUserTransactionHistory,
  getUserStats,
  checkTransactionExists,
  initializeDatabase
};