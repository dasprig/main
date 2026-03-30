import axios from 'axios';
import { Connection, PublicKey } from '@solana/web3.js';

export interface TokenMetadata {
  symbol: string;
  name: string;
  image: string | null;
  uri?: string | null; // Optional URI field for metadata JSON
}

// Metaplex Token Metadata Program constants
const METADATA_PROGRAM_ID = new PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s');
const METADATA_SEED = 'metadata';

// Note: We parse metadata manually due to variable-length strings in Metaplex format

// Cache for token metadata to avoid repeated fetches
const metadataCache = new Map<string, TokenMetadata>();

// Cache for failed tokens to avoid repeated API calls
const failedTokensCache = new Set<string>();

// === ON-CHAIN METADATA FUNCTIONS ===
// These functions fetch token metadata directly from the Solana blockchain
// using the Metaplex Token Metadata Program. This is much faster and more
// reliable than external APIs since we can batch RPC calls (50 at a time).

// Derive metadata PDA for a token mint
function getMetadataPDA(mintAddress: string): PublicKey {
  const [metadataAccount] = PublicKey.findProgramAddressSync(
    [
      Buffer.from(METADATA_SEED),
      METADATA_PROGRAM_ID.toBuffer(),
      new PublicKey(mintAddress).toBuffer(),
    ],
    METADATA_PROGRAM_ID
  );
  return metadataAccount;
}

// Parse metadata from raw account data
function parseMetadataAccount(data: Buffer): TokenMetadata | null {
  try {
    if (!data || data.length < 100) return null;
    
    let offset = 1; // Skip key byte
    offset += 32; // Skip update authority
    offset += 32; // Skip mint
    
    // Read name (variable length string)
    const nameLength = data.readUInt32LE(offset);
    offset += 4;
    const name = data.slice(offset, offset + nameLength).toString('utf8').replace(/\0/g, '');
    offset += nameLength;
    
    // Read symbol (variable length string)
    const symbolLength = data.readUInt32LE(offset);
    offset += 4;
    const symbol = data.slice(offset, offset + symbolLength).toString('utf8').replace(/\0/g, '');
    offset += symbolLength;
    
    // Read URI (variable length string)
    const uriLength = data.readUInt32LE(offset);
    offset += 4;
    const uri = data.slice(offset, offset + uriLength).toString('utf8').replace(/\0/g, '');
    
    console.log(`🔍 [METADATA] Parsed on-chain metadata:`, {
      symbol: symbol || 'UNKNOWN',
      name: name || 'Unknown Token',
      uri: uri || 'No URI',
      hasUri: !!uri
    });
    
    return {
      name: name || 'Unknown Token',
      symbol: symbol || 'UNKNOWN',
      image: null, // Will be populated from URI
      uri: uri || null // Keep URI separate for fetching
    };
  } catch (error) {
    console.warn('Failed to parse metadata account:', error);
    return null;
  }
}

// Batch fetch metadata from blockchain
async function batchGetOnChainMetadata(
  connection: Connection,
  mintAddresses: string[]
): Promise<Map<string, TokenMetadata>> {
  const results = new Map<string, TokenMetadata>();
  
  
  // Process in batches of 50 (RPC limit)
  const BATCH_SIZE = 50;
  
  for (let i = 0; i < mintAddresses.length; i += BATCH_SIZE) {
    const batch = mintAddresses.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(mintAddresses.length / BATCH_SIZE);
    
    
    try {
      // Get metadata PDAs for this batch
      const metadataPDAs = batch.map(mint => getMetadataPDA(mint));
      
      // Batch fetch all metadata accounts
      const accounts = await connection.getMultipleAccountsInfo(metadataPDAs);
      
      // Process each account
      for (let j = 0; j < batch.length; j++) {
        const mintAddress = batch[j];
        const account = accounts[j];
        
        if (account && account.data) {
          const metadata = parseMetadataAccount(account.data);
          if (metadata) {
            results.set(mintAddress, metadata);
          } else {
            console.log(`⚠️ Failed to parse metadata for ${mintAddress.slice(0, 8)}...`);
          }
        } else {
          console.log(`❌ No metadata account for ${mintAddress.slice(0, 8)}...`);
        }
      }
      
      // Small delay between batches to be nice to the RPC
      if (i + BATCH_SIZE < mintAddresses.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
    } catch (error) {
      console.error(`❌ Failed to fetch metadata batch ${batchNum}:`, error);
    }
  }
  
  console.log(`🎯 Successfully fetched ${results.size}/${mintAddresses.length} on-chain metadata`);
  return results;
}

// Optional: Fetch actual image URLs from metadata URIs
async function enhanceMetadataWithImages(
  metadataMap: Map<string, TokenMetadata>,
  maxConcurrent = 5
): Promise<void> {
  const tokensWithUris = Array.from(metadataMap.entries()).filter(
    ([_, metadata]) => metadata.uri && metadata.uri.startsWith('http') && !metadata.image
  );
  
  if (tokensWithUris.length === 0) return;
  
  
  // Process in small batches to avoid overwhelming servers
  for (let i = 0; i < tokensWithUris.length; i += maxConcurrent) {
    const batch = tokensWithUris.slice(i, i + maxConcurrent);
    
    await Promise.allSettled(
      batch.map(async ([mintAddress, metadata]) => {
        try {
          if (!metadata.uri) return;
          
          
          const response = await axios.get(metadata.uri, { 
            timeout: 5000,
            headers: {
              'Accept': 'application/json',
            }
          });
          
          if (response.data && response.data.image) {
            // Update the metadata with the actual image URL
            const updatedMetadata = {
              ...metadata,
              image: response.data.image,
              name: response.data.name || metadata.name,
              // Keep URI for reference but don't overwrite symbol
            };
            metadataMap.set(mintAddress, updatedMetadata);
            metadataCache.set(mintAddress, updatedMetadata);
          } else {
            console.log(`❌ [METADATA] No image found in URI for ${metadata.symbol}`);
          }
        } catch (error) {
          console.log(`⚠️ [METADATA] Failed to fetch URI for ${metadata.symbol}:`, error.message);
        }
      })
    );
    
    // Small delay between batches
    if (i + maxConcurrent < tokensWithUris.length) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
}

// Known token metadata for popular tokens
const KNOWN_TOKENS: Record<string, TokenMetadata> = {
  'So11111111111111111111111111111111111111112': {
    symbol: 'SOL',
    name: 'Wrapped SOL',
    image: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png'
  },
  'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v': {
    symbol: 'USDC',
    name: 'USD Coin',
    image: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v/logo.png'
  },
  'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB': {
    symbol: 'USDT',
    name: 'USDT',
    image: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB/logo.svg'
  },
  'E8HYPNXeXk5tjd1z3Se1qDBuVkjKvj7gEsKriRYtjups': {
    symbol: 'SPRIG',
    name: 'sprig token',
    image: '/alfie.webp'
  }
};

// Solana Token Registry API - lighter alternative
async function fetchTokenRegistryMetadata(mintAddress: string): Promise<TokenMetadata | null> {
  try {
    const response = await axios.get(`https://cdn.jsdelivr.net/gh/solana-labs/token-list@main/src/tokens/solana.tokenlist.json`);
    const tokenList = response.data;
    
    if (tokenList.tokens) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const token = tokenList.tokens.find((t: any) => t.address === mintAddress);
      if (token) {
        return {
          symbol: token.symbol || 'UNKNOWN',
          name: token.name || 'Unknown Token',
          image: token.logoURI || null
        };
      }
    }
  } catch (error) {
    console.error('Error fetching from token registry:', error);
  }
  return null;
}

// Jupiter API for token metadata (with enhanced error handling)
async function fetchJupiterMetadata(mintAddress: string): Promise<TokenMetadata | null> {
  try {
    const response = await axios.get(`https://tokens.jup.ag/token/${mintAddress}`, {
      timeout: 8000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json',
      }
    });
    
    if (response.data) {
      return {
        symbol: response.data.symbol || 'UNKNOWN',
        name: response.data.name || 'Unknown Token',
        image: response.data.logoURI || null
      };
    }
  } catch (error: unknown) {
    // Handle specific error types
    const axiosError = error as { code?: string; message?: string; response?: { status: number } };
    if (axiosError.code === 'ERR_NETWORK' || axiosError.message?.includes('CORS')) {
      console.warn(`🚫 CORS/Network error for Jupiter API: ${mintAddress.slice(0, 8)}...`);
    } else if (axiosError.response?.status === 429) {
      console.warn(`⏳ Rate limited by Jupiter API: ${mintAddress.slice(0, 8)}...`);
      // Wait a bit longer before retrying
      await new Promise(resolve => setTimeout(resolve, 1000));
    } else {
      console.warn(`❌ Jupiter API error for ${mintAddress.slice(0, 8)}...:`, axiosError.message);
    }
  }
  return null;
}

// Alternative API for pump.fun and other new tokens
async function fetchAlternativeMetadata(mintAddress: string): Promise<TokenMetadata | null> {
  try {
    // Try DexScreener API as alternative
    const response = await axios.get(`https://api.dexscreener.com/latest/dex/tokens/${mintAddress}`, {
      timeout: 5000
    });
    
    if (response.data?.pairs?.[0]) {
      const pair = response.data.pairs[0];
      return {
        symbol: pair.baseToken?.symbol || 'UNKNOWN',
        name: pair.baseToken?.name || 'Unknown Token',
        image: pair.info?.imageUrl || null
      };
    }
  } catch (error) {
    console.warn(`DexScreener API failed for ${mintAddress.slice(0, 8)}...`);
  }
  return null;
}

// Simple on-chain metadata parser (fallback)
async function fetchSimpleOnChainMetadata(
  connection: Connection,
  mintAddress: string
): Promise<TokenMetadata | null> {
  try {
    const TOKEN_METADATA_PROGRAM_ID = new PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s');
    const mintPubkey = new PublicKey(mintAddress);
    
    // Derive metadata PDA
    const [metadataPDA] = PublicKey.findProgramAddressSync(
      [
        Buffer.from('metadata'),
        TOKEN_METADATA_PROGRAM_ID.toBuffer(),
        mintPubkey.toBuffer(),
      ],
      TOKEN_METADATA_PROGRAM_ID
    );

    const accountInfo = await connection.getAccountInfo(metadataPDA);
    if (!accountInfo) return null;

    // Simple parser - extract name and symbol
    const data = accountInfo.data;
    if (data.length < 69) return null;

    let offset = 69; // Skip to name section
    
    try {
      const nameLength = data.readUInt32LE(offset);
      offset += 4;
      const name = data.subarray(offset, offset + nameLength).toString('utf8').replace(/\0/g, '').trim();
      offset += nameLength;
      
      const symbolLength = data.readUInt32LE(offset);
      offset += 4;
      const symbol = data.subarray(offset, offset + symbolLength).toString('utf8').replace(/\0/g, '').trim();
      offset += symbolLength;
      
      const uriLength = data.readUInt32LE(offset);
      offset += 4;
      const uri = data.subarray(offset, offset + uriLength).toString('utf8').replace(/\0/g, '').trim();
      
      // Try to fetch image from URI
      let image = null;
      if (uri && uri.startsWith('http')) {
        try {
          const uriResponse = await axios.get(uri, { timeout: 3000 });
          if (uriResponse.data?.image) {
            image = uriResponse.data.image;
          }
        } catch {
          // Ignore URI fetch errors
        }
      }
      
      return {
        symbol: symbol || 'UNKNOWN',
        name: name || 'Unknown Token',
        image
      };
    } catch {
      return null;
    }
  } catch (error) {
    console.error('Error fetching simple on-chain metadata:', error);
    return null;
  }
}

// Main function to get token metadata with multiple fallbacks
export async function getTokenMetadata(
  mintAddress: string,
  connection?: Connection
): Promise<TokenMetadata> {
  
  // Check cache first
  if (metadataCache.has(mintAddress)) {
    const cached = metadataCache.get(mintAddress)!;
    return cached;
  }

  // Check if this token previously failed to avoid repeated API calls
  if (failedTokensCache.has(mintAddress)) {
    const fallbackMetadata = {
      symbol: 'UNKNOWN',
      name: 'Unknown Token',
      image: null
    };
    metadataCache.set(mintAddress, fallbackMetadata);
    return fallbackMetadata;
  }

  // Check known tokens
  if (KNOWN_TOKENS[mintAddress]) {
    metadataCache.set(mintAddress, KNOWN_TOKENS[mintAddress]);
    return KNOWN_TOKENS[mintAddress];
  }

  // Special handling for pump.fun tokens (often end with 'pump')
  const isPumpToken = mintAddress.toLowerCase().endsWith('pump');

  let metadata: TokenMetadata = {
    symbol: 'UNKNOWN',
    name: 'Unknown Token',
    image: null
  };

  // Try multiple sources in order of preference
  
  // 1. Try Solana Token Registry first (CORS-friendly)
  const registryData = await fetchTokenRegistryMetadata(mintAddress);
  if (registryData && registryData.symbol !== 'UNKNOWN') {
    metadata = registryData;
  } else {
    // 2. For pump.fun tokens, try DexScreener first
    if (isPumpToken) {
      const altData = await fetchAlternativeMetadata(mintAddress);
      if (altData && altData.symbol !== 'UNKNOWN') {
        metadata = altData;
      }
    }
    
    // 3. Try on-chain metadata if still unknown
    if (metadata.symbol === 'UNKNOWN' && connection) {
      const onChainData = await fetchSimpleOnChainMetadata(connection, mintAddress);
      if (onChainData && onChainData.symbol !== 'UNKNOWN') {
        metadata = onChainData;
      }
    }
    
    // 4. Try Jupiter API as last resort (with better error handling)
    if (metadata.symbol === 'UNKNOWN') {
      try {
        const jupiterData = await fetchJupiterMetadata(mintAddress);
        if (jupiterData && jupiterData.symbol !== 'UNKNOWN') {
          metadata = jupiterData;
        }
      } catch (error) {
        // Silently fail Jupiter API calls to prevent blocking
        console.warn(`Jupiter API failed for ${mintAddress.slice(0, 8)}...:`, error);
      }
    }
    
    // 5. Try alternative API for non-pump tokens if still unknown
    if (metadata.symbol === 'UNKNOWN' && !isPumpToken) {
      const altData = await fetchAlternativeMetadata(mintAddress);
      if (altData && altData.symbol !== 'UNKNOWN') {
        metadata = altData;
      }
    }
  }

  // Add fallback image if none found
  if (!metadata.image) {
    // Try to use a generic token icon or the symbol as fallback
    metadata.image = `https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/${mintAddress}/logo.png`;
  }

  // Cache failed tokens to avoid repeated API calls
  if (metadata.symbol === 'UNKNOWN') {
    failedTokensCache.add(mintAddress);
  }

  // Cache the result
  metadataCache.set(mintAddress, metadata);
  
  return metadata;
}

// Batch fetch metadata for multiple tokens (ON-CHAIN FIRST!)
export async function batchGetTokenMetadata(
  mintAddresses: string[],
  connection?: Connection
): Promise<Map<string, TokenMetadata>> {
  const results = new Map<string, TokenMetadata>();
  const startTime = Date.now();
  
  
  
  // Step 1: Check cache first
  const uncachedMints: string[] = [];
  for (const mintAddress of mintAddresses) {
    if (metadataCache.has(mintAddress)) {
      results.set(mintAddress, metadataCache.get(mintAddress)!);
    } else if (KNOWN_TOKENS[mintAddress]) {
      results.set(mintAddress, KNOWN_TOKENS[mintAddress]);
      metadataCache.set(mintAddress, KNOWN_TOKENS[mintAddress]);
    } else {
      uncachedMints.push(mintAddress);
    }
  }
  
  if (uncachedMints.length === 0) {
    
    return results;
  }
  
  
  
  // Step 2: Try on-chain metadata first (MUCH FASTER!)
  let onChainResults = new Map<string, TokenMetadata>();
  if (connection) {
    try {
      onChainResults = await batchGetOnChainMetadata(connection, uncachedMints);
      
      // Enhance on-chain metadata with images from URIs
      await enhanceMetadataWithImages(onChainResults);
      
      // Add successful on-chain results (now with enhanced images)
      for (const [mint, metadata] of onChainResults) {
        results.set(mint, metadata);
        metadataCache.set(mint, metadata);
      }
      
      
    } catch (error) {
      console.error('❌ On-chain metadata fetch failed:', error);
    }
  }
  
  // Step 3: Fallback to external APIs for remaining tokens
  const remainingMints = uncachedMints.filter(mint => !onChainResults.has(mint));
  
  if (remainingMints.length > 0) {
    
    
    // Process external API calls with delays (only for tokens without on-chain data)
    for (let i = 0; i < remainingMints.length; i++) {
      const mintAddress = remainingMints[i];
      
      try {
        
        const metadata = await getTokenMetadata(mintAddress, connection);
        
        if (metadata.symbol !== 'UNKNOWN') {
          console.log(`✅ External API success: ${metadata.symbol} - ${metadata.name}`);
        } else {
          console.log(`⚠️ No external metadata for ${mintAddress.slice(0, 8)}...`);
        }
        
        results.set(mintAddress, metadata);
        metadataCache.set(mintAddress, metadata);
        
        // Add delay between external API requests to prevent rate limiting
        if (i < remainingMints.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      } catch (error) {
        console.error(`❌ Error fetching external metadata for ${mintAddress}:`, error);
        const fallbackMetadata = {
          symbol: 'UNKNOWN',
          name: 'Unknown Token',
          image: null
        };
        results.set(mintAddress, fallbackMetadata);
        metadataCache.set(mintAddress, fallbackMetadata);
      }
    }
  }
  
  
  
  
  return results;
}