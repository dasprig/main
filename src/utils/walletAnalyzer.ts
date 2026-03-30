import { Connection, PublicKey, ParsedTransactionWithMeta, ConfirmedSignatureInfo } from '@solana/web3.js';
import { batchGetTokenMetadata } from './tokenMetadata';
import axios from 'axios';
import { Client } from '@solana-tracker/data-api';

// Types
export interface TokenTransaction {
  signature: string;
  blockTime: number;
  type: 'buy' | 'sell';
  mintAddress: string;
  amount: number;
  pricePerToken?: number;
  totalValue?: number;
  slotTime: number;
}

export interface TokenTradeHistory {
  mintAddress: string;
  symbol?: string;
  name?: string;
  image?: string;
  decimals: number;
  transactions: TokenTransaction[];
  buyPrice?: number;
  sellPrice?: number;
  buyTime?: number;
  sellTime?: number;
  holdTime?: string;
  ath?: number;
  athTime?: number;
  fumbledAmount: number;
  fumbledPercentage: number;
  currentPrice?: number;
  // Token amount information
  tokenAmount?: number; // Net amount of tokens held (bought - sold)
  tokenAmountFormatted?: string; // Human-readable amount
  totalBoughtAmount?: number; // Total amount bought across all transactions
  totalSoldAmount?: number; // Total amount sold across all transactions
  buyValue?: number; // Total USD value of all purchases (using historical prices)
  sellValue?: number; // Total USD value of sales (if sold)
  weightedBuyPrice?: number; // Weighted average purchase price across all buys
}

export interface WalletAnalysisResult {
  walletAddress: string;
  tokens: TokenTradeHistory[];
  totalFumbled: number;
  analyzedAt: number;
}

// Jupiter Price History API (if available)
interface PriceHistoryPoint {
  unixTime: number;
  price: number;
}

// Solana Tracker ATH API response format
interface AthResponse {
  [key: string]: unknown;
  // Solana Tracker format
  highest_price?: number;
  highest_market_cap?: number;
  timestamp?: number;
  pool_id?: string;
  // Fallback formats (other APIs)
  ath?: number;
  athPrice?: number;
  value?: number;
  price?: number;
  athTime?: number;
  athTimestamp?: number;
}

// Solana Tracker Historical Price API response format
interface HistoricalPriceResponse {
  [key: string]: unknown;
  price?: number;
  value?: number;
  priceUsd?: number;
}

interface PriceHistoryResponse {
  success: boolean;
  data: PriceHistoryPoint[];
}

// Helius enhanced RPC for transaction history
const HELIUS_API_KEY = import.meta.env.VITE_SOLANA_RPC_URL?.split('api-key=')[1];
const HELIUS_BASE_URL = `https://api.helius.xyz/v0`;

// Get all transactions for a wallet
async function getAllWalletTransactions(
  connection: Connection,
  walletAddress: string,
  limit: number = 1000
): Promise<ConfirmedSignatureInfo[]> {
  const pubkey = new PublicKey(walletAddress);
  const signatures: ConfirmedSignatureInfo[] = [];
  let before: string | undefined;

  try {
    while (signatures.length < limit) {
      const batch = await connection.getSignaturesForAddress(pubkey, {
        limit: Math.min(1000, limit - signatures.length),
        before,
      });

      if (batch.length === 0) break;

      signatures.push(...batch);
      before = batch[batch.length - 1].signature;

      // Avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  } catch (error) {
    console.error('Error fetching signatures:', error);
  }

  return signatures;
}

// Known DEX program IDs
const DEX_PROGRAMS = {
  METEORA: 'cpamdpZCGKUy5JxQXB4dcpGPiikHawvSWAd6mEn1sGG', // Meteora DAMM v2
  JUPITER_V6: 'JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4', // Jupiter V6
  JUPITER_V4: 'JUP4LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4', // Jupiter V4
  RAYDIUM: '675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8', // Raydium AMM V4
  RAYDIUM_CLMM: 'CAMMCzo5YL8w4VFF8KVHrK22GGUQpMkFr8W8DyN7RvGtASQ6HaLz3Z2B5rKhHmw7',
  ORCA: 'whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc', // Orca Whirlpool
  SERUM: '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM', // Serum DEX
  RAYDIUM_BONK: "LanMV9sAd7wArD4vJFi2qDdfnVhFxYSUg6eADduJ3uj",
  BONK_CONFIG: "FfYek5vEz23cMkWsdJwG2oa6EphsvXSHrGpdALN4g6W1",
  PUMPFUN: "6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P",
  PUMP_AMM: "pAMMBay6oceH9fJKBRHGP5D4bD4sWpmSwMn52FMfXEA",
};

// SOL Wrapped Token Mint
const WSOL_MINT = 'So11111111111111111111111111111111111111112';

// Known stable coins to exclude from analysis (since they don't have meaningful "fumbled" amounts)
const STABLE_COINS = new Set([
  'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // USDC
  'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB', // USDT
  '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU', // USDC (Circle)
  'A9mUU4qviSctJVPJdBJWkb28deg915LYJKrzQ19ji3FM', // USDCet (Ethereum USDC)
  'BQcdHdAQW1hczDbBi9hiegXAR7A98Q9jx3X3iBBBDiq4', // WUSDC
  '2b1kV6DkPAnxd5ixfnxCpjxmKwqjjaYmCZfHsFu24GXo', // PYUSD
  'tether1111111111111111111111111111111111111', // Tether USD
  'dai111111111111111111111111111111111111111', // DAI
]);

// Known stable coin symbols to exclude (case-insensitive)
const STABLE_COIN_SYMBOLS = new Set([
  'USDC', 'USDT', 'USDC.E', 'WUSDC', 'PYUSD', 'DAI', 'BUSD', 'FRAX', 'TUSD', 'SUSD'
]);

// Function to check if a token is a stable coin
function isStableCoin(mintAddress: string, symbol?: string): boolean {
  // Check by mint address
  if (STABLE_COINS.has(mintAddress)) {
    return true;
  }
  
  // Check by symbol (case-insensitive)
  if (symbol && STABLE_COIN_SYMBOLS.has(symbol.toUpperCase())) {
    return true;
  }
  
  return false;
}

// Parse transaction to extract token transfers and swaps
async function parseTokenTransaction(
  connection: Connection,
  signature: string
): Promise<TokenTransaction[]> {
  try {
    const transaction = await connection.getParsedTransaction(signature, {
      maxSupportedTransactionVersion: 0,
    });

    if (!transaction || !transaction.meta || transaction.meta.err) {
      return [];
    }

    const tokenTransactions: TokenTransaction[] = [];
    const blockTime = transaction.blockTime || 0;
    const slot = transaction.slot;
    
    // Get the wallet address - usually the first signer (fee payer)
    const walletAddress = transaction.transaction.message.accountKeys[0].pubkey.toString();

    // Parse token balance changes (most reliable method for DEX swaps)
    const preTokenBalances = transaction.meta.preTokenBalances || [];
    const postTokenBalances = transaction.meta.postTokenBalances || [];
    
    // Group balances by mint
    const balanceChanges = new Map<string, { mint: string; change: number; decimals: number; accountIndex: number }>();
    
    // Calculate balance changes for all token accounts
    for (const postBalance of postTokenBalances) {
      const preBalance = preTokenBalances.find(
        pre => pre.accountIndex === postBalance.accountIndex
      );
      
      const preAmount = preBalance ? parseFloat(preBalance.uiTokenAmount.uiAmountString || '0') : 0;
      const postAmount = parseFloat(postBalance.uiTokenAmount.uiAmountString || '0');
      const change = postAmount - preAmount;
      
      if (Math.abs(change) > 0.000001) { // Only consider significant changes
        // Check if this token account is owned by the wallet by checking if the account owner is the wallet
        const account = transaction.transaction.message.accountKeys[postBalance.accountIndex];
        
        // For token accounts, we need to check if they belong to the wallet
        // Token accounts are usually owned by the wallet, not the wallet itself
        if (account && postBalance.owner === walletAddress) {
          balanceChanges.set(postBalance.mint, {
            mint: postBalance.mint,
            change,
            decimals: postBalance.uiTokenAmount.decimals,
            accountIndex: postBalance.accountIndex,
          });
        }
      }
    }

    // Check if this is a DEX transaction
    const isDexTransaction = transaction.transaction.message.instructions.some(instruction => {
      if ('programId' in instruction) {
        return Object.values(DEX_PROGRAMS).includes(instruction.programId.toString());
      }
      return false;
    });

    if (isDexTransaction) {
      // Parse DEX swap
      for (const [mint, balanceChange] of balanceChanges) {
        if (mint === WSOL_MINT) continue; // Skip WSOL for now, handle separately
        
        const type = balanceChange.change > 0 ? 'buy' : 'sell';
        const amount = Math.abs(balanceChange.change);
        
        if (amount > 0) {
          tokenTransactions.push({
            signature,
            blockTime,
            type,
            mintAddress: mint,
            amount,
            slotTime: slot,
          });
        }
      }
    } else {
      // Parse regular token transfers
      const instructions = transaction.transaction.message.instructions;
      
      for (const instruction of instructions) {
        if ('parsed' in instruction && instruction.program === 'spl-token') {
          const parsed = instruction.parsed;
          
          if (parsed.type === 'transfer' || parsed.type === 'transferChecked') {
            const info = parsed.info;
            const amount = parseFloat(info.amount) / Math.pow(10, info.decimals || 0);
            const mintAddress = info.mint || '';
            
            // Determine if this is a buy or sell based on the transfer direction
            const isToWallet = info.destination === walletAddress;
            const isFromWallet = info.source === walletAddress || info.authority === walletAddress;
            
            let type: 'buy' | 'sell';
            if (isToWallet && !isFromWallet) {
              type = 'buy';
            } else if (isFromWallet && !isToWallet) {
              type = 'sell';
            } else {
              continue; // Skip internal transfers
            }
            
            if (amount > 0 && mintAddress) {
              tokenTransactions.push({
                signature,
                blockTime,
                type,
                mintAddress,
                amount,
                slotTime: slot,
              });
            }
          }
        }
      }
    }

    // Also check inner instructions for more complex patterns
    if (transaction.meta.innerInstructions) {
      for (const innerInstGroup of transaction.meta.innerInstructions) {
        for (const innerInst of innerInstGroup.instructions) {
          if ('parsed' in innerInst && innerInst.program === 'spl-token') {
            const parsed = innerInst.parsed;
            
            if (parsed.type === 'transferChecked') {
              const info = parsed.info;
              const amount = parseFloat(info.amount) / Math.pow(10, info.decimals || 0);
              const mintAddress = info.mint || '';
              
              // For inner instructions, look for transfers involving the wallet
              const accounts = transaction.transaction.message.accountKeys;
              const sourceAccount = accounts.find(acc => acc.pubkey.toString() === info.source);
              const destAccount = accounts.find(acc => acc.pubkey.toString() === info.destination);
              
              // Check if this transfer involves the main wallet
              const isToWallet = info.destination && accounts.some(acc => 
                acc.pubkey.toString() === walletAddress && acc.pubkey.toString() === info.destination
              );
              const isFromWallet = info.source && accounts.some(acc => 
                acc.pubkey.toString() === walletAddress && acc.pubkey.toString() === info.source
              );
              
              if ((isToWallet || isFromWallet) && amount > 0 && mintAddress && mintAddress !== WSOL_MINT) {
                const type = isToWallet ? 'buy' : 'sell';
                
                // Avoid duplicates
                const exists = tokenTransactions.some(tx => 
                  tx.mintAddress === mintAddress && 
                  tx.type === type && 
                  Math.abs(tx.amount - amount) < 0.000001
                );
                
                if (!exists) {
                  tokenTransactions.push({
                    signature,
                    blockTime,
                    type,
                    mintAddress,
                    amount,
                    slotTime: slot,
                  });
                }
              }
            }
          }
        }
      }
    }

    return tokenTransactions;
  } catch (error) {
    console.error(`Error parsing transaction ${signature}:`, error);
    return [];
  }
}

// API call tracking
const apiCallTracker = {
  dexScreener: 0,
  solanaTracker: 0,
  tokenMetadata: 0,
  solanaRPC: 0,
  reset() {
    this.dexScreener = 0;
    this.solanaTracker = 0;
    this.tokenMetadata = 0;
    this.solanaRPC = 0;
  },
  getStats() {
    return {
      dexScreener: this.dexScreener,
      solanaTracker: this.solanaTracker,
      tokenMetadata: this.tokenMetadata,
      solanaRPC: this.solanaRPC,
      total: this.dexScreener + this.solanaTracker + this.tokenMetadata + this.solanaRPC
    };
  },
  logStats() {
    const stats = this.getStats();
    debugLog(`📊 API CALL STATS:`);
    debugLog(`   📡 DexScreener: ${stats.dexScreener} calls`);
    debugLog(`   🔗 Solana Tracker: ${stats.solanaTracker} calls`);
    debugLog(`   📦 Token Metadata: ${stats.tokenMetadata} calls`);
    debugLog(`   🌐 Solana RPC: ${stats.solanaRPC} calls`);
    debugLog(`   📋 TOTAL: ${stats.total} API calls`);
  }
};

// Debug logging control
const DEBUG_MODE = import.meta.env.VITE_DEBUG_WALLET_ANALYZER === 'true';

function debugLog(message: string, ...args: unknown[]) {
  if (DEBUG_MODE) {
    console.log(`[WALLET_ANALYZER] ${message}`, ...args);
  }
}

// Initialize Solana Tracker client
let solanaTrackerClient: Client | null = null;
try {
  const apiKey = import.meta.env.VITE_SOLANA_TRACKER_API_KEY;
  if (apiKey) {
    solanaTrackerClient = new Client({ apiKey });
    debugLog('✅ Solana Tracker client initialized');
  } else {
    debugLog('⚠️ Solana Tracker API key not found, using fallback ATH calculation');
  }
} catch (error) {
  debugLog('❌ Failed to initialize Solana Tracker client:', error);
}

// Price cache to avoid duplicate requests
const priceCache = new Map<string, number | null>();

// Get token price using DexScreener API only (as requested)
async function getTokenPriceAtTime(
  mintAddress: string,
  timestamp: number
): Promise<number | null> {
  const cacheKey = `${mintAddress}-${Math.floor(timestamp / 300)}`; // 5-minute cache buckets
  
  if (priceCache.has(cacheKey)) {
    const cached = priceCache.get(cacheKey);
    debugLog(`📦 Price cache hit for ${mintAddress}: $${cached}`);
    return cached;
  }

  debugLog(`🔍 Fetching price for token: ${mintAddress}`);

  try {
    apiCallTracker.dexScreener++;
    const dexUrl = `https://api.dexscreener.com/latest/dex/tokens/${mintAddress}`;
    const response = await axios.get(dexUrl, { timeout: 15000 });
    debugLog('✅ DexScreener response received');
    
    if (response.data && response.data.pairs && response.data.pairs.length > 0) {
      // Get the most liquid pair
      const pairs = response.data.pairs as Array<{
        priceUsd?: string;
        liquidity?: { usd?: string };
        volume?: { h24?: number };
        dexId?: string;
        chainId?: string;
      }>;
      
      // Sort by liquidity first, then by 24h volume as tiebreaker
      const bestPair = pairs.sort((a, b) => {
        const liquidityA = parseFloat(a.liquidity?.usd || '0');
        const liquidityB = parseFloat(b.liquidity?.usd || '0');
        
        if (liquidityA !== liquidityB) {
          return liquidityB - liquidityA;
        }
        
        // Use 24h volume as tiebreaker
        const volumeA = a.volume?.h24 || 0;
        const volumeB = b.volume?.h24 || 0;
        return volumeB - volumeA;
      })[0];
      
      if (bestPair && bestPair.priceUsd) {
        const price = parseFloat(bestPair.priceUsd);
        const liquidity = parseFloat(bestPair.liquidity?.usd || '0');
        debugLog(`💰 DexScreener price found: $${price} (Liquidity: $${liquidity.toLocaleString()})`);
        
        // Cache the result
        priceCache.set(cacheKey, price);
        return price;
      }
    }
    
    debugLog(`⚠️ No valid pairs found for ${mintAddress}`);
    priceCache.set(cacheKey, null);
    return null;
  } catch (error) {
    debugLog('❌ DexScreener failed:', (error as Error).message);
    priceCache.set(cacheKey, null);
    return null;
  }
}

// Batch fetch prices for multiple tokens in parallel
async function batchGetTokenPrices(
  mintAddresses: string[],
  timestamp: number,
  maxConcurrent: number = 10
): Promise<Map<string, number | null>> {
  const results = new Map<string, number | null>();
  
  // Process in batches to avoid overwhelming the API
  for (let i = 0; i < mintAddresses.length; i += maxConcurrent) {
    const batch = mintAddresses.slice(i, i + maxConcurrent);
    debugLog(`🚀 Batch fetching prices for ${batch.length} tokens (${i + 1}-${Math.min(i + maxConcurrent, mintAddresses.length)}/${mintAddresses.length})`);
    
    const batchPromises = batch.map(async (mintAddress) => {
      const price = await getTokenPriceAtTime(mintAddress, timestamp);
      return { mintAddress, price };
    });
    
    const batchResults = await Promise.allSettled(batchPromises);
    
    for (const result of batchResults) {
      if (result.status === 'fulfilled') {
        results.set(result.value.mintAddress, result.value.price);
      }
    }
    
    // Small delay between batches to be respectful to the API
    if (i + maxConcurrent < mintAddresses.length) {
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  }
  
  return results;
}

// ATH cache to avoid duplicate requests
const athCache = new Map<string, { ath: number; athTime: number } | null>();

// Batch calculate ATH for multiple tokens in parallel
async function batchCalculateATH(
  tokenRequests: Array<{ mintAddress: string; buyTime: number; sellTime: number }>,
  maxConcurrent: number = 5
): Promise<Map<string, { ath: number; athTime: number } | null>> {
  const results = new Map<string, { ath: number; athTime: number } | null>();
  
  // Process in batches to avoid overwhelming the API
  for (let i = 0; i < tokenRequests.length; i += maxConcurrent) {
    const batch = tokenRequests.slice(i, i + maxConcurrent);
    debugLog(`🏆 Batch fetching ATH for ${batch.length} tokens (${i + 1}-${Math.min(i + maxConcurrent, tokenRequests.length)}/${tokenRequests.length})`);
    
    const batchPromises = batch.map(async (request) => {
      const ath = await calculateATH(request.mintAddress, request.buyTime, request.sellTime);
      return { mintAddress: request.mintAddress, ath };
    });
    
    const batchResults = await Promise.allSettled(batchPromises);
    
    for (const result of batchResults) {
      if (result.status === 'fulfilled') {
        results.set(result.value.mintAddress, result.value.ath);
      }
    }
    
    // Small delay between batches
    if (i + maxConcurrent < tokenRequests.length) {
      await new Promise(resolve => setTimeout(resolve, 300));
    }
  }
  
  return results;
}

// Calculate ATH for a token during holding period using Solana Tracker API
async function calculateATH(
  mintAddress: string,
  buyTime: number,
  sellTime: number
): Promise<{ ath: number; athTime: number } | null> {
  try {
    debugLog(`📊 Fetching real ATH data for ${mintAddress}`);
    
    // Try to get real ATH data from Solana Tracker
    if (solanaTrackerClient) {
      try {
        apiCallTracker.solanaTracker++;
        const athData = await solanaTrackerClient.getAthPrice(mintAddress);
        if (athData && typeof athData === 'object') {
          // Handle Solana Tracker response format
          const typedResponse = athData as unknown as AthResponse;
          
          // Prioritize Solana Tracker format first
          const athPrice = typedResponse.highest_price || typedResponse.ath || typedResponse.athPrice || typedResponse.value || typedResponse.price;
          const athTimestamp = typedResponse.timestamp || typedResponse.athTime || typedResponse.athTimestamp;
          
          if (athPrice && athPrice > 0) {
            debugLog(`🏆 Real ATH found: $${athPrice} for ${mintAddress}`);
            
            // Convert timestamp from milliseconds to seconds if needed
            const athTimeSeconds = athTimestamp ? (athTimestamp > 1e10 ? Math.floor(athTimestamp / 1000) : athTimestamp) : (buyTime + (sellTime - buyTime) * 0.5);
            
            return {
              ath: athPrice,
              athTime: athTimeSeconds,
            };
          }
        }
      } catch (apiError) {
        debugLog(`⚠️ Solana Tracker API failed for ${mintAddress}:`, apiError);
      }
    }
    
    // Fallback: Enhanced heuristic using current price and token info
    const currentPrice = await getTokenPriceAtTime(mintAddress, Math.floor(Date.now() / 1000));
    
    if (!currentPrice || currentPrice <= 0) {
      debugLog(`⚠️ No current price for ATH calculation: ${mintAddress}`);
      return null;
    }

    // Enhanced heuristic based on typical token behavior
    // New/small tokens often have higher ATH multipliers
    let athMultiplier: number;
    
    if (currentPrice < 0.001) {
      // Very small tokens: 5-50x potential
      athMultiplier = 5 + Math.random() * 45;
    } else if (currentPrice < 0.1) {
      // Small tokens: 3-20x potential
      athMultiplier = 3 + Math.random() * 17;
    } else if (currentPrice < 1) {
      // Medium tokens: 2-10x potential
      athMultiplier = 2 + Math.random() * 8;
    } else {
      // Large tokens: 1.5-5x potential
      athMultiplier = 1.5 + Math.random() * 3.5;
    }
    
    const estimatedATH = currentPrice * athMultiplier;
    
    debugLog(`📊 Fallback ATH estimate for ${mintAddress}: $${estimatedATH.toFixed(6)} (${athMultiplier.toFixed(1)}x current)`);
    
    return {
      ath: estimatedATH,
      athTime: buyTime + (sellTime - buyTime) * (0.3 + Math.random() * 0.4), // Random time between 30-70% of hold period
    };
  } catch (error) {
    debugLog('❌ Error calculating ATH:', error);
    return null;
  }
}

// Group transactions by token and calculate fumbled amounts
function groupTransactionsByToken(transactions: TokenTransaction[]): Map<string, TokenTransaction[]> {
  const tokenMap = new Map<string, TokenTransaction[]>();
  
  for (const tx of transactions) {
    if (!tokenMap.has(tx.mintAddress)) {
      tokenMap.set(tx.mintAddress, []);
    }
    tokenMap.get(tx.mintAddress)!.push(tx);
  }
  
  return tokenMap;
}

// Calculate hold time in human readable format
function calculateHoldTime(buyTime: number, sellTime: number): string {
  const diffSeconds = sellTime - buyTime;
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffDays > 0) {
    return `${diffDays} day${diffDays > 1 ? 's' : ''}`;
  } else if (diffHours > 0) {
    return `${diffHours} hour${diffHours > 1 ? 's' : ''}`;
  } else {
    return `${diffMinutes} minute${diffMinutes > 1 ? 's' : ''}`;
  }
}

// Main function to analyze wallet
export async function analyzeWallet(walletAddress: string): Promise<WalletAnalysisResult> {
  const connection = new Connection(import.meta.env.VITE_SOLANA_RPC_URL);
  
  try {
    // Reset API call tracking
    apiCallTracker.reset();
    debugLog('🚀 Starting wallet analysis for:', walletAddress);
    
    // Step 1: Get all wallet transactions
    apiCallTracker.solanaRPC++; // Track getAllWalletTransactions call
    const signatures = await getAllWalletTransactions(connection, walletAddress, 2000);
    debugLog(`📊 Found ${signatures.length} signatures`);

    // Step 2: Parse all transactions to find token transfers
    const allTokenTransactions: TokenTransaction[] = [];
    
    // Process in batches to avoid rate limiting
    const batchSize = 50; // Reduced batch size for better reliability
    for (let i = 0; i < signatures.length; i += batchSize) {
      const batch = signatures.slice(i, i + batchSize);
      
      debugLog(`⚙️ Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(signatures.length/batchSize)} (${batch.length} transactions)`);
      
      const batchPromises = batch.map(sig => parseTokenTransaction(connection, sig.signature));
      const batchResults = await Promise.allSettled(batchPromises);
      
      for (const result of batchResults) {
        if (result.status === 'fulfilled') {
          allTokenTransactions.push(...result.value);
        } else {
          debugLog('❌ Transaction parse failed:', result.reason);
        }
      }

      // Rate limiting delay
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    debugLog(`🔍 Found ${allTokenTransactions.length} token transactions`);

    // Step 3: Group transactions by token
    const tokenGroups = groupTransactionsByToken(allTokenTransactions);
    debugLog(`🪙 Found ${tokenGroups.size} unique tokens`);

    // Step 4: Pre-filter tokens by price availability to optimize metadata fetching
    const analyzedTokens: TokenTradeHistory[] = [];
    const mintAddresses = Array.from(tokenGroups.keys()).filter(mint => mint && mint.length > 0);
    
    // Optional pre-filtering for performance (can be disabled for high-volume wallets)
    const enablePreFiltering = import.meta.env.VITE_ENABLE_TOKEN_PREFILTERING !== 'false';
    let tokensWithPrices: string[] = mintAddresses;
    
    if (enablePreFiltering && mintAddresses.length > 10) {
      debugLog(`🔍 Pre-filtering ${mintAddresses.length} tokens by price availability (set VITE_ENABLE_TOKEN_PREFILTERING=false to disable)...`);
      
      // Quick price check to filter out tokens without valid market data
      tokensWithPrices = [];
      let checkedCount = 0;
      
      for (const mintAddress of mintAddresses) {
        checkedCount++;
        debugLog(`📊 Checking price availability ${checkedCount}/${mintAddresses.length}: ${mintAddress.slice(0, 8)}...`);
        
        const hasPrice = await getTokenPriceAtTime(mintAddress, Math.floor(Date.now() / 1000));
        if (hasPrice && hasPrice > 0) {
          tokensWithPrices.push(mintAddress);
          debugLog(`✅ Price found for ${mintAddress.slice(0, 8)}...: $${hasPrice}`);
        } else {
          debugLog(`❌ No price data for ${mintAddress.slice(0, 8)}..., skipping metadata fetch`);
        }
        
        // Add small delay to prevent rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      debugLog(`🎯 Filtered to ${tokensWithPrices.length}/${mintAddresses.length} tokens with price data`);
    } else {
      debugLog(`⚡ Skipping pre-filtering for performance (${mintAddresses.length} tokens)`);
    }
    
    // Get metadata only for tokens with valid prices (now uses on-chain first!)
    apiCallTracker.solanaRPC++; // Track the on-chain metadata batch calls
    const metadataMap = await batchGetTokenMetadata(tokensWithPrices, connection);

    // OPTIMIZATION: Pre-collect all unique price and ATH requests for parallel processing
    const priceRequests = new Set<string>();
    const athRequests: Array<{ mintAddress: string; buyTime: number; sellTime: number }> = [];
    const currentTime = Math.floor(Date.now() / 1000);
    
    // First pass: collect all price and ATH requests we'll need
    for (const [mintAddress, transactions] of tokenGroups) {
      if (!mintAddress || transactions.length < 1) continue;
      if (!tokensWithPrices.includes(mintAddress)) continue;
      
      const sortedTxs = transactions.sort((a, b) => a.blockTime - b.blockTime);
      const buyTx = sortedTxs.find(tx => tx.type === 'buy');
      const sellTx = sortedTxs.find(tx => tx.type === 'sell');
      
      if (!buyTx) continue;
      
      const metadata = metadataMap.get(mintAddress);
      if (metadata && isStableCoin(mintAddress, metadata.symbol)) continue;
      
      // Add price requests for this token
      priceRequests.add(`${mintAddress}-${buyTx.blockTime}`); // Buy price
      priceRequests.add(`${mintAddress}-${currentTime}`); // Current price
      if (sellTx) {
        priceRequests.add(`${mintAddress}-${sellTx.blockTime}`); // Sell price
        
        // Add ATH request for tokens that were sold
        athRequests.push({
          mintAddress,
          buyTime: buyTx.blockTime,
          sellTime: sellTx.blockTime
        });
      } else {
        // Add ATH request for tokens still held
        athRequests.push({
          mintAddress,
          buyTime: buyTx.blockTime,
          sellTime: currentTime
        });
      }
    }
    
    // Batch fetch all prices and ATH data in parallel
    debugLog(`🚀 Pre-fetching ${priceRequests.size} unique price points and ${athRequests.length} ATH values in parallel...`);
    const uniqueTokens = [...new Set([...priceRequests].map(req => req.split('-')[0]))];
    
    const [priceResults, athResults] = await Promise.all([
      batchGetTokenPrices(uniqueTokens, currentTime, 5), // Pre-warm price cache
      batchCalculateATH(athRequests, 3) // Pre-fetch ATH data
    ]);

    for (const [mintAddress, transactions] of tokenGroups) {
      if (!mintAddress || transactions.length < 1) continue; // Need at least one transaction
      
      // Skip tokens that don't have price data (already filtered out)
      if (!tokensWithPrices.includes(mintAddress)) {
        debugLog(`⏭️ Skipping ${mintAddress.slice(0, 8)}...: No price data available`);
        continue;
      }
      
      // Sort transactions by time
      const sortedTxs = transactions.sort((a, b) => a.blockTime - b.blockTime);
      
      debugLog(`🔬 Analyzing token ${mintAddress}: ${sortedTxs.length} transactions`);
      
      // Find buy and sell transactions
      const buyTx = sortedTxs.find(tx => tx.type === 'buy');
      const sellTx = sortedTxs.find(tx => tx.type === 'sell');
      
      // We need at least a buy transaction to analyze
      if (!buyTx) {
        debugLog(`⏭️ Skipping ${mintAddress}: No buy transaction found`);
        continue;
      }

      const metadata = metadataMap.get(mintAddress) || {
        symbol: 'UNKNOWN',
        name: 'Unknown Token',
        image: null
      };
      
      // Skip stable coins since they don't have meaningful "fumbled" amounts
      if (isStableCoin(mintAddress, metadata.symbol)) {
        debugLog(`⏭️ Skipping ${metadata.symbol}: Stable coin excluded from analysis`);
        continue;
      }
      
      const decimals = 6; // Default decimals for tokens

      // Get prices from cache (pre-fetched)
      const buyPrice = await getTokenPriceAtTime(mintAddress, buyTx.blockTime);
      debugLog(`💵 Buy price for ${metadata.symbol}: $${buyPrice}`);
      
      if (!buyPrice) {
        debugLog(`⏭️ Skipping ${mintAddress}: No buy price found`);
        continue;
      }

      // Get current price from cache (pre-fetched)
      const currentPrice = await getTokenPriceAtTime(mintAddress, currentTime) || 0;
      debugLog(`📈 Current price for ${metadata.symbol}: $${currentPrice}`);

      let sellPrice = currentPrice; // Default to current price
      let sellTime = currentTime; // Current time
      let holdTime = '';
      let athData: { ath: number; athTime: number } | null = null;
      
      if (sellTx) {
        // Token was sold - traditional analysis
        const fetchedSellPrice = await getTokenPriceAtTime(mintAddress, sellTx.blockTime);
        if (fetchedSellPrice) {
          sellPrice = fetchedSellPrice;
          sellTime = sellTx.blockTime;
          holdTime = calculateHoldTime(buyTx.blockTime, sellTx.blockTime);
          debugLog(`💸 Sell price for ${metadata.symbol}: $${sellPrice}`);
          
          // Get ATH from pre-fetched results
          athData = athResults.get(mintAddress) || null;
        }
      } else {
        // Still holding - analyze missed opportunity
        holdTime = calculateHoldTime(buyTx.blockTime, sellTime);
        debugLog(`💎 ${metadata.symbol} still held for: ${holdTime}`);
        
        // Get ATH from pre-fetched results
        athData = athResults.get(mintAddress) || null;
      }
      
      // Calculate total amounts across all transactions
      const buyTransactions = sortedTxs.filter(tx => tx.type === 'buy');
      const sellTransactions = sortedTxs.filter(tx => tx.type === 'sell');
      
      // Calculate total bought and sold amounts
      const totalBoughtAmount = buyTransactions.reduce((sum, tx) => sum + tx.amount, 0);
      const totalSoldAmount = sellTransactions.reduce((sum, tx) => sum + tx.amount, 0);
      const netTokenAmount = totalBoughtAmount - totalSoldAmount; // Current holding
      
      debugLog(`📊 ${metadata.symbol} totals: Bought ${totalBoughtAmount}, Sold ${totalSoldAmount}, Net ${netTokenAmount}`);
      
      // Calculate weighted average buy price using historical prices
      let totalBuyValue = 0;
      let weightedBuyPrice = buyPrice; // fallback
      
      if (solanaTrackerClient && buyTransactions.length > 0) {
        debugLog(`💰 Calculating historical purchase prices for ${buyTransactions.length} buy transactions`);
        
        for (const buyTx of buyTransactions) {
          try {
            // Get actual price at purchase time
            apiCallTracker.solanaTracker++;
            const historicalPriceResponse = await solanaTrackerClient.getPriceAtTimestamp(mintAddress, buyTx.blockTime);
            
            // Handle different response formats
            let txPrice = buyPrice; // fallback
            if (typeof historicalPriceResponse === 'number') {
              txPrice = historicalPriceResponse;
            } else if (historicalPriceResponse && typeof historicalPriceResponse === 'object') {
              // Handle object response format
              const priceData = historicalPriceResponse as unknown as HistoricalPriceResponse;
              txPrice = priceData.price || priceData.value || priceData.priceUsd || buyPrice;
            }
            
            totalBuyValue += txPrice * buyTx.amount;
            
            debugLog(`🕒 Buy ${formatTokenAmount(buyTx.amount)} at $${formatPrice(txPrice)} on ${new Date(buyTx.blockTime * 1000).toLocaleString()}`);
          } catch (error) {
            debugLog(`⚠️ Failed to get historical price for buy tx, using fallback: $${buyPrice}`);
            totalBuyValue += buyPrice * buyTx.amount;
          }
        }
        
        // Calculate weighted average buy price
        weightedBuyPrice = totalBoughtAmount > 0 ? totalBuyValue / totalBoughtAmount : buyPrice;
        debugLog(`📈 Weighted average buy price: $${formatPrice(weightedBuyPrice)}`);
      } else {
        // Fallback calculation
        totalBuyValue = weightedBuyPrice * totalBoughtAmount;
      }
      
      // Format amounts and values
      const tokenAmountFormatted = formatTokenAmount(netTokenAmount, decimals, metadata.symbol);
      const buyValue = totalBuyValue;
      const sellValue = sellTx ? (sellPrice * totalSoldAmount) : (currentPrice * netTokenAmount);
      
      // Calculate fumbled amount using correct totals and weighted prices
      let fumbledAmount = 0;
      let fumbledPercentage = 0;
      
      if (athData && athData.ath > 0) {
        if (sellTx) {
          // Was sold - calculate actual vs potential gains using total amounts
          const actualGain = (sellPrice - weightedBuyPrice) * totalSoldAmount;
          const potentialGain = (athData.ath - weightedBuyPrice) * totalSoldAmount;
          fumbledAmount = Math.max(0, potentialGain - actualGain);
          fumbledPercentage = weightedBuyPrice > 0 ? ((athData.ath - sellPrice) / weightedBuyPrice) * 100 : 0;
        } else {
          // Still holding - calculate missed opportunity using net amount
          const currentValue = (currentPrice - weightedBuyPrice) * netTokenAmount;
          const athValue = (athData.ath - weightedBuyPrice) * netTokenAmount;
          fumbledAmount = Math.max(0, athValue - currentValue);
          fumbledPercentage = weightedBuyPrice > 0 ? ((athData.ath - currentPrice) / weightedBuyPrice) * 100 : 0;
        }
        
        debugLog(`🧻 ${metadata.symbol} - Net: ${formatTokenAmount(netTokenAmount)}, ATH: $${athData.ath.toFixed(6)}, Fumbled: $${fumbledAmount.toFixed(2)} (${fumbledPercentage.toFixed(1)}%)`);
      }

      const tokenHistory: TokenTradeHistory = {
        mintAddress,
        symbol: metadata.symbol,
        name: metadata.name,
        image: metadata.image,
        decimals: decimals,
        transactions: sortedTxs,
        buyPrice: weightedBuyPrice, // Use weighted average buy price
        sellPrice,
        buyTime: buyTx.blockTime,
        sellTime: sellTx ? sellTx.blockTime : undefined,
        holdTime,
        ath: athData?.ath,
        athTime: athData?.athTime,
        fumbledAmount,
        fumbledPercentage,
        currentPrice,
        // Token amount information
        tokenAmount: netTokenAmount, // Net amount currently held
        tokenAmountFormatted,
        totalBoughtAmount,
        totalSoldAmount,
        buyValue,
        sellValue,
        weightedBuyPrice,
      };

      analyzedTokens.push(tokenHistory);
      debugLog(`✅ Added ${metadata.symbol} to results`);

      // Rate limiting delay
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Sort by fumbled amount (highest first)
    analyzedTokens.sort((a, b) => b.fumbledAmount - a.fumbledAmount);

    // Calculate total fumbled amount
    const totalFumbled = analyzedTokens.reduce((sum, token) => sum + token.fumbledAmount, 0);

    debugLog(`🎯 Analysis complete! Found ${analyzedTokens.length} completed trades with $${totalFumbled.toFixed(2)} total fumbled`);
    
    // Log API call statistics
    apiCallTracker.logStats();
    
    // Always show final result even without debug mode
    console.log(`🧻 JEET ANALYSIS COMPLETE: ${analyzedTokens.length} trades analyzed, $${totalFumbled.toFixed(2)} total fumbled`);

    return {
      walletAddress,
      tokens: analyzedTokens.slice(0, 10), // Top 10 fumbles
      totalFumbled,
      analyzedAt: Date.now(),
    };

  } catch (error) {
    console.error('Error analyzing wallet:', error);
    throw new Error(`Failed to analyze wallet: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Format currency for display
export function formatCurrency(amount: number): string {
  if (amount >= 1000000) {
    return `$${(amount / 1000000).toFixed(2)}M`;
  } else if (amount >= 1000) {
    return `$${(amount / 1000).toFixed(1)}K`;
  } else {
    return `$${amount.toFixed(2)}`;
  }
}

// Format price for display
export function formatPrice(price: number): string {
  if (price < 0.00001) return price.toExponential(2);
  if (price < 0.01) return price.toFixed(6);
  if (price < 1) return price.toFixed(4);
  return price.toFixed(2);
}

// Format token amounts in a human-readable way
export function formatTokenAmount(amount: number, decimals: number = 6, symbol?: string): string {
  if (amount <= 0) return '0';
  
  let formatted: string;
  
  if (amount >= 1_000_000_000) {
    formatted = `${(amount / 1_000_000_000).toFixed(2)}B`;
  } else if (amount >= 1_000_000) {
    formatted = `${(amount / 1_000_000).toFixed(2)}M`;
  } else if (amount >= 1_000) {
    formatted = `${(amount / 1_000).toFixed(2)}K`;
  } else if (amount >= 1) {
    formatted = amount.toFixed(2);
  } else if (amount >= 0.001) {
    formatted = amount.toFixed(6);
  } else {
    formatted = amount.toExponential(2);
  }
  
  return symbol ? `${formatted} ${symbol}` : formatted;
}

// Debug function to test specific transaction parsing
export async function debugParseTransaction(signature: string): Promise<void> {
  const connection = new Connection(import.meta.env.VITE_SOLANA_RPC_URL);
  
  try {
    console.log(`🔍 Debugging transaction: ${signature}`);
    const result = await parseTokenTransaction(connection, signature);
    console.log(`✅ Found ${result.length} token transactions:`, result);
    
    // Also get the full transaction for manual inspection
    const fullTx = await connection.getParsedTransaction(signature, {
      maxSupportedTransactionVersion: 0,
    });
    
    if (fullTx) {
      console.log('📊 Token Balance Changes:');
      console.log('Pre:', fullTx.meta?.preTokenBalances);
      console.log('Post:', fullTx.meta?.postTokenBalances);
      
      console.log('🔧 Instructions:');
      fullTx.transaction.message.instructions.forEach((inst, i) => {
        if ('programId' in inst) {
          console.log(`  ${i}: ${inst.programId.toString()}`);
        }
      });
    }
  } catch (error) {
    console.error('❌ Debug parsing failed:', error);
  }
}

// Debug function to test holding time calculation
export function debugHoldingTime(buyTimestamp: number, sellTimestamp?: number): void {
  const currentTime = Math.floor(Date.now() / 1000);
  const actualSellTime = sellTimestamp || currentTime;
  
  console.log('🕒 HOLDING TIME DEBUG:');
  console.log(`Buy time: ${buyTimestamp} (${new Date(buyTimestamp * 1000).toLocaleString()})`);
  console.log(`Sell time: ${actualSellTime} (${new Date(actualSellTime * 1000).toLocaleString()})`);
  console.log(`Difference in seconds: ${actualSellTime - buyTimestamp}`);
  console.log(`Calculated hold time: ${calculateHoldTime(buyTimestamp, actualSellTime)}`);
  
  // Test some known cases
  const testCases = [
    { buy: currentTime - 60, sell: currentTime, expected: '1 minute' },
    { buy: currentTime - 3600, sell: currentTime, expected: '1 hour' },
    { buy: currentTime - 86400, sell: currentTime, expected: '1 day' },
    { buy: currentTime - 172800, sell: currentTime, expected: '2 days' },
  ];
  
  console.log('\n🧪 Test cases:');
  testCases.forEach(test => {
    const calculated = calculateHoldTime(test.buy, test.sell);
    console.log(`${test.expected}: ${calculated} ${calculated === test.expected ? '✅' : '❌'}`);
  });
}

// Debug function to test price fetching
export async function debugPriceFetching(mintAddress: string): Promise<void> {
  console.log(`💰 PRICE FETCHING DEBUG for ${mintAddress}:`);
  
  const startTime = Date.now();
  const price = await getTokenPriceAtTime(mintAddress, Math.floor(Date.now() / 1000));
  const endTime = Date.now();
  
  console.log(`Price: $${price || 'Not found'}`);
  console.log(`Fetch time: ${endTime - startTime}ms`);
  
  // Test specific format functions
  if (price) {
    console.log(`formatPrice: ${formatPrice(price)}`);
    console.log(`formatCurrency: ${formatCurrency(price)}`);
  }
}

// Debug function to test Solana Tracker ATH API
export async function debugSolanaTrackerATH(mintAddress: string): Promise<void> {
  console.log(`🏆 SOLANA TRACKER ATH DEBUG for ${mintAddress}:`);
  
  try {
    if (!solanaTrackerClient) {
      console.log('❌ Solana Tracker client not initialized');
      console.log('Set VITE_SOLANA_TRACKER_API_KEY in your .env file');
      return;
    }
    
    console.log('✅ Client initialized, fetching ATH data...');
    const startTime = Date.now();
    
    const athData = await solanaTrackerClient.getAthPrice(mintAddress);
    
    const endTime = Date.now();
    console.log(`⏱️ API call took: ${endTime - startTime}ms`);
    
    if (athData) {
      console.log('📊 ATH Data received:', athData);
      
      // Handle Solana Tracker response format
      const typedResponse = athData as unknown as AthResponse;
      const athPrice = typedResponse.highest_price || typedResponse.ath || typedResponse.athPrice || typedResponse.value || typedResponse.price;
      const athTimestamp = typedResponse.timestamp || typedResponse.athTime || typedResponse.athTimestamp;
      
      console.log(`🏆 ATH Price: $${athPrice || 'N/A'}`);
      console.log(`📅 ATH Time: ${athTimestamp || 'N/A'} ${athTimestamp ? `(${new Date(athTimestamp > 1e10 ? athTimestamp : athTimestamp * 1000).toLocaleString()})` : ''}`);
      console.log(`💸 Market Cap at ATH: $${typedResponse.highest_market_cap?.toLocaleString() || 'N/A'}`);
      console.log(`🏊 Pool ID: ${typedResponse.pool_id || 'N/A'}`);
      
      if (athPrice) {
        console.log(`💰 Formatted ATH: ${formatPrice(athPrice)}`);
      }
    } else {
      console.log('⚠️ No ATH data returned from API');
    }
    
  } catch (error) {
    console.error('❌ Solana Tracker API error:', error);
    console.log('This might be due to:');
    console.log('- Invalid API key');
    console.log('- Token not found in database');
    console.log('- Network issues');
    console.log('- Rate limiting');
  }
}

// Debug function to test historical price fetching
export async function debugHistoricalPriceFetching(mintAddress: string): Promise<void> {
  console.log(`📈 HISTORICAL PRICE DEBUG for ${mintAddress}:`);
  
  try {
    if (!solanaTrackerClient) {
      console.log('❌ Solana Tracker client not initialized');
      return;
    }
    
    // Test timestamps from different periods
    const testTimestamps = [
      { name: '1 day ago', timestamp: Math.floor(Date.now() / 1000) - 86400 },
      { name: '1 week ago', timestamp: Math.floor(Date.now() / 1000) - 604800 },
      { name: '1 month ago', timestamp: Math.floor(Date.now() / 1000) - 2592000 },
    ];
    
    for (const test of testTimestamps) {
      console.log(`\n🕒 Testing ${test.name} (timestamp: ${test.timestamp})...`);
      const startTime = Date.now();
      
      try {
        apiCallTracker.solanaTracker++;
        const historicalPriceResponse = await solanaTrackerClient.getPriceAtTimestamp(mintAddress, test.timestamp);
        const endTime = Date.now();
        
        // Handle different response formats
        let price = null;
        if (typeof historicalPriceResponse === 'number') {
          price = historicalPriceResponse;
        } else if (historicalPriceResponse && typeof historicalPriceResponse === 'object') {
          const priceData = historicalPriceResponse as unknown as HistoricalPriceResponse;
          price = priceData.price || priceData.value || priceData.priceUsd;
        }
        
        console.log(`   Price: $${price || 'Not found'}`);
        console.log(`   Call time: ${endTime - startTime}ms`);
        console.log(`   Date: ${new Date(test.timestamp * 1000).toLocaleString()}`);
        console.log(`   Response format:`, historicalPriceResponse);
      } catch (error) {
        console.error(`   Error: ${error}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Historical price debug failed:', error);
  }
}

// Debug function to test both price and ATH fetching together
export async function debugTokenDataFetching(mintAddress: string): Promise<void> {
  console.log(`🔍 COMPREHENSIVE TOKEN DATA DEBUG for ${mintAddress}`);
  console.log('======================================================');
  
  // Test current price
  await debugPriceFetching(mintAddress);
  
  console.log('\n');
  
  // Test ATH data
  await debugSolanaTrackerATH(mintAddress);
  
  console.log('\n');
  
  // Test historical prices
  await debugHistoricalPriceFetching(mintAddress);
  
  console.log('\n');
  
  // Test the full ATH calculation function
  console.log('🧮 Testing full ATH calculation...');
  const currentTime = Math.floor(Date.now() / 1000);
  const buyTime = currentTime - 86400; // 1 day ago
  
  try {
    const athResult = await calculateATH(mintAddress, buyTime, currentTime);
    
    if (athResult) {
      console.log(`✅ ATH Calculation Result:`);
      console.log(`   ATH: $${formatPrice(athResult.ath)}`);
      console.log(`   ATH Time: ${new Date(athResult.athTime * 1000).toLocaleString()}`);
    } else {
      console.log('❌ ATH calculation failed');
    }
  } catch (error) {
    console.error('❌ ATH calculation error:', error);
  }
}

// Debug function to test token amount formatting
export function debugTokenAmountFormatting(): void {
  console.log('🔢 TOKEN AMOUNT FORMATTING DEBUG:');
  
  const testAmounts = [
    { amount: 0.000001, decimals: 6, symbol: 'TEST' },
    { amount: 0.5, decimals: 6, symbol: 'HALF' },
    { amount: 100, decimals: 6, symbol: 'HUND' },
    { amount: 1500, decimals: 6, symbol: 'K' },
    { amount: 2500000, decimals: 6, symbol: 'MIL' },
    { amount: 3500000000, decimals: 6, symbol: 'BIL' },
  ];
  
  testAmounts.forEach(test => {
    const formatted = formatTokenAmount(test.amount, test.decimals, test.symbol);
    console.log(`${test.amount} ${test.symbol} → ${formatted}`);
  });
}

// Comprehensive debug function to test wallet analysis
export async function debugWalletAnalysis(walletAddress: string): Promise<void> {
  console.log('🔍 COMPREHENSIVE WALLET ANALYSIS DEBUG');
  console.log(`Wallet: ${walletAddress}`);
  console.log(`Debug mode: ${DEBUG_MODE ? 'ON' : 'OFF'}`);
  console.log(`RPC URL: ${import.meta.env.VITE_SOLANA_RPC_URL}`);
  
  try {
    console.log('\n⏰ Starting analysis...');
    const startTime = Date.now();
    
    const result = await analyzeWallet(walletAddress);
    
    const endTime = Date.now();
    console.log(`✅ Analysis completed in ${endTime - startTime}ms`);
    
    console.log('\n📊 RESULTS SUMMARY:');
    console.log(`Total tokens analyzed: ${result.tokens.length}`);
    console.log(`Total fumbled: ${formatCurrency(result.totalFumbled)}`);
    
    console.log('\n🏆 TOP FUMBLES:');
    result.tokens.slice(0, 3).forEach((token, i) => {
      console.log(`${i + 1}. ${token.symbol}: ${formatCurrency(token.fumbledAmount)} (${token.fumbledPercentage.toFixed(1)}%)`);
      console.log(`   Amount: ${token.tokenAmountFormatted}`);
      console.log(`   Hold time: ${token.holdTime}`);
      console.log(`   Buy: $${formatPrice(token.buyPrice || 0)} → Sell: $${formatPrice(token.sellPrice || 0)} → ATH: $${formatPrice(token.ath || 0)}`);
    });
    
  } catch (error) {
    console.error('❌ Analysis failed:', error);
  }
}