import { Connection, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL, ComputeBudgetProgram } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID, AccountLayout, createCloseAccountInstruction, getAssociatedTokenAddress, createBurnInstruction, getMint } from '@solana/spl-token';
import axios from 'axios';
import { batchGetTokenMetadata } from './tokenMetadata';

// Constants
export const COMMISSION_WALLET = 'Gr4UJFwgysRNRFLr5RPUEcFRt9G3wRV4QeNzkwBfsBVZ';
export const ALFIE_TOKEN_MINT = 'E8HYPNXeXk5tjd1z3Se1qDBuVkjKvj7gEsKriRYtjups';
export const ALFIE_THRESHOLD = 50000; // 50k tokens (Sprig / project mint) for fee waiver
export const COMMISSION_RATE = 0.01; // 1%

// Type definitions
export interface TokenAccount {
  id: string;
  mintAddress: string;
  tokenAccount: string;
  balance: number;
  decimals: number;
  symbol?: string;
  name?: string;
  image?: string;
  price?: number;
}

export interface EmptyTokenAccount {
  id: string;
  mintAddress: string;
  tokenAccount: string;
  rentLamports: number;
  rentSOL: number;
  symbol?: string;
  name?: string;
  image?: string;
}



// Fetch user's token accounts
export async function fetchUserTokens(
  connection: Connection,
  walletPubkey: PublicKey
): Promise<TokenAccount[]> {
  try {
    const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
      walletPubkey,
      { programId: TOKEN_PROGRAM_ID }
    );

    const tokens: TokenAccount[] = [];
    const mintAddresses: string[] = [];
    const tokenMap = new Map<string, { pubkey: string; balance: number; decimals: number }>();
    
    // First pass: collect all non-empty token accounts
    for (const { account, pubkey } of tokenAccounts.value) {
      const parsedInfo = account.data.parsed.info;
      const balance = parsedInfo.tokenAmount.uiAmount;
      
      // Skip empty accounts
      if (balance === 0) continue;
      
      const mintAddress = parsedInfo.mint;
      const decimals = parsedInfo.tokenAmount.decimals;
      
      mintAddresses.push(mintAddress);
      tokenMap.set(mintAddress, {
        pubkey: pubkey.toString(),
        balance,
        decimals
      });
    }
    
    // Batch fetch prices for all tokens at once
    interface PriceData {
      usdPrice: number;
      blockId: number;
      decimals: number;
      priceChange24h?: number;
    }
    let priceData: Record<string, PriceData> = {};
    if (mintAddresses.length > 0) {
      try {
        // Jupiter Price API V3 supports up to 50 tokens at once
        const batchSize = 50;
        for (let i = 0; i < mintAddresses.length; i += batchSize) {
          const batch = mintAddresses.slice(i, i + batchSize);
          const priceResponse = await axios.get<Record<string, PriceData>>(`https://lite-api.jup.ag/price/v3?ids=${batch.join(',')}`);
          priceData = { ...priceData, ...priceResponse.data };
        }
      } catch (error) {
        console.error('Error fetching batch prices:', error);
      }
    }
    
    // Batch fetch metadata for all tokens
    const metadataMap = await batchGetTokenMetadata(mintAddresses, connection);
    
    // Second pass: create token objects with metadata
    for (const mintAddress of mintAddresses) {
      const tokenData = tokenMap.get(mintAddress)!;
      const metadata = metadataMap.get(mintAddress) || {
        symbol: 'UNKNOWN',
        name: 'Unknown Token',
        image: null
      };
      
      // Get price from batch response
      const price = priceData[mintAddress]?.usdPrice || 0;
      
      tokens.push({
        id: tokenData.pubkey,
        mintAddress,
        tokenAccount: tokenData.pubkey,
        balance: tokenData.balance,
        decimals: tokenData.decimals,
        symbol: metadata.symbol,
        name: metadata.name,
        image: metadata.image,
        price: price
      });
    }
    
    return tokens;
  } catch (error) {
    console.error('Error fetching user tokens:', error);
    throw error;
  }
}

// Check if user holds enough project tokens (mint: ALFIE_TOKEN_MINT) for fee waiver
export async function checkAlfieBalance(
  connection: Connection,
  walletPubkey: PublicKey
): Promise<boolean> {
  try {
    const projectMint = new PublicKey(ALFIE_TOKEN_MINT);
    const tokenAddress = await getAssociatedTokenAddress(projectMint, walletPubkey);
    
    const accountInfo = await connection.getAccountInfo(tokenAddress);
    if (!accountInfo) return false;
    
    const accountData = AccountLayout.decode(accountInfo.data);
    const balance = Number(accountData.amount) / Math.pow(10, 6); // token has 6 decimals
    
    return balance >= ALFIE_THRESHOLD;
  } catch (error) {
    console.error('Error checking project token balance:', error);
    return false;
  }
}

// Calculate rent for token accounts
export async function calculateRentForAccounts(
  connection: Connection,
  numAccounts: number
): Promise<number> {
  const rentExemption = await connection.getMinimumBalanceForRentExemption(AccountLayout.span);
  return (rentExemption * numAccounts) / LAMPORTS_PER_SOL;
}

// Create burn transaction
export async function createBurnTransaction(
  connection: Connection,
  walletPubkey: PublicKey,
  tokenAccounts: string[],
  hasAlfieBalance: boolean,
  isFirstBatch: boolean = true
): Promise<{ transaction: Transaction; totalRent: number; commission: number }> {
  const transaction = new Transaction();
  
  // Calculate total rent to be recovered
  const rentExemption = await connection.getMinimumBalanceForRentExemption(AccountLayout.span);
  const totalRentLamports = rentExemption * tokenAccounts.length;
  const totalRent = totalRentLamports / LAMPORTS_PER_SOL;
  
  // Calculate commission (only on first batch to avoid multiple charges)
  const commission = hasAlfieBalance ? 0 : (isFirstBatch ? totalRent * COMMISSION_RATE : 0);
  
  // Add compute budget instructions for priority
  transaction.add(
    ComputeBudgetProgram.setComputeUnitPrice({
      microLamports: 1000, // Priority fee
    })
  );
  
  transaction.add(
    ComputeBudgetProgram.setComputeUnitLimit({
      units: 800000, // Max compute units
    })
  );
  
  // Process each token account
  for (const tokenAccountAddress of tokenAccounts) {
    const tokenAccountPubkey = new PublicKey(tokenAccountAddress);
    
    // Get token account info
    const tokenAccountInfo = await connection.getAccountInfo(tokenAccountPubkey);
    if (!tokenAccountInfo) continue;
    
    // Decode token account data
    const tokenAccountData = AccountLayout.decode(tokenAccountInfo.data);
    const mintPubkey = new PublicKey(tokenAccountData.mint);
    const amount = tokenAccountData.amount;
    
    // Only add burn instruction if there's a balance
    if (amount > BigInt(0)) {
      // Get mint info to check decimals
      try {
        const mintInfo = await getMint(connection, mintPubkey);
        
        // Create burn instruction
        const burnInstruction = createBurnInstruction(
          tokenAccountPubkey,
          mintPubkey,
          walletPubkey,
          amount,
          []
        );
        transaction.add(burnInstruction);
      } catch (error) {
        console.error('Error getting mint info:', error);
        // Skip this token if we can't get mint info
        continue;
      }
    }
    
    // Add close account instruction (after burn)
    const closeInstruction = createCloseAccountInstruction(
      tokenAccountPubkey,
      walletPubkey,
      walletPubkey,
      []
    );
    transaction.add(closeInstruction);
  }
  
  // Add commission transfer if applicable
  if (commission > 0) {
    const commissionInstruction = SystemProgram.transfer({
      fromPubkey: walletPubkey,
      toPubkey: new PublicKey(COMMISSION_WALLET),
      lamports: Math.floor(commission * LAMPORTS_PER_SOL)
    });
    transaction.add(commissionInstruction);
  }
  
  // Get recent blockhash
  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
  transaction.recentBlockhash = blockhash;
  transaction.feePayer = walletPubkey;
  
  return { transaction, totalRent, commission };
}

// Fetch empty token accounts
export async function fetchEmptyTokenAccounts(
  connection: Connection,
  walletPubkey: PublicKey
): Promise<EmptyTokenAccount[]> {
  try {
    const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
      walletPubkey,
      { programId: TOKEN_PROGRAM_ID }
    );

    const emptyAccounts: EmptyTokenAccount[] = [];
    const mintAddresses: string[] = [];
    const accountMap = new Map<string, { pubkey: string; rentLamports: number }>();
    
    // Calculate rent exemption amount
    const rentExemption = await connection.getMinimumBalanceForRentExemption(AccountLayout.span);
    
    // First pass: collect all empty token accounts
    for (const { account, pubkey } of tokenAccounts.value) {
      const parsedInfo = account.data.parsed.info;
      const balance = parsedInfo.tokenAmount.uiAmount;
      
      // Only include empty accounts (balance === 0)
      if (balance === 0) {
        const mintAddress = parsedInfo.mint;
        
        mintAddresses.push(mintAddress);
        accountMap.set(mintAddress, {
          pubkey: pubkey.toString(),
          rentLamports: rentExemption
        });
      }
    }
    
    // Batch fetch metadata for all empty token accounts
    let metadataMap = new Map();
    try {
      metadataMap = await batchGetTokenMetadata(mintAddresses, connection);
    } catch (error) {
      console.error('Error fetching metadata, using defaults:', error);
    }
    
    // Second pass: create empty account objects with metadata
    for (const mintAddress of mintAddresses) {
      const accountData = accountMap.get(mintAddress)!;
      const metadata = metadataMap.get(mintAddress) || {
        symbol: 'UNKNOWN',
        name: 'Unknown Token',
        image: null
      };
      
      emptyAccounts.push({
        id: accountData.pubkey,
        mintAddress,
        tokenAccount: accountData.pubkey,
        rentLamports: accountData.rentLamports,
        rentSOL: accountData.rentLamports / LAMPORTS_PER_SOL,
        symbol: metadata.symbol || 'UNKNOWN',
        name: metadata.name || 'Unknown Token',
        image: metadata.image || null
      });
    }
    
    return emptyAccounts;
  } catch (error) {
    console.error('Error fetching empty token accounts:', error);
    throw error;
  }
}

// Create close empty accounts transaction
export async function createCloseAccountsTransaction(
  connection: Connection,
  walletPubkey: PublicKey,
  emptyAccounts: string[],
  hasAlfieBalance: boolean,
  isFirstBatch: boolean = true
): Promise<{ transaction: Transaction; totalRent: number; commission: number }> {
  const transaction = new Transaction();
  
  // Calculate total rent to be recovered
  const rentExemption = await connection.getMinimumBalanceForRentExemption(AccountLayout.span);
  const totalRentLamports = rentExemption * emptyAccounts.length;
  const totalRent = totalRentLamports / LAMPORTS_PER_SOL;
  
  // Calculate commission (only on first batch to avoid multiple charges)
  const commission = hasAlfieBalance ? 0 : (isFirstBatch ? totalRent * COMMISSION_RATE : 0);
  
  // Add compute budget instructions for priority
  transaction.add(
    ComputeBudgetProgram.setComputeUnitPrice({
      microLamports: 1000, // Priority fee
    })
  );
  
  transaction.add(
    ComputeBudgetProgram.setComputeUnitLimit({
      units: 300000, // Compute units for closing accounts (less than burning)
    })
  );
  
  // Process each empty token account
  for (const tokenAccountAddress of emptyAccounts) {
    const tokenAccountPubkey = new PublicKey(tokenAccountAddress);
    
    // Add close account instruction
    const closeInstruction = createCloseAccountInstruction(
      tokenAccountPubkey,
      walletPubkey, // Rent goes back to wallet
      walletPubkey, // Authority (wallet owner)
      []
    );
    transaction.add(closeInstruction);
  }
  
  // Add commission transfer if applicable
  if (commission > 0) {
    const commissionInstruction = SystemProgram.transfer({
      fromPubkey: walletPubkey,
      toPubkey: new PublicKey(COMMISSION_WALLET),
      lamports: Math.floor(commission * LAMPORTS_PER_SOL)
    });
    transaction.add(commissionInstruction);
  }
  
  // Get recent blockhash
  const { blockhash } = await connection.getLatestBlockhash();
  transaction.recentBlockhash = blockhash;
  transaction.feePayer = walletPubkey;
  
  return { transaction, totalRent, commission };
}

// Calculate total rent recoverable
export function calculateTotalRent(emptyAccounts: EmptyTokenAccount[]): number {
  return emptyAccounts.reduce((total, account) => total + account.rentSOL, 0);
}

// Format SOL amount for display
export function formatSOL(amount: number): string {
  if (amount < 0.001) {
    return '< 0.001 SOL';
  }
  return `${amount.toFixed(6)} SOL`;
}

// Constants for batching
export const MAX_ACCOUNTS_PER_BATCH = 10; // Conservative limit for transaction size

// Enhanced transaction confirmation with timeout and retry
export async function confirmTransactionWithTimeout(
  connection: Connection,
  signature: string,
  timeoutMs: number = 60000
): Promise<{ success: boolean; error?: string }> {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeoutMs) {
    try {
      const status = await connection.getSignatureStatus(signature, {
        searchTransactionHistory: true
      });
      
      if (status.value) {
        if (status.value.err) {
          return { 
            success: false, 
            error: `Transaction failed: ${JSON.stringify(status.value.err)}` 
          };
        }
        
        if (status.value.confirmationStatus === 'confirmed' || 
            status.value.confirmationStatus === 'finalized') {
          return { success: true };
        }
      }
      
      // Wait a bit before checking again
      await new Promise(resolve => setTimeout(resolve, 2000));
    } catch (error) {
      console.error('Error checking transaction status:', error);
      // Continue trying until timeout
    }
  }
  
  // Check one more time if transaction exists on chain
  try {
    const finalStatus = await connection.getSignatureStatus(signature, {
      searchTransactionHistory: true
    });
    
    if (finalStatus.value && !finalStatus.value.err) {
      return { success: true };
    }
  } catch (error) {
    console.error('Final status check failed:', error);
  }
  
  return { 
    success: false, 
    error: 'Transaction confirmation timeout - but may still be processing' 
  };
}

