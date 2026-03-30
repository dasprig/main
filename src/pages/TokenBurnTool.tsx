import {
  Flame,
  Check,
  AlertTriangle,
  Wallet,
  Terminal,
  Search,
  Trash2,
  Coins,
} from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { useToast } from "@/components/ui/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Link } from "react-router-dom";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import {
  fetchUserTokens,
  checkAlfieBalance,
  createBurnTransaction,
  fetchEmptyTokenAccounts,
  createCloseAccountsTransaction,
  calculateTotalRent,
  formatSOL,
  confirmTransactionWithTimeout,
  TokenAccount,
  EmptyTokenAccount,
  ALFIE_TOKEN_MINT,
  ALFIE_THRESHOLD,
  COMMISSION_RATE,
  MAX_ACCOUNTS_PER_BATCH,
} from "@/utils/solanaTokenUtils";
import {
  recordBurnTransaction,
  recordCloseTransaction,
  initializeDatabase,
} from "@/utils/databaseUtils";

// Type definitions
interface BurnResults {
  burnedTokens: TokenAccount[];
  solRewards: number;
  totalValue: number;
  transactionId: string;
  timestamp: string;
  tokensCount: number;
  commission: number;
}

interface CloseResults {
  closedAccounts: EmptyTokenAccount[];
  solRecovered: number;
  transactionId: string;
  timestamp: string;
  accountsCount: number;
  commission: number;
}

const TokenBurnTool = () => {
  const { toast } = useToast();
  const { connection } = useConnection();
  const { publicKey, connected, sendTransaction } = useWallet();

  // Tab state
  const [activeTab, setActiveTab] = useState("burn");

  // Burn tab state
  const [userTokens, setUserTokens] = useState<TokenAccount[]>([]);
  const [selectedTokens, setSelectedTokens] = useState<Set<string>>(new Set());
  const [priceFilter, setPriceFilter] = useState(1); // Default $1 max for safety
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isBurning, setIsBurning] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [burnResults, setBurnResults] = useState<BurnResults | null>(null);
  const [hasAlfieBalance, setHasAlfieBalance] = useState(false);
  const [isLoadingTokens, setIsLoadingTokens] = useState(false);

  // Empty accounts tab state
  const [emptyAccounts, setEmptyAccounts] = useState<EmptyTokenAccount[]>([]);
  const [isLoadingEmpty, setIsLoadingEmpty] = useState(false);
  const [isClosingAccounts, setIsClosingAccounts] = useState(false);
  const [showCloseDialog, setShowCloseDialog] = useState(false);
  const [showCloseResults, setShowCloseResults] = useState(false);
  const [closeResults, setCloseResults] = useState<CloseResults | null>(null);

  // Price filter options
  const PRICE_OPTIONS = [
    { value: 1, label: "$1" },
    { value: 10, label: "$10" },
    { value: 30, label: "$30" },
    { value: 100, label: "$100" },
    { value: Infinity, label: "All" },
  ];

  // Load tokens from wallet
  const loadUserTokens = useCallback(async () => {
    if (!publicKey) return;

    setIsLoadingTokens(true);
    try {
      const tokens = await fetchUserTokens(connection, publicKey);
      setUserTokens(tokens);
      toast({
        title: "Tokens Loaded",
        description: `Found ${tokens.length} tokens in your wallet`,
      });
    } catch (error) {
      console.error("Error loading tokens:", error);
      toast({
        title: "Error Loading Tokens",
        description: "Failed to load tokens from wallet. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingTokens(false);
    }
  }, [connection, publicKey, toast]);

  // Check Sprig token balance (mint: ALFIE_TOKEN_MINT)
  const checkUserAlfieBalance = useCallback(async () => {
    if (!publicKey) return;

    try {
      const hasBalance = await checkAlfieBalance(connection, publicKey);
      setHasAlfieBalance(hasBalance);

      if (hasBalance) {
        toast({
          title: "Sprig holder detected! 🎉",
          description: `You hold ${ALFIE_THRESHOLD.toLocaleString()}+ $SPRIG — all fees are FREE!`,
        });
      }
    } catch (error) {
      console.error("Error checking Sprig token balance:", error);
    }
  }, [connection, publicKey, toast]);

  // Load empty accounts from wallet
  const loadEmptyAccounts = useCallback(async () => {
    if (!publicKey) return;

    setIsLoadingEmpty(true);
    try {
      const accounts = await fetchEmptyTokenAccounts(connection, publicKey);
      setEmptyAccounts(accounts);

      if (accounts.length === 0) {
        toast({
          title: "Perfect! 🎉",
          description: "No empty token accounts found. Your wallet is clean!",
        });
      }
    } catch (error) {
      console.error("Error loading empty accounts:", error);
      toast({
        title: "Error Loading Empty Accounts",
        description:
          "Failed to load empty accounts from wallet. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingEmpty(false);
    }
  }, [connection, publicKey, toast]);

  // Initialize database when component mounts
  useEffect(() => {
    initializeDatabase();
  }, []);

  // Load user tokens when wallet connects
  useEffect(() => {
    if (connected && publicKey) {
      loadUserTokens();
      loadEmptyAccounts();
      checkUserAlfieBalance();
    } else {
      setUserTokens([]);
      setEmptyAccounts([]);
      setHasAlfieBalance(false);
    }
  }, [
    connected,
    publicKey,
    loadUserTokens,
    loadEmptyAccounts,
    checkUserAlfieBalance,
  ]);

  // Close all empty accounts
  const handleCloseAllAccounts = async () => {
    if (!publicKey || emptyAccounts.length === 0) return;

    setIsClosingAccounts(true);
    setShowCloseDialog(false);

    try {
      const totalRent = calculateTotalRent(emptyAccounts);
      const commission = hasAlfieBalance ? 0 : totalRent * COMMISSION_RATE;
      const accountIds = emptyAccounts.map((acc) => acc.id);

      // Process in batches if necessary
      const batches: string[][] = [];
      for (let i = 0; i < accountIds.length; i += MAX_ACCOUNTS_PER_BATCH) {
        batches.push(accountIds.slice(i, i + MAX_ACCOUNTS_PER_BATCH));
      }

      let totalProcessed = 0;
      let totalSolRecovered = 0;
      let totalCommissionPaid = 0;
      const allTransactionIds: string[] = [];

      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];
        const isFirstBatch = i === 0;

        toast({
          title: `Processing ${i + 1}/${batches.length}`,
          description: `Closing ${batch.length} accounts...`,
          duration: 3000,
        });

        try {
          const {
            transaction,
            totalRent: batchRent,
            commission: batchCommission,
          } = await createCloseAccountsTransaction(
            connection,
            publicKey,
            batch,
            hasAlfieBalance,
            isFirstBatch
          );

          // Send transaction
          const txId = await sendTransaction(transaction, connection, {
            skipPreflight: false,
            preflightCommitment: "processed",
          });

          toast({
            title: "Transaction Sent! 📡",
            description: `Closing ${batch.length} accounts... Confirming transaction...`,
            duration: 5000,
          });

          // Use enhanced confirmation with timeout
          const confirmation = await confirmTransactionWithTimeout(
            connection,
            txId,
            60000
          );

          if (!confirmation.success) {
            // Even if confirmation times out, check if accounts were actually closed
            const stillEmpty = await fetchEmptyTokenAccounts(
              connection,
              publicKey
            );
            const currentEmptyCount = stillEmpty.length;
            const expectedEmptyCount =
              emptyAccounts.length - (totalProcessed + batch.length);

            if (currentEmptyCount <= expectedEmptyCount) {
              // Accounts were closed successfully despite confirmation timeout
              console.log(
                "Transaction likely succeeded despite confirmation timeout"
              );
            } else {
              throw new Error(
                confirmation.error || "Transaction confirmation failed"
              );
            }
          }

          allTransactionIds.push(txId);
          totalProcessed += batch.length;
          totalSolRecovered += batchRent;
          totalCommissionPaid += batchCommission;

          toast({
            title: "Success! ✅",
            description: `${batch.length} accounts closed. ${formatSOL(
              batchRent
            )} SOL recovered.`,
            duration: 5000,
          });

          if (i < batches.length - 1) {
            await new Promise((resolve) => setTimeout(resolve, 2000));
          }
        } catch (batchError) {
          console.error("Batch error:", batchError);
          toast({
            title: "Batch Error ❌",
            description: `Error processing batch ${i + 1}: ${
              batchError instanceof Error ? batchError.message : "Unknown error"
            }. Other batches may still succeed.`,
            variant: "destructive",
            duration: 8000,
          });

          // Continue with next batch instead of failing completely
          continue;
        }
      }

      // Show final results
      if (totalProcessed > 0) {
        const results: CloseResults = {
          closedAccounts: emptyAccounts.slice(0, totalProcessed),
          solRecovered: totalSolRecovered,
          transactionId: allTransactionIds[0],
          timestamp: new Date().toLocaleString("en-US"),
          accountsCount: totalProcessed,
          commission: totalCommissionPaid,
        };

        setCloseResults(results);
        setShowCloseResults(true);

        // Record transaction in database
        try {
          await recordCloseTransaction(
            publicKey.toString(),
            allTransactionIds[0], // Use first transaction ID as primary
            emptyAccounts.slice(0, totalProcessed),
            totalSolRecovered - totalCommissionPaid,
            totalCommissionPaid,
            hasAlfieBalance
          );
        } catch (dbError) {
          console.error('Failed to record close transaction in database:', dbError);
          // Don't show error to user - this is background operation
        }

        // Refresh the lists
        await loadEmptyAccounts();
        await loadUserTokens();

        toast({
          title: "Empty Accounts Operation Complete! 🗑️",
          description: `Successfully closed ${totalProcessed} accounts and recovered ${formatSOL(
            totalSolRecovered
          )} SOL`,
          duration: 10000,
        });
      } else {
        toast({
          title: "No Accounts Closed ❌",
          description:
            "No empty accounts were successfully closed. Please check your connection and try again.",
          variant: "destructive",
          duration: 10000,
        });
      }
    } catch (error) {
      console.error("Error closing accounts:", error);
      const errorMsg =
        error instanceof Error ? error.message : "Unknown error occurred";
      toast({
        title: "Empty Accounts Operation Failed ❌",
        description: `Critical error occurred: ${errorMsg}`,
        variant: "destructive",
        duration: 10000,
      });
    } finally {
      setIsClosingAccounts(false);
    }
  };

  // Filter tokens based on price and search query
  const filteredTokens = userTokens.filter((token) => {
    const matchesPrice = !token.price || token.price <= priceFilter;
    const matchesSearch =
      searchQuery === "" ||
      token.symbol?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      token.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      token.mintAddress.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesPrice && matchesSearch;
  });

  const handleTokenSelect = (tokenId: string) => {
    const newSelection = new Set(selectedTokens);
    if (newSelection.has(tokenId)) {
      newSelection.delete(tokenId);
    } else {
      newSelection.add(tokenId);
    }
    setSelectedTokens(newSelection);
  };

  const handleSelectAll = () => {
    if (selectedTokens.size === filteredTokens.length) {
      setSelectedTokens(new Set());
    } else {
      setSelectedTokens(new Set(filteredTokens.map((token) => token.id)));
    }
  };

  const handleBurnTokens = () => {
    if (selectedTokens.size === 0) {
      toast({
        title: "No tokens selected",
        description: "Please select at least one token to burn",
        variant: "destructive",
      });
      return;
    }

    // Show confirmation dialog
    setShowConfirmDialog(true);
  };

  const confirmBurn = async () => {
    if (!publicKey || !connected) return;

    setShowConfirmDialog(false);
    setIsBurning(true);

    try {
      const selectedAccounts = Array.from(selectedTokens)
        .map((id) => userTokens.find((token) => token.id === id)?.tokenAccount)
        .filter(Boolean) as string[];

      // Process tokens in batches to avoid transaction size limits
      const TOKENS_PER_BATCH = 8; // Safe batch size to stay under 1232 byte limit
      const batches = [];
      for (let i = 0; i < selectedAccounts.length; i += TOKENS_PER_BATCH) {
        batches.push(selectedAccounts.slice(i, i + TOKENS_PER_BATCH));
      }

      const allSignatures: string[] = [];
      let totalRentEarned = 0;
      let totalCommissionPaid = 0;

      let successfulBatches = 0;

      // Process each batch
      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];

        toast({
          title: `Processing Batch ${i + 1}/${batches.length}`,
          description: `Burning ${batch.length} tokens...`,
        });

        try {
          // Create burn transaction for this batch
          const { transaction, totalRent, commission } =
            await createBurnTransaction(
              connection,
              publicKey,
              batch,
              hasAlfieBalance,
              i === 0 // Only charge commission on first batch
            );

          // Send transaction
          const signature = await sendTransaction(transaction, connection, {
            skipPreflight: false,
            preflightCommitment: "processed",
          });

          toast({
            title: "Transaction Sent! 📡",
            description: `Burning ${batch.length} tokens... Confirming transaction...`,
            duration: 5000,
          });

          // Use enhanced confirmation with timeout
          const confirmation = await confirmTransactionWithTimeout(
            connection,
            signature,
            60000
          );

          if (!confirmation.success) {
            // Even if confirmation times out, check if tokens were actually closed
            const currentTokens = await fetchUserTokens(connection, publicKey);
            const currentSelectedCount = currentTokens.filter((token) =>
              Array.from(selectedTokens).includes(token.id)
            ).length;
            const expectedRemainingCount =
              selectedTokens.size -
              (successfulBatches + 1) * Math.min(10, batch.length);

            if (currentSelectedCount <= expectedRemainingCount) {
              // Tokens were burned successfully despite confirmation timeout
              console.log(
                "Transaction likely succeeded despite confirmation timeout"
              );
            } else {
              throw new Error(
                confirmation.error || "Transaction confirmation failed"
              );
            }
          }

          allSignatures.push(signature);
          totalRentEarned += totalRent;
          totalCommissionPaid += commission;
          successfulBatches++;

          toast({
            title: "Batch Success! ✅",
            description: `${batch.length} tokens burned. ${formatSOL(
              totalRent
            )} SOL recovered.`,
            duration: 5000,
          });

          // Short delay between batches
          if (i < batches.length - 1) {
            await new Promise((resolve) => setTimeout(resolve, 2000));
          }
        } catch (batchError) {
          console.error("Batch burn error:", batchError);
          toast({
            title: "Batch Error ❌",
            description: `Error processing batch ${i + 1}: ${
              batchError instanceof Error ? batchError.message : "Unknown error"
            }. Other batches may still succeed.`,
            variant: "destructive",
            duration: 8000,
          });

          // Continue with next batch instead of failing completely
          continue;
        }
      }

      // Get burned tokens details
      const burnedTokens = Array.from(selectedTokens)
        .map((id) => userTokens.find((token) => token.id === id))
        .filter(Boolean) as TokenAccount[];

      const totalValue = burnedTokens.reduce(
        (sum, token) => sum + token.balance * (token.price || 0),
        0
      );

      const results: BurnResults = {
        burnedTokens,
        solRewards: totalRentEarned - totalCommissionPaid,
        totalValue,
        transactionId: allSignatures[0], // Use first transaction ID for display
        timestamp: new Date().toISOString(),
        tokensCount: burnedTokens.length,
        commission: totalCommissionPaid,
      };

      setBurnResults(results);
      setIsBurning(false);
      setSelectedTokens(new Set());
      setShowResults(true);

      // Reload tokens after burn
      loadUserTokens();

      // Record transaction in database
      if (successfulBatches > 0 && publicKey) {
        try {
          await recordBurnTransaction(
            publicKey.toString(),
            allSignatures[0], // Use first transaction ID as primary
            burnedTokens,
            totalRentEarned - totalCommissionPaid,
            totalCommissionPaid,
            hasAlfieBalance
          );
        } catch (dbError) {
          console.error('Failed to record burn transaction in database:', dbError);
          // Don't show error to user - this is background operation
        }
      }

      // Show final results
      if (successfulBatches > 0) {
        toast({
          title: "Burn Operation Complete! 🔥",
          description: `Successfully processed ${successfulBatches}/${
            batches.length
          } batches. Burned ${burnedTokens.length} tokens and received ${(
            totalRentEarned - totalCommissionPaid
          ).toFixed(3)} SOL`,
          duration: 10000,
        });
      } else {
        toast({
          title: "Burn Operation Failed ❌",
          description:
            "No batches were processed successfully. Please check your connection and try again.",
          variant: "destructive",
          duration: 10000,
        });
      }
    } catch (error) {
      console.error("Error burning tokens:", error);
      setIsBurning(false);
      toast({
        title: "Burn Operation Failed ❌",
        description:
          error instanceof Error
            ? `Critical error: ${error.message}`
            : "Failed to burn tokens. Please try again.",
        variant: "destructive",
        duration: 10000,
      });
    }
  };

  const selectedCount = selectedTokens.size;
  const selectedTokenDetails = Array.from(selectedTokens)
    .map((id) => userTokens.find((token) => token.id === id))
    .filter(Boolean) as TokenAccount[];
  const totalValue = selectedTokenDetails.reduce(
    (sum, token) => sum + token.balance * (token.price || 0),
    0
  );

  // Results Page Component
  const ResultsPage = () => (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <div className="mb-6">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-500/10 border-2 border-green-500 mb-4">
            <Check className="w-10 h-10 text-green-500" />
          </div>
          <h2 className="text-2xl font-bold terminal-text mb-2 font-mono">
            BURN COMPLETE
          </h2>
          <p className="text-gray-400 font-mono text-sm">
            Transaction confirmed on Solana blockchain
          </p>
        </div>

        {/* Quick Stats */}
        <div className="inline-flex items-center gap-6 text-sm font-mono">
          <div className="flex items-center gap-2">
            <Flame className="w-4 h-4 text-orange-500" />
            <span className="text-gray-300">
              {burnResults?.tokensCount} burned
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-green-400">
              +{burnResults?.solRewards?.toFixed(3)} SOL
            </span>
          </div>
          {burnResults?.commission && burnResults.commission > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-gray-500">
                Fee: {burnResults.commission.toFixed(3)} SOL
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Results Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-primary-color/5 border border-primary-color/30 rounded-lg p-4 text-center hover:bg-primary-color/10 transition-colors">
          <div className="text-3xl font-bold font-mono mb-1 terminal-text">
            {burnResults?.tokensCount}
          </div>
          <div className="text-gray-500 text-xs font-mono uppercase">
            Tokens Burned
          </div>
        </div>
        <div className="bg-green-500/5 border border-green-500/30 rounded-lg p-4 text-center hover:bg-green-500/10 transition-colors">
          <div className="text-3xl font-bold font-mono mb-1 text-green-400">
            +{burnResults?.solRewards?.toFixed(3)}
          </div>
          <div className="text-gray-500 text-xs font-mono uppercase">
            SOL Earned
          </div>
        </div>
        <div className="bg-primary-color/5 border border-primary-color/30 rounded-lg p-4 text-center hover:bg-primary-color/10 transition-colors">
          <div className="text-3xl font-bold font-mono mb-1 terminal-text">
            $
            {burnResults?.totalValue?.toLocaleString("en-US", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </div>
          <div className="text-gray-500 text-xs font-mono uppercase">
            Value Removed
          </div>
        </div>
      </div>

      {/* Commission Info */}
      {burnResults?.commission === 0 && (
        <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 text-center">
          <p className="text-green-400 font-mono text-sm">
            🎉 FREE BURN - You saved{" "}
            {(burnResults.solRewards * COMMISSION_RATE).toFixed(3)} SOL in fees
            as a Sprig holder!
          </p>
        </div>
      )}

      {/* Transaction Details */}
      <div className="bg-black/30 border border-primary-color/20 rounded-lg overflow-hidden">
        <div className="bg-primary-color/10 px-4 py-2 border-b border-primary-color/20">
          <h3 className="terminal-text font-mono text-sm font-bold">
            TRANSACTION DETAILS
          </h3>
        </div>
        <div className="p-4 space-y-3 font-mono text-sm">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <div className="text-gray-500 text-xs mb-1">TX HASH</div>
              <a
                href={`https://explorer.solana.com/tx/${burnResults?.transactionId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="terminal-text text-xs hover:text-primary-color transition-colors break-all flex items-center gap-1 group"
              >
                {burnResults?.transactionId.slice(0, 20)}...
                {burnResults?.transactionId.slice(-20)}
                <svg
                  className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                  />
                </svg>
              </a>
            </div>
            <div>
              <div className="text-gray-500 text-xs mb-1">NETWORK</div>
              <div className="terminal-text text-xs">Solana Mainnet</div>
            </div>
          </div>
          <div>
            <div className="text-gray-500 text-xs mb-1">TIMESTAMP</div>
            <div className="terminal-text text-xs">
              {burnResults?.timestamp &&
                new Date(burnResults.timestamp).toLocaleString()}
            </div>
          </div>
          <div className="pt-2 border-t border-primary-color/10">
            <a
              href={`https://explorer.solana.com/tx/${burnResults?.transactionId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="terminal-button px-4 py-2 rounded text-xs font-mono flex items-center gap-2 justify-center hover:bg-primary-color hover:text-black transition-all"
            >
              View on Solana Explorer
              <svg
                className="w-3 h-3"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                />
              </svg>
            </a>
          </div>
        </div>
      </div>

      {/* Burned Tokens List */}
      <div className="bg-black/30 border border-primary-color/20 rounded-lg overflow-hidden">
        <div className="bg-primary-color/10 px-4 py-2 border-b border-primary-color/20">
          <h3 className="terminal-text font-mono text-sm font-bold">
            BURNED TOKENS ({burnResults?.tokensCount})
          </h3>
        </div>
        <div className="p-4">
          <div className="space-y-1 max-h-64 overflow-y-auto">
            {burnResults?.burnedTokens?.map((token, index) => (
              <div
                key={token.id}
                className="flex items-center justify-between py-2 px-3 hover:bg-primary-color/5 transition-colors rounded"
              >
                <div className="flex items-center gap-3">
                  <span className="text-gray-500 font-mono text-xs w-4">
                    {index + 1}.
                  </span>
                  {token.image && (
                    <img
                      src={token.image}
                      alt={token.symbol}
                      className="w-8 h-8 rounded-full"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                      }}
                    />
                  )}
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="terminal-text font-mono text-sm">
                        {token.symbol || "UNKNOWN"}
                      </span>
                      <span className="text-gray-500 text-xs">
                        • {token.name || "Unknown Token"}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-gray-400 font-mono text-xs">
                    {token.balance.toLocaleString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-3 pt-3 border-t border-primary-color/10 flex justify-between items-center">
            <span className="text-gray-500 text-xs font-mono">
              TOTAL REWARDS
            </span>
            <span className="text-green-400 font-mono text-sm font-bold">
              +{burnResults?.solRewards?.toFixed(3)} SOL
            </span>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <button
          onClick={() => {
            setShowResults(false);
            setBurnResults(null);
          }}
          className="terminal-button px-6 py-3 rounded font-mono text-sm"
        >
          BURN MORE TOKENS
        </button>
        <Link
          to="/"
          className="terminal-button px-6 py-3 rounded font-mono text-sm text-center"
        >
          BACK TO SPRIG
        </Link>
      </div>
    </div>
  );

  if (showResults && burnResults) {
    return (
      <>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&display=swap');
          
          .terminal-container {
            font-family: 'JetBrains Mono', monospace;
            background: #0a0a0a;
            border: 1px solid #e07a5d;
            box-shadow: 0 0 20px rgba(224, 122, 93, 0.2);
          }
          
          .terminal-header {
            background: #e07a5d;
            color: #0a0a0a;
          }
          
          .terminal-text {
            color: #e07a5d;
            text-shadow: 0 0 2px rgba(224, 122, 93, 0.5);
          }
          
          .terminal-button {
            background: transparent;
            border: 1px solid #e07a5d;
            color: #e07a5d;
            transition: all 0.2s;
          }
          
          .terminal-button:hover {
            background: #e07a5d;
            color: #0a0a0a;
            box-shadow: 0 0 10px rgba(224, 122, 93, 0.5);
          }
        `}</style>

        <div className="min-h-screen bg-background p-2 sm:p-4">
          {/* Header */}
          <div className="max-w-6xl mx-auto mb-4 sm:mb-8">
            <div className="flex items-center justify-between">
              <Link
                to="/"
                className="text-sm font-mono hover:text-primary-color transition-colors flex items-center gap-2"
              >
                ← back to sprig
              </Link>
              {/* Sprig logo + title */}
              <div className="flex items-center gap-3">
                <img
                  src="/alfie.webp"
                  alt="Sprig logo"
                  className="w-10 h-10 sm:w-12 sm:h-12 rounded-full border-2 border-primary-color shadow-lg shadow-primary-color/20"
                />
                <div className="flex flex-col">
                  <h1 className="text-base sm:text-2xl font-bold font-mono text-primary-color">
                    BURN RESULTS
                  </h1>
                  <span className="text-xs text-green-400 font-mono">
                    Success ✓
                  </span>
                </div>
              </div>
              <div className="w-24"></div> {/* Spacer for balance */}
            </div>
          </div>

          {/* Results Container */}
          <div className="max-w-5xl mx-auto">
            <div className="terminal-container rounded-lg overflow-hidden shadow-2xl">
              {/* Terminal Header */}
              <div className="terminal-header px-4 py-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Terminal className="w-4 h-4" />
                  <span className="font-mono text-sm font-bold">
                    sprig@burn-results
                  </span>
                </div>
                <div className="flex gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500 hover:opacity-80 cursor-pointer"></div>
                  <div className="w-3 h-3 rounded-full bg-yellow-500 hover:opacity-80 cursor-pointer"></div>
                  <div className="w-3 h-3 rounded-full bg-green-500 hover:opacity-80 cursor-pointer"></div>
                </div>
              </div>

              {/* Results Content */}
              <div className="p-6">
                <ResultsPage />
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&display=swap');
        
        .terminal-container {
          font-family: 'JetBrains Mono', monospace;
          background: #0a0a0a;
          border: 1px solid #e07a5d;
          box-shadow: 0 0 20px rgba(224, 122, 93, 0.2);
        }
        
        .terminal-header {
          background: #e07a5d;
          color: #0a0a0a;
        }
        
        .terminal-text {
          color: #e07a5d;
          text-shadow: 0 0 2px rgba(224, 122, 93, 0.5);
        }
        
        .terminal-button {
          background: transparent;
          border: 1px solid #e07a5d;
          color: #e07a5d;
          transition: all 0.2s;
        }
        
        .terminal-button:hover {
          background: #e07a5d;
          color: #0a0a0a;
          box-shadow: 0 0 10px rgba(224, 122, 93, 0.5);
        }
        
        .token-row:hover {
          background: rgba(224, 122, 93, 0.1);
        }
        
        .token-row.selected {
          background: rgba(224, 122, 93, 0.2);
        }
        
        .blink {
          animation: blink 1s infinite;
        }
        
        @keyframes blink {
          0%, 50% { opacity: 1; }
          51%, 100% { opacity: 0; }
        }
      `}</style>

      <div className="min-h-screen bg-background p-2 sm:p-4">
        {/* Header */}
        <div className="max-w-6xl mx-auto mb-4 sm:mb-8">
          <div className="flex items-center justify-between">
            <Link
              to="/"
              className="text-sm font-mono hover:text-primary-color transition-colors flex items-center gap-2"
            >
              ← back to sprig
            </Link>
            {/* Sprig logo + title */}
            <div className="flex items-center gap-3">
              <img
                src="/alfie.webp"
                alt="Sprig logo"
                className="w-10 h-10 sm:w-12 sm:h-12 rounded-full border-2 border-primary-color shadow-lg shadow-primary-color/20"
              />
              <div className="flex flex-col">
                <h1 className="text-base sm:text-2xl font-bold font-mono text-primary-color">
                  BURN TERMINAL
                </h1>
                <span className="text-xs text-gray-500 font-mono hidden sm:block">
                  v1.0
                </span>
              </div>
            </div>
            <div className="w-24"></div> {/* Spacer for balance */}
          </div>
        </div>

        {/* Terminal Container */}
        <div className="max-w-5xl mx-auto mb-12">
          <div className="terminal-container rounded-lg overflow-hidden shadow-2xl">
            {/* Terminal Header */}
            <div className="terminal-header px-4 py-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4" />
                <span className="font-mono text-sm font-bold">sprig@tools</span>
              </div>
              <div className="flex gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500 hover:opacity-80 cursor-pointer"></div>
                <div className="w-3 h-3 rounded-full bg-yellow-500 hover:opacity-80 cursor-pointer"></div>
                <div className="w-3 h-3 rounded-full bg-green-500 hover:opacity-80 cursor-pointer"></div>
              </div>
            </div>

            {/* Tabs */}
            <Tabs
              value={activeTab}
              onValueChange={setActiveTab}
              className="w-full"
            >
              <TabsList className="grid w-full grid-cols-2 bg-gray-800/50 border-b border-primary-color/20">
                <TabsTrigger
                  value="burn"
                  className="terminal-text flex items-center gap-2"
                >
                  <Flame className="w-4 h-4" />
                  TOKEN BURN
                </TabsTrigger>
                <TabsTrigger
                  value="empty"
                  className="terminal-text flex items-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  EMPTY ACCOUNTS
                </TabsTrigger>
              </TabsList>

              {/* Token Burn Tab */}
              <TabsContent value="burn" className="p-6 mt-0">
                {!connected ? (
                  // Connect Wallet Screen
                  <div className="flex flex-col items-center justify-center min-h-[400px]">
                    <Wallet className="w-16 h-16 terminal-text mb-6" />
                    <p className="terminal-text text-lg mb-2 font-mono">
                      {">"} WALLET REQUIRED
                    </p>
                    <p className="text-sm text-gray-500 mb-8 font-mono">
                      Connect to start burning tokens
                    </p>

                    <WalletMultiButton className="!bg-transparent !border !border-primary-color !text-primary-color hover:!bg-primary-color hover:!text-black !font-mono !text-sm !transition-all" />
                  </div>
                ) : (
                  // Token List Screen
                  <>
                    <div className="mb-6 space-y-4">
                      {/* Wallet Info Bar */}
                      <div className="flex items-center justify-between bg-primary-color/10 border border-primary-color/30 rounded p-3">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                          <span className="text-xs font-mono text-gray-400">
                            Connected: {publicKey?.toString().slice(0, 6)}...
                            {publicKey?.toString().slice(-4)}
                          </span>
                          {hasAlfieBalance && (
                            <span className="text-xs font-mono text-green-400 ml-2">
                              | SPRIG HOLDER — FREE BURNS! 🎉
                            </span>
                          )}
                        </div>
                        <WalletMultiButton className="!bg-transparent !border-0 !text-primary-color hover:!text-primary-color/80 !font-mono !text-xs !p-0" />
                      </div>

                      {/* Search Bar */}
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
                        <input
                          type="text"
                          placeholder="Search tokens..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="w-full bg-black border border-primary-color/30 rounded px-10 py-2 font-mono text-sm terminal-text placeholder-gray-500 focus:border-primary-color focus:outline-none"
                        />
                      </div>

                      {/* Price Filter Header */}
                      <div>
                        <p className="terminal-text font-mono text-sm mb-2">
                          Hide tokens worth more than $
                          {priceFilter === Infinity ? "∞" : priceFilter}
                        </p>

                        {/* Price Filter Buttons */}
                        <div className="flex flex-wrap gap-2 mb-3">
                          {PRICE_OPTIONS.map((option) => (
                            <button
                              key={option.value}
                              onClick={() => setPriceFilter(option.value)}
                              className={`terminal-button px-3 py-1 sm:px-4 sm:py-2 rounded text-xs sm:text-sm font-mono transition-all ${
                                priceFilter === option.value
                                  ? "bg-primary-color text-black font-bold"
                                  : "hover:bg-primary-color/20"
                              }`}
                            >
                              {option.label}
                            </button>
                          ))}
                        </div>

                        {/* Safety Warning */}
                        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded p-3 text-yellow-500 font-mono text-xs">
                          ⚠️ This filter cannot be 100% accurate. Always double
                          check the items you're about to burn.
                        </div>
                      </div>
                    </div>

                    {/* Token Table */}
                    {isLoadingTokens ? (
                      <div className="flex items-center justify-center py-12">
                        <div className="text-center">
                          <div className="w-12 h-12 border-3 border-primary-color border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                          <p className="text-gray-400 font-mono text-sm">
                            Loading tokens...
                          </p>
                        </div>
                      </div>
                    ) : filteredTokens.length === 0 ? (
                      <div className="text-center py-12">
                        <p className="text-gray-500 font-mono text-sm mb-2">
                          No tokens found
                        </p>
                        <p className="text-gray-600 font-mono text-xs">
                          {userTokens.length === 0
                            ? "Your wallet doesn't have any tokens"
                            : "No tokens match your search criteria"}
                        </p>
                      </div>
                    ) : (
                      <>
                        <div className="border border-primary-color/30 rounded mb-6 overflow-x-auto">
                          <table className="w-full font-mono text-xs sm:text-sm min-w-[600px]">
                            <thead>
                              <tr className="border-b border-primary-color/30">
                                <th className="text-left p-2 sm:p-3 terminal-text">
                                  <button
                                    onClick={handleSelectAll}
                                    className="hover:underline"
                                  >
                                    [
                                    {selectedTokens.size ===
                                    filteredTokens.length
                                      ? "X"
                                      : " "}
                                    ]
                                  </button>
                                </th>
                                <th className="text-left p-2 sm:p-3 terminal-text">
                                  LOGO
                                </th>
                                <th className="text-left p-2 sm:p-3 terminal-text">
                                  TICKER
                                </th>
                                <th className="text-left p-2 sm:p-3 terminal-text hidden sm:table-cell">
                                  TOKEN NAME
                                </th>
                                <th className="text-left p-2 sm:p-3 terminal-text">
                                  BALANCE
                                </th>
                                <th className="text-left p-2 sm:p-3 terminal-text">
                                  PRICE
                                </th>
                                <th className="text-left p-2 sm:p-3 terminal-text">
                                  VALUE
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {filteredTokens.map((token) => {
                                const isSelected = selectedTokens.has(token.id);
                                const tokenValue =
                                  token.balance * (token.price || 0);

                                return (
                                  <tr
                                    key={token.id}
                                    onClick={() => handleTokenSelect(token.id)}
                                    className={`token-row cursor-pointer border-b border-primary-color/10 ${
                                      isSelected ? "selected" : ""
                                    }`}
                                  >
                                    <td className="p-2 sm:p-3">
                                      <span className="terminal-text">
                                        [{isSelected ? "X" : " "}]
                                      </span>
                                    </td>
                                    <td className="p-2 sm:p-3">
                                      {token.image && (
                                        <img
                                          src={token.image}
                                          alt={token.symbol}
                                          className="w-6 h-6 sm:w-8 sm:h-8 rounded-full"
                                          onError={(e) => {
                                            (
                                              e.target as HTMLImageElement
                                            ).style.display = "none";
                                          }}
                                        />
                                      )}
                                    </td>
                                    <td className="p-2 sm:p-3 terminal-text font-bold">
                                      {token.symbol || "UNKNOWN"}
                                    </td>
                                    <td className="p-2 sm:p-3 text-gray-300 hidden sm:table-cell">
                                      {token.name || "Unknown Token"}
                                    </td>
                                    <td className="p-2 sm:p-3 text-gray-400 text-xs sm:text-sm">
                                      {token.balance.toLocaleString()}
                                    </td>
                                    <td className="p-2 sm:p-3 text-gray-400 text-xs sm:text-sm">
                                      {!token.price
                                        ? "Unknown"
                                        : token.price < 1
                                        ? token.price < 0.01
                                          ? "<$0.01"
                                          : `$${token.price.toFixed(2)}`
                                        : `$${Math.round(token.price)}`}
                                    </td>
                                    <td className="p-2 sm:p-3 text-gray-400 font-medium text-xs sm:text-sm">
                                      {!token.price
                                        ? "Unknown"
                                        : tokenValue < 0.01
                                        ? "<$0.01"
                                        : `$${tokenValue.toLocaleString(
                                            "en-US",
                                            {
                                              minimumFractionDigits: 2,
                                              maximumFractionDigits: 2,
                                            }
                                          )}`}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>

                        {/* Status Bar */}
                        <div className="flex justify-between items-center">
                          <div className="font-mono text-sm">
                            <span className="terminal-text">
                              {selectedCount} SELECTED
                            </span>
                            {selectedCount > 0 && (
                              <span className="text-gray-400 ml-4">
                                TOTAL:{" "}
                                {totalValue < 0.01
                                  ? "<$0.01"
                                  : `$${totalValue.toLocaleString("en-US", {
                                      minimumFractionDigits: 2,
                                      maximumFractionDigits: 2,
                                    })}`}
                              </span>
                            )}
                          </div>

                          {selectedCount > 0 && (
                            <button
                              onClick={handleBurnTokens}
                              disabled={isBurning}
                              className="terminal-button px-6 py-2 rounded font-mono text-sm font-medium flex items-center gap-2"
                            >
                              {isBurning ? (
                                <>
                                  BURNING<span className="blink">_</span>
                                </>
                              ) : (
                                <>
                                  <Flame className="w-4 h-4" />
                                  BURN {selectedCount} TOKENS
                                </>
                              )}
                            </button>
                          )}
                        </div>
                      </>
                    )}
                  </>
                )}
              </TabsContent>

              {/* Empty Accounts Tab */}
              <TabsContent value="empty" className="p-6 mt-0">
                {!connected ? (
                  // Connect Wallet Screen
                  <div className="flex flex-col items-center justify-center min-h-[400px]">
                    <Wallet className="w-16 h-16 terminal-text mb-6" />
                    <p className="terminal-text text-lg mb-2 font-mono">
                      {">"} WALLET REQUIRED
                    </p>
                    <p className="text-sm text-gray-500 mb-8 font-mono">
                      Connect to clean empty accounts
                    </p>

                    <WalletMultiButton className="!bg-transparent !border !border-primary-color !text-primary-color hover:!bg-primary-color hover:!text-black !font-mono !text-sm !transition-all" />
                  </div>
                ) : (
                  // Empty Accounts Screen
                  <>
                    <div className="mb-6 space-y-4">
                      {/* Wallet Info Bar */}
                      <div className="flex items-center justify-between bg-primary-color/10 border border-primary-color/30 rounded p-3">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                          <span className="text-xs font-mono text-gray-400">
                            Connected: {publicKey?.toString().slice(0, 6)}...
                            {publicKey?.toString().slice(-4)}
                          </span>
                          {hasAlfieBalance && (
                            <span className="text-xs font-mono text-green-400 ml-2">
                              | SPRIG HOLDER — FREE OPERATIONS! 🎉
                            </span>
                          )}
                        </div>
                        <WalletMultiButton className="!bg-transparent !border-0 !text-primary-color hover:!text-primary-color/80 !font-mono !text-xs !p-0" />
                      </div>

                      {/* Stats Cards */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-primary-color/5 border border-primary-color/20 rounded p-4">
                          <div className="flex items-center gap-2">
                            <Trash2 className="w-6 h-6 text-primary-color" />
                            <div>
                              <p className="text-xs terminal-text text-gray-400">
                                EMPTY ACCOUNTS
                              </p>
                              <p className="text-xl font-bold terminal-text text-primary-color">
                                {isLoadingEmpty ? "..." : emptyAccounts.length}
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="bg-primary-color/5 border border-primary-color/20 rounded p-4">
                          <div className="flex items-center gap-2">
                            <Coins className="w-6 h-6 text-primary-color" />
                            <div>
                              <p className="text-xs terminal-text text-gray-400">
                                RECOVERABLE SOL
                              </p>
                              <p className="text-xl font-bold terminal-text text-primary-color">
                                {isLoadingEmpty
                                  ? "..."
                                  : formatSOL(
                                      calculateTotalRent(emptyAccounts)
                                    )}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Commission Warning */}
                      {!hasAlfieBalance && emptyAccounts.length > 0 && (
                        <div className="bg-orange-500/10 border border-orange-500/30 rounded p-4">
                          <div className="flex items-start gap-3">
                            <AlertTriangle className="w-5 h-5 text-orange-500 mt-0.5" />
                            <div>
                              <p className="text-sm font-bold text-orange-500 mb-1">
                                Commission Notice
                              </p>
                              <p className="text-xs text-gray-300">
                                {(COMMISSION_RATE * 100).toFixed(1)}% commission
                                applies. Hold {ALFIE_THRESHOLD.toLocaleString()}
                                + $SPRIG for FREE operations.
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Action Section */}
                    {isLoadingEmpty ? (
                      <div className="flex items-center justify-center py-12">
                        <div className="flex items-center gap-3">
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-color"></div>
                          <span className="terminal-text">
                            Scanning for empty accounts...
                          </span>
                        </div>
                      </div>
                    ) : emptyAccounts.length === 0 ? (
                      <div className="text-center py-12">
                        <div className="flex flex-col items-center gap-4">
                          <div className="w-16 h-16 bg-green-500/10 border border-green-500/20 rounded-full flex items-center justify-center">
                            <Check className="w-8 h-8 text-green-500" />
                          </div>
                          <div>
                            <p className="terminal-text text-lg mb-2">
                              WALLET IS CLEAN! 🎉
                            </p>
                            <p className="text-sm text-gray-400">
                              No empty token accounts found
                            </p>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-6">
                        {/* Account List Preview */}
                        {emptyAccounts.length > 0 && (
                          <div className="bg-gray-900/50 border border-gray-700 rounded p-4">
                            <p className="text-xs terminal-text text-gray-400 mb-3">
                              ACCOUNTS TO BE CLOSED:
                            </p>
                            <div className="space-y-1 max-h-40 overflow-y-auto">
                              {emptyAccounts
                                .slice(0, 10)
                                .map((account, index) => (
                                  <div
                                    key={account.id}
                                    className="flex items-center justify-between text-xs font-mono"
                                  >
                                    <span className="text-gray-400">
                                      [{index + 1}]{" "}
                                      {account.symbol || "UNKNOWN"}
                                    </span>
                                    <span className="text-green-400">
                                      +{formatSOL(account.rentSOL)}
                                    </span>
                                  </div>
                                ))}
                              {emptyAccounts.length > 10 && (
                                <div className="text-xs text-gray-500 font-mono">
                                  ... and {emptyAccounts.length - 10} more
                                  accounts
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Action Button */}
                        <div className="flex justify-center">
                          <button
                            onClick={() => setShowCloseDialog(true)}
                            disabled={isClosingAccounts}
                            className="terminal-button px-8 py-4 text-lg font-bold bg-red-500/20 border-red-500 text-red-500 hover:bg-red-500 hover:text-black disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-3"
                          >
                            {isClosingAccounts ? (
                              <>
                                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-current"></div>
                                CLOSING ACCOUNTS...
                              </>
                            ) : (
                              <>
                                <Trash2 className="w-5 h-5" />
                                CLOSE ALL {emptyAccounts.length} ACCOUNTS
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </div>

        {/* Explanation Section */}
        <div className="max-w-3xl mx-auto px-4 mb-12">
          <div className="space-y-8 text-center">
            {/* Title */}
            <div>
              <h2 className="text-2xl font-bold text-primary-color mb-2">
                sprig burn tool 🔥
              </h2>
              <div className="space-y-1 text-gray-400">
                <p>your wallet is messy</p>
                <p>full of dead tokens</p>
                <p>sprig understands</p>
              </div>
            </div>

            <div className="border-t border-primary-color/20"></div>

            {/* How it works */}
            <div className="space-y-4">
              <p className="text-gray-300 font-semibold">here's the thing:</p>
              <div className="space-y-2 text-gray-400">
                <p>when you burn tokens, solana gives you money back</p>
                <p className="text-gray-300">other tools are greedy:</p>
                <p>- some take 2%</p>
                <p>- some take 5%</p>
                <p>- some take 20% (wtf)</p>
              </div>
              <div className="space-y-2">
                <p className="text-primary-color font-bold">
                  sprig only takes 1%
                </p>
                <p className="text-sm text-gray-500">
                  (unless you hold 50k $SPRIG — then it's FREE)
                </p>
              </div>
            </div>

            <div className="border-t border-primary-color/20"></div>

            {/* Process */}
            <div className="space-y-4">
              <p className="text-gray-300 font-semibold">how it works:</p>
              <div className="flex flex-wrap items-center justify-center gap-2 text-sm">
                <span className="text-gray-400">connect wallet</span>
                <span className="text-primary-color">→</span>
                <span className="text-gray-400">pick dead tokens</span>
                <span className="text-primary-color">→</span>
                <span className="text-gray-400">burn them</span>
                <span className="text-primary-color">→</span>
                <span className="text-gray-400">get SOL</span>
              </div>
              <p className="text-gray-500 text-sm">simple as that</p>
            </div>

            <div className="border-t border-primary-color/20"></div>

            {/* Benefits */}
            <div className="space-y-4">
              <div className="grid md:grid-cols-2 gap-6 text-left max-w-2xl mx-auto">
                <div className="bg-primary-color/5 border border-primary-color/20 rounded-lg p-4">
                  <p className="text-primary-color font-bold mb-2">
                    $SPRIG holders get:
                  </p>
                  <ul className="space-y-1 text-sm text-gray-400">
                    <li>- 0% fees (keep ALL your SOL)</li>
                    <li>- sprig loves you</li>
                  </ul>
                </div>
                <div className="bg-black/30 border border-gray-700 rounded-lg p-4">
                  <p className="text-gray-300 font-bold mb-2">everyone else:</p>
                  <ul className="space-y-1 text-sm text-gray-400">
                    <li>- 1% fee (still cheapest anywhere)</li>
                    <li>- sprig still loves you</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="border-t border-primary-color/20"></div>

            {/* Comparison */}
            <div className="space-y-2">
              <p className="text-gray-400">other tools: 2-20% fees 🤮</p>
              <p className="text-primary-color">sprig tool: 1% fee</p>
              <p className="text-green-400 font-bold">
                $SPRIG holders: FREE 🫂
              </p>
              <p className="text-gray-500 text-sm mt-4">
                your wallet will thank you
              </p>
            </div>

            <div className="border-t border-primary-color/20"></div>

            {/* CTA */}
            <div className="space-y-4">
              <p className="text-gray-300">ready to clean?</p>
              {!connected && (
                <div className="flex justify-center">
                  <WalletMultiButton className="!bg-transparent !border !border-primary-color !text-primary-color hover:!bg-primary-color hover:!text-black !font-mono !text-sm !px-8 !py-3 !transition-all" />
                </div>
              )}
              <p className="text-gray-400">sprig's here to help 🫂</p>
            </div>
          </div>
        </div>

        {/* Terminal-style Confirmation Dialog */}
        <AlertDialog
          open={showConfirmDialog}
          onOpenChange={setShowConfirmDialog}
        >
          <AlertDialogContent className="terminal-container max-w-2xl p-0 overflow-hidden">
            {/* Terminal Header */}
            <div className="terminal-header px-4 py-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                <span className="font-mono text-sm font-bold">
                  WARNING: BURN CONFIRMATION
                </span>
              </div>
              <div className="flex gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
              </div>
            </div>

            <AlertDialogHeader className="p-6 pb-0">
              <AlertDialogTitle className="terminal-text font-mono text-lg font-bold mb-4">
                CONFIRM BURN OPERATION
              </AlertDialogTitle>
              <AlertDialogDescription className="font-mono text-sm">
                <div className="space-y-4">
                  <div className="text-gray-400">
                    TOKENS TO BURN: {selectedCount}
                    <br />
                    TOTAL VALUE:{" "}
                    {totalValue < 0.01
                      ? "<$0.01"
                      : `$${totalValue.toLocaleString("en-US", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}`}
                    {!hasAlfieBalance && (
                      <>
                        <br />
                        COMMISSION: {COMMISSION_RATE * 100}% (Hold 50k $SPRIG for
                        FREE burns)
                      </>
                    )}
                    {hasAlfieBalance && (
                      <>
                        <br />
                        <span className="text-green-400">
                          COMMISSION: FREE (Sprig holder benefit!)
                        </span>
                      </>
                    )}
                  </div>

                  {/* Token List */}
                  <div className="border border-primary-color/30 rounded p-3">
                    <div className="terminal-text mb-2">SELECTED TOKENS:</div>
                    <div className="max-h-48 overflow-y-auto">
                      {selectedTokenDetails.map((token) => (
                        <div
                          key={token.id}
                          className="flex items-center gap-3 py-1 font-mono text-xs text-gray-400"
                        >
                          {token.image && (
                            <img
                              src={token.image}
                              alt={token.symbol}
                              className="w-6 h-6 rounded-full"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display =
                                  "none";
                              }}
                            />
                          )}
                          <span className="terminal-text">
                            [{token.symbol || "UNKNOWN"}]
                          </span>
                          <span>{token.balance.toLocaleString()}</span>
                          <span className="ml-auto">
                            {!token.price
                              ? "Unknown"
                              : token.balance * token.price < 0.01
                              ? "<$0.01"
                              : `$${(token.balance * token.price).toFixed(2)}`}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="border border-red-500/50 bg-red-500/10 rounded p-3 text-red-500 font-mono text-sm">
                    ⚠️ WARNING: CANNOT BE UNDONE!
                    <br />
                    These tokens will be PERMANENTLY DELETED from your wallet.
                  </div>
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>

            <div className="p-6 pt-2 space-y-4">
              <AlertDialogFooter className="flex gap-2">
                <AlertDialogCancel className="terminal-button px-6 py-2 rounded font-mono text-sm">
                  CANCEL [ESC]
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={confirmBurn}
                  className="terminal-button px-6 py-2 rounded font-mono text-sm bg-red-500/20 border-red-500 text-red-500 hover:bg-red-500 hover:text-black"
                >
                  BURN {selectedCount} TOKENS [ENTER]
                </AlertDialogAction>
              </AlertDialogFooter>
            </div>
          </AlertDialogContent>
        </AlertDialog>

        {/* Empty Accounts Confirmation Dialog */}
        <AlertDialog open={showCloseDialog} onOpenChange={setShowCloseDialog}>
          <AlertDialogContent className="terminal-container max-w-2xl p-0 overflow-hidden">
            <AlertDialogHeader className="px-6 py-4">
              <AlertDialogTitle className="flex items-center gap-2 terminal-text">
                <Trash2 className="w-5 h-5" />
                <span className="font-mono text-sm font-bold">
                  CLOSE EMPTY ACCOUNTS
                </span>
              </AlertDialogTitle>
              <AlertDialogDescription className="text-gray-300 font-mono text-sm">
                <div className="space-y-4">
                  <div>
                    You're about to close{" "}
                    <strong className="text-primary-color">
                      {emptyAccounts.length}
                    </strong>{" "}
                    empty token accounts.
                  </div>

                  <div className="bg-primary-color/5 border border-[#e07a5d] rounded p-3 space-y-2">
                    <div className="flex justify-between">
                      <span>SOL to Recover:</span>
                      <span className="text-green-400 font-semibold">
                        {formatSOL(calculateTotalRent(emptyAccounts))}
                      </span>
                    </div>
                    {!hasAlfieBalance && (
                      <div className="flex justify-between">
                        <span>
                          Commission ({(COMMISSION_RATE * 100).toFixed(1)}%):
                        </span>
                        <span className="text-orange-400">
                          -
                          {formatSOL(
                            calculateTotalRent(emptyAccounts) * COMMISSION_RATE
                          )}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between font-semibold border-t border-gray-600 pt-2">
                      <span>Net You'll Receive:</span>
                      <span className="text-white">
                        {formatSOL(
                          calculateTotalRent(emptyAccounts) -
                            (hasAlfieBalance
                              ? 0
                              : calculateTotalRent(emptyAccounts) *
                                COMMISSION_RATE)
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>

            <div className="p-6 pt-2 space-y-4">
              <AlertDialogFooter className="flex gap-2">
                <AlertDialogCancel className="terminal-button px-6 py-2 rounded font-mono text-sm">
                  CANCEL [ESC]
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleCloseAllAccounts}
                  className="terminal-button px-6 py-2 rounded font-mono text-sm bg-red-500/20 border-red-500 text-red-500 hover:bg-red-500 hover:text-black"
                >
                  CLOSE {emptyAccounts.length} ACCOUNTS [ENTER]
                </AlertDialogAction>
              </AlertDialogFooter>
            </div>
          </AlertDialogContent>
        </AlertDialog>

        {/* Empty Accounts Results Dialog */}
        <AlertDialog open={showCloseResults} onOpenChange={setShowCloseResults}>
          <AlertDialogContent className="terminal-container max-w-2xl p-0 overflow-hidden">
            <AlertDialogHeader className="px-6 py-4">
              <AlertDialogTitle className="flex items-center gap-2 terminal-text">
                <Check className="w-5 h-5 text-green-400" />
                <span className="font-mono text-sm font-bold">
                  ACCOUNTS CLOSED SUCCESSFULLY
                </span>
              </AlertDialogTitle>
              <AlertDialogDescription className="text-gray-300 font-mono text-sm">
                {closeResults && (
                  <div className="space-y-4">
                    <div>
                      Successfully closed{" "}
                      <strong className="text-green-400">
                        {closeResults.accountsCount}
                      </strong>{" "}
                      empty token accounts.
                    </div>

                    <div className="border border-[#e07a5d] rounded p-3 space-y-4">
                      <div className="flex justify-between">
                        <span>SOL Recovered:</span>
                        <span className="text-green-400 font-semibold">
                          {formatSOL(closeResults.solRecovered)}
                        </span>
                      </div>
                      {closeResults.commission > 0 && (
                        <div className="flex justify-between">
                          <span>Commission Paid:</span>
                          <span className="text-orange-400">
                            {formatSOL(closeResults.commission)}
                          </span>
                        </div>
                      )}
                      <div className="flex justify-between font-semibold border-t border-gray-600 pt-2">
                        <span>Your Net Gain:</span>
                        <span className="text-white">
                          {formatSOL(
                            closeResults.solRecovered - closeResults.commission
                          )}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-1 text-xs">
                      <div>
                        <a
                          href={`https://solscan.io/tx/${closeResults.transactionId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <strong>Transaction ID:</strong>{" "}
                          <span className="font-mono text-xs">
                            {closeResults.transactionId}
                          </span>
                        </a>
                      </div>
                      <div>
                        <strong>Date:</strong> {closeResults.timestamp}
                      </div>
                    </div>

                    <div className="border border-green-500/50 bg-green-500/10 rounded p-3 text-green-500 font-mono text-sm">
                      ✅ SUCCESS!
                      <br />
                      Your wallet is now cleaner and you recovered SOL.
                    </div>
                  </div>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>

            <div className="p-6 pt-2 space-y-4">
              <AlertDialogFooter className="flex gap-2">
                <AlertDialogAction
                  onClick={() => setShowCloseResults(false)}
                  className="terminal-button px-6 py-2 rounded font-mono text-sm bg-green-500/20 border-green-500 text-green-500 hover:bg-green-500 hover:text-black"
                >
                  AWESOME! [ENTER]
                </AlertDialogAction>
              </AlertDialogFooter>
            </div>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </>
  );
};

export default TokenBurnTool;
