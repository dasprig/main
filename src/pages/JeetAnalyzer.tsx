import {
  ArrowUp,
  Copy,
  Share2,
  ChevronDown,
  ChevronUp,
  Download,
  Twitter,
  AlertCircle,
} from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Link } from "react-router-dom";
import { PublicKey } from "@solana/web3.js";
import { Badge } from "@/components/ui/badge";
import html2canvas from "html2canvas";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { SITE_NAME_LOWER } from "@/config/siteBrand";
import {
  analyzeWallet, 
  formatCurrency, 
  formatPrice,
  formatTokenAmount,
  type WalletAnalysisResult,
  type TokenTradeHistory 
} from "@/utils/walletAnalyzer";

// Using TokenTradeHistory from walletAnalyzer instead of local Token interface

const JeetAnalyzer = () => {
  const { toast } = useToast();
  const [walletAddress, setWalletAddress] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [pageVisible, setPageVisible] = useState(false);
  const [expandedToken, setExpandedToken] = useState<string>("0");
  const [analysisResult, setAnalysisResult] = useState<WalletAnalysisResult | null>(null);
  const [showAllTokens, setShowAllTokens] = useState(false);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [analysisProgress, setAnalysisProgress] = useState("");
  const shareCardRef = useRef<HTMLDivElement>(null);

  // Animation on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      setPageVisible(true);
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  // Back to top button visibility
  useEffect(() => {
    const handleScroll = () => {
      setShowBackToTop(window.scrollY > 400);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const copyAddress = (address: string) => {
    navigator.clipboard.writeText(address);
    toast({
      title: "Copied!",
      description: "Address copied to clipboard",
    });
  };

  // Token image component with fallbacks
  const TokenImage = ({ token, size = 40 }: { token: TokenTradeHistory; size?: number }) => {
    const [imageError, setImageError] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    
    const getTokenEmoji = (symbol: string): string => {
      const emojiMap: Record<string, string> = {
        'DOGE': '🐕', 'PEPE': '🐸', 'BONK': '🦴', 'SHIB': '🐕‍🦺', 'FLOKI': '⚔️',
        'WIF': '🐶', 'POPCAT': '🐱', 'MEW': '😸', 'BOME': '📖', 'PONKE': '🐵',
        'SOL': '☀️', 'USDC': '💵', 'USDT': '💰', 'ALFIE': '🎯', 'SPRIG': '🎯',
      };
      return emojiMap[symbol?.toUpperCase()] || '🪙';
    };

    const handleImageLoad = () => {
      setIsLoading(false);
      setImageError(false);
    };

    const handleImageError = () => {
      setIsLoading(false);
      setImageError(true);
    };

    // Local /public artwork paths (Sprig branding)
    const getImageSrc = (imagePath: string | null) => {
      if (!imagePath) return null;
      if (imagePath.startsWith('/')) {
        // Local image path
        return imagePath;
      }
      return imagePath;
    };

    const imageSrc = getImageSrc(token.image);
    
    if (!imageSrc || imageError) {
      // Fallback to emoji
      return (
        <div 
          className="flex items-center justify-center rounded-full bg-primary/10 text-xl"
          style={{ width: size, height: size }}
        >
          {getTokenEmoji(token.symbol || '')}
        </div>
      );
    }

    return (
      <div className="relative" style={{ width: size, height: size }}>
        {isLoading && (
          <div 
            className="absolute inset-0 flex items-center justify-center rounded-full bg-muted animate-pulse"
            style={{ width: size, height: size }}
          />
        )}
        <img
          src={imageSrc}
          alt={token.name}
          className={`rounded-full object-cover transition-opacity ${isLoading ? 'opacity-0' : 'opacity-100'}`}
          style={{ width: size, height: size }}
          onLoad={handleImageLoad}
          onError={handleImageError}
        />
      </div>
    );
  };

  const performAnalysis = async () => {
    if (!walletAddress.trim()) {
      toast({
        title: "Missing Wallet",
        description: "Please enter a Solana wallet address",
        variant: "destructive",
      });
      return;
    }

    try {
      new PublicKey(walletAddress);
    } catch {
      toast({
        title: "Invalid Address",
        description: "Please enter a valid Solana address",
        variant: "destructive",
      });
      return;
    }

    setIsAnalyzing(true);
    setAnalysisError(null);
    setAnalysisResult(null);
    setAnalysisProgress("Fetching wallet transactions...");

    try {
      toast({
        title: "Analysis Started",
        description: "Analyzing wallet transactions... This may take a few minutes.",
      });

      // Simulate progress updates
      const progressUpdates = [
        "Fetching wallet transactions...",
        "Parsing token transactions...", 
        "Fetching token metadata...",
        "Calculating price data...",
        "Computing profits & losses...",
        "Finalizing analysis..."
      ];

      let progressIndex = 0;
      const progressInterval = setInterval(() => {
        if (progressIndex < progressUpdates.length - 1) {
          progressIndex++;
          setAnalysisProgress(progressUpdates[progressIndex]);
        }
      }, 8000); // Update every 8 seconds

      const result = await analyzeWallet(walletAddress);
      clearInterval(progressInterval);
      
      if (result.tokens.length === 0) {
        setAnalysisError("No completed token trades found in this wallet.");
        toast({
          title: "No Trades Found",
          description: "This wallet doesn't appear to have any completed token trades.",
          variant: "destructive",
        });
      } else {
        setAnalysisResult(result);
        setShowResults(true);
        setExpandedToken("0");
        
        toast({
          title: "Analysis Complete! 🧻",
          description: `Found ${result.tokens.length} completed trades with ${formatCurrency(result.totalFumbled)} total fumbled`,
        });
      }
    } catch (error) {
      console.error('Analysis error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setAnalysisError(errorMessage);
      
      toast({
        title: "Analysis Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
      setAnalysisProgress("");
    }
  };

  const shareOnTwitter = () => {
    const topToken = analysisResult?.tokens[0];
    if (!topToken) return;

    const text = `🧻 PAPERHANDED ${topToken.symbol}\n\nFumbled: ${formatCurrency(
      topToken.fumbledAmount
    )} (+${
      topToken.fumbledPercentage.toFixed(0)
    }%)\n\nCheck your jeet level at ${typeof window !== "undefined" ? window.location.host : "sprig"}/jeet`;
    window.open(
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`,
      "_blank"
    );
    setShareDialogOpen(false);
  };

  const downloadImage = async () => {
    if (!shareCardRef.current) return;

    try {
      const canvas = await html2canvas(shareCardRef.current, {
        backgroundColor: null,
        scale: 2,
        width: 1024,
        height: 512,
        logging: false,
        useCORS: true,
      });

      const link = document.createElement("a");
      link.download = `jeet-card-${walletAddress.slice(0, 8)}.png`;
      link.href = canvas.toDataURL();
      link.click();

      toast({
        title: "Downloaded!",
        description: "Your jeet card has been saved",
      });
      setShareDialogOpen(false);
    } catch (error) {
      toast({
        title: "Download Failed",
        description: "Unable to generate image",
        variant: "destructive",
      });
    }
  };

  const tokens = analysisResult?.tokens || [];
  const displayedTokens = showAllTokens ? tokens : tokens.slice(0, 3);
  const totalFumbled = analysisResult?.totalFumbled || 0;

  return (
    <div className="min-h-screen bg-background relative">
      {/* Gradient background effects */}
      <div className="fixed inset-0 pointer-events-none opacity-30">
        <div className="absolute top-1/4 -left-1/4 w-[600px] h-[600px] bg-primary-color/20 rounded-full blur-[150px]" />
        <div className="absolute bottom-1/4 -right-1/4 w-[800px] h-[800px] bg-accent-color/10 rounded-full blur-[150px]" />
      </div>

      {/* Content */}
      <div className="relative z-10">
        {/* Header - SAME AS HERO SECTION */}
        <header
          className={`py-6 text-center transition-all duration-1000 delay-100 ${
            pageVisible
              ? "opacity-100 translate-y-0"
              : "opacity-0 -translate-y-4"
          }`}
        >
          <Link to="/" className="inline-block">
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold">
              {SITE_NAME_LOWER}
            </h1>
          </Link>
        </header>

        {/* Main Content */}
        <main className="container mx-auto px-4 pb-20 max-w-5xl">
          <div
            className={`transition-all duration-1000 delay-300 ${
              pageVisible
                ? "opacity-100 translate-y-0"
                : "opacity-0 translate-y-8"
            }`}
          >
            {!showResults ? (
              <div className="max-w-3xl mx-auto">
                {/* Hero Section */}
                <section className="text-center py-8 sm:py-12 space-y-6 sm:space-y-8">
                  {/* Main Title - SAME AS HEY ANON */}
                  <h2 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-bold">
                    jeet analyzer
                  </h2>

                  {/* Subtitle - SAME AS OTHER PAGES */}
                  <p className="text-lg text-muted-foreground">
                    see what you fumbled
                  </p>
                </section>

                {/* Input Section */}
                <section className="max-w-xl mx-auto">
                  <div className="bg-card/50 backdrop-blur-sm rounded-2xl sm:rounded-3xl p-6 sm:p-8 border border-border/50">
                    <div className="space-y-4 sm:space-y-6">
                      <Input
                        type="text"
                        placeholder="Enter Solana wallet address"
                        value={walletAddress}
                        onChange={(e) => setWalletAddress(e.target.value)}
                        className="h-12 sm:h-14 text-base sm:text-lg text-center font-mono rounded-full"
                        onKeyPress={(e) => e.key === "Enter" && performAnalysis()}
                      />

                      {/* Buttons */}
                      <div className="space-y-3">
                      <Button
                          onClick={performAnalysis}
                        disabled={isAnalyzing}
                        className="w-full bg-primary text-primary-foreground px-6 sm:px-8 py-3 sm:py-4 rounded-full font-medium text-base sm:text-lg transition-all duration-200 hover:scale-105"
                      >
                        {isAnalyzing ? (
                          <>
                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                            analyzing...
                          </>
                        ) : (
                          "analyze"
                        )}
                        </Button>
                        
                        {/* Progress Indicator */}
                        {isAnalyzing && analysisProgress && (
                          <div className="text-center mt-4 p-3 bg-card/30 rounded-lg border border-border/30">
                            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                              <div className="w-3 h-3 border border-primary border-t-transparent rounded-full animate-spin" />
                              {analysisProgress}
                            </div>
                            <div className="mt-2 text-xs text-muted-foreground/60">
                              This usually takes 1-3 minutes depending on wallet activity
                            </div>
                          </div>
                        )}
                        
                        {/* Demo Button */}
                        <Button
                          onClick={() => setWalletAddress("4QDbozsDDZwND7TangsHk7KekFTDH9kh4mEwVuZjKnJy")}
                          variant="outline"
                          className="w-full px-4 py-2 rounded-full text-sm"
                        >
                          Try Demo Wallet
                        </Button>
                      </div>
                    </div>
                  </div>
                </section>
              </div>
            ) : analysisError ? (
              // Error State
              <div className="max-w-3xl mx-auto text-center py-12">
                <div className="mb-6">
                  <AlertCircle className="w-16 h-16 text-destructive mx-auto mb-4" />
                  <h2 className="text-2xl font-bold text-destructive mb-2">
                    Analysis Failed
                  </h2>
                  <p className="text-muted-foreground mb-6">
                    {analysisError}
                  </p>
                  <Button
                    onClick={() => {
                      setAnalysisError(null);
                      setShowResults(false);
                      setAnalysisResult(null);
                    }}
                    variant="outline"
                    className="px-6 py-3 rounded-full"
                  >
                    Try Again
                  </Button>
                </div>
              </div>
            ) : (
              <div className="animate-fade-in-up">
                {/* Share Card (Hidden, for screenshot) */}
                <div
                  ref={shareCardRef}
                  className="fixed -left-[9999px]"
                  style={{
                    width: "1024px",
                    height: "512px",
                    backgroundColor: "#0a0a0a",
                  }}
                >
                  <div
                    style={{
                      width: "1024px",
                      height: "512px",
                      padding: "40px",
                      display: "flex",
                      background:
                        "linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 100%)",
                      fontFamily: "Inter, system-ui, -apple-system, sans-serif",
                      position: "relative",
                    }}
                  >
                    {/* Left Content */}
                    <div
                      style={{
                        flex: 1,
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "space-between",
                      }}
                    >
                      {/* Header */}
                      <div>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "12px",
                            marginBottom: "24px",
                          }}
                        >
                          <span style={{ fontSize: "40px" }}>🧻</span>
                          <h2
                            style={{
                              fontSize: "36px",
                              fontWeight: "900",
                              color: "#ff4444",
                              margin: 0,
                            }}
                          >
                            PAPERHANDED
                          </h2>
                        </div>

                        {/* Token Info */}
                        <div style={{ marginBottom: "32px" }}>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "16px",
                              marginBottom: "12px",
                            }}
                          >
                            <div>
                              <TokenImage token={tokens[0]} size={48} />
                            </div>
                            <div>
                              <h3
                                style={{
                                  fontSize: "32px",
                                  fontWeight: "800",
                                  color: "#ffffff",
                                  margin: 0,
                                }}
                              >
                                {tokens[0]?.name}
                              </h3>
                              <p
                                style={{
                                  fontSize: "18px",
                                  color: "#888888",
                                  margin: 0,
                                }}
                              >
                                {tokens[0]?.symbol}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Fumbled Amount */}
                        <div style={{ marginBottom: "32px" }}>
                          <p
                            style={{
                              fontSize: "56px",
                              fontWeight: "900",
                              color: "#ff4444",
                              lineHeight: "1",
                              marginBottom: "8px",
                            }}
                          >
                            {formatCurrency(tokens[0]?.fumbledAmount || 0)}
                          </p>
                          <p style={{ fontSize: "20px", color: "#ff6666" }}>
                            fumbled (+
                            {tokens[0]?.fumbledPercentage.toLocaleString()}%)
                          </p>
                        </div>

                        {/* Price Details */}
                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns: "repeat(3, 1fr)",
                            gap: "16px",
                            marginBottom: "24px",
                          }}
                        >
                          <div
                            style={{
                              background: "rgba(255,255,255,0.05)",
                              borderRadius: "12px",
                              padding: "16px",
                            }}
                          >
                            <p
                              style={{
                                color: "#888888",
                                fontSize: "14px",
                                marginBottom: "4px",
                              }}
                            >
                              Bought at
                            </p>
                            <p
                              style={{
                                color: "#ffffff",
                                fontSize: "18px",
                                fontWeight: "700",
                              }}
                            >
                              ${formatPrice(tokens[0]?.buyPrice || 0)}
                            </p>
                          </div>
                          <div
                            style={{
                              background: "rgba(255,255,255,0.05)",
                              borderRadius: "12px",
                              padding: "16px",
                            }}
                          >
                            <p
                              style={{
                                color: "#888888",
                                fontSize: "14px",
                                marginBottom: "4px",
                              }}
                            >
                              Sold at
                            </p>
                            <p
                              style={{
                                color: "#ffffff",
                                fontSize: "18px",
                                fontWeight: "700",
                              }}
                            >
                              ${formatPrice(tokens[0]?.sellPrice || 0)}
                            </p>
                          </div>
                          <div
                            style={{
                              background: "rgba(255,209,103,0.1)",
                              borderRadius: "12px",
                              padding: "16px",
                            }}
                          >
                            <p
                              style={{
                                color: "#ffd167",
                                fontSize: "14px",
                                marginBottom: "4px",
                              }}
                            >
                              Worth now
                            </p>
                            <p
                              style={{
                                color: "#ffd167",
                                fontSize: "18px",
                                fontWeight: "700",
                              }}
                            >
                              ${formatPrice(tokens[0]?.currentPrice || 0)}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Footer */}
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          fontSize: "14px",
                        }}
                      >
                        <span style={{ color: "#888888", fontWeight: "600" }}>
                          {typeof window !== "undefined"
                            ? `${window.location.host}/jeet`
                            : "sprig.so/jeet"}
                        </span>
                        <span
                          style={{ color: "#666666", fontFamily: "monospace" }}
                        >
                          {walletAddress.slice(0, 8)}...
                          {walletAddress.slice(-6)}
                        </span>
                      </div>
                    </div>

                    {/* Right Image */}
                    <div
                      style={{
                        width: "360px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <img
                        src="/stickers/alfie_shok.webp"
                        alt="Sprig shocked"
                        style={{
                          width: "280px",
                          height: "280px",
                          objectFit: "contain",
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* Wallet Address - Centered */}
                <section className="text-center mb-8">
                  <div className="inline-flex items-center gap-2 bg-card/30 backdrop-blur-sm rounded-full px-4 py-2 border border-border/30">
                    <span className="text-sm text-muted-foreground">
                      Wallet:
                    </span>
                    <span className="font-mono text-sm">
                      {walletAddress.slice(0, 8)}...{walletAddress.slice(-6)}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyAddress(walletAddress)}
                      className="h-5 w-5 sm:h-6 sm:w-6 p-0"
                    >
                      <Copy className="w-3 h-3" />
                    </Button>
                  </div>
                </section>

                {/* Total Fumbled Header - SAME AS SECTION TITLES */}
                <section className="text-center mb-8 sm:mb-12">
                  <Badge className="mb-3 bg-destructive/20 text-destructive border-destructive/50">
                    <span className="text-lg mr-1">🧻</span> Total Fumbled
                  </Badge>
                  {/* BIG TITLE STYLE */}
                  <p className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-bold text-destructive">
                    {formatCurrency(totalFumbled)}
                  </p>
                </section>

                {/* Tokens List */}
                <section className="mb-8 sm:mb-12">
                  <div className="space-y-3 sm:space-y-4">
                    {displayedTokens.map((token, index) => (
                      <Collapsible
                        key={token.mintAddress}
                        open={expandedToken === index.toString()}
                        onOpenChange={() =>
                          setExpandedToken(
                            expandedToken === index.toString() ? "" : index.toString()
                          )
                        }
                      >
                        <CollapsibleTrigger asChild>
                          <div className="bg-card/40 backdrop-blur-sm rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-border/40 hover:bg-card/60 transition-all cursor-pointer group">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2 sm:gap-4">
                                <span className="text-2xl sm:text-3xl font-bold text-muted-foreground">
                                  {index + 1}
                                </span>
                                <div>
                                  <TokenImage token={token} size={48} />
                                </div>
                                <div>
                                  <h3 className="text-base sm:text-xl font-semibold">
                                    {token.name}
                                  </h3>
                                  <p className="text-sm sm:text-base text-muted-foreground">
                                    {token.symbol}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 sm:gap-4">
                                <div className="text-right">
                                  <p className="text-lg sm:text-2xl font-bold text-destructive">
                                    -{formatCurrency(token.fumbledAmount)}
                                  </p>
                                  <p className="text-xs sm:text-sm text-muted-foreground">
                                    fumbled
                                  </p>
                                </div>
                                <div className="group-hover:bg-primary-color/10 rounded-full p-1.5 transition-colors">
                                  {expandedToken === index.toString() ? (
                                    <ChevronUp className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground" />
                                  ) : (
                                    <ChevronDown className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground" />
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        </CollapsibleTrigger>

                        <CollapsibleContent>
                          <div className="mt-3 sm:mt-4 bg-card/30 backdrop-blur-sm rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-border/30">
                            {/* Token Amount Info */}
                            <div className="mb-4 p-3 bg-primary-color/10 rounded-lg text-center">
                              <p className="text-xs sm:text-sm text-muted-foreground mb-1">
                                Current Holdings
                              </p>
                              <p className="text-lg sm:text-xl font-bold text-primary-color">
                                {token.tokenAmountFormatted || formatTokenAmount(token.tokenAmount || 0, token.decimals, token.symbol)}
                              </p>
                              <p className="text-xs text-muted-foreground mt-1">
                                Total invested: {formatCurrency(token.buyValue || 0)}
                              </p>
                              {token.totalBoughtAmount && token.totalSoldAmount !== undefined && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  Bought {formatTokenAmount(token.totalBoughtAmount, token.decimals, token.symbol)} • 
                                  Sold {formatTokenAmount(token.totalSoldAmount, token.decimals, token.symbol)}
                                </p>
                              )}
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                              <div className="text-center p-3 bg-background/50 rounded-lg">
                                <p className="text-xs sm:text-sm text-muted-foreground mb-1">
                                  Avg. Buy Price
                                </p>
                                <p className="text-lg sm:text-xl font-bold">
                                  ${formatPrice(token.weightedBuyPrice || token.buyPrice)}
                                </p>
                              </div>
                              <div className="text-center p-3 bg-background/50 rounded-lg">
                                <p className="text-xs sm:text-sm text-muted-foreground mb-1">
                                  {token.sellTime ? 'Sold at' : 'Current price'}
                                </p>
                                <p className="text-lg sm:text-xl font-bold">
                                  ${formatPrice(token.sellPrice)}
                                </p>
                              </div>
                              <div className="text-center p-3 bg-accent-color/10 rounded-lg">
                                <p className="text-xs sm:text-sm text-accent-color mb-1">
                                  ATH Price
                                </p>
                                <p className="text-lg sm:text-xl font-bold text-accent-color">
                                  ${formatPrice(token.ath || token.currentPrice || 0)}
                                </p>
                              </div>
                            </div>

                              <div className="text-center p-4 bg-destructive/10 rounded-lg">
                                <p className="text-sm text-muted-foreground mb-1">
                                You missed out on
                                </p>
                              <p className="text-2xl sm:text-3xl font-bold text-destructive">
                                {formatCurrency(token.fumbledAmount)}
                                </p>
                                <p className="text-sm text-destructive mt-1">
                                +{token.fumbledPercentage.toFixed(0)}% potential gains
                                </p>
                            </div>

                            <p className="text-center text-sm text-muted-foreground mt-4">
                              Held for {token.holdTime}
                            </p>
                          </div>
                        </CollapsibleContent>
                      </Collapsible>
                    ))}
                  </div>

                  {/* Show More Button */}
                  {tokens.length > 3 && (
                    <div className="text-center mt-6">
                      <Button
                        variant="outline"
                        onClick={() => setShowAllTokens(!showAllTokens)}
                        className="rounded-full px-6 py-2"
                      >
                        {showAllTokens ? (
                          <>Show Less</>
                        ) : (
                          <>Show {tokens.length - 3} More</>
                        )}
                      </Button>
                    </div>
                  )}
                </section>

                {/* Actions - WITH SHARE DIALOG */}
                <section className="flex flex-wrap justify-center gap-3 sm:gap-4">
                  <Dialog
                    open={shareDialogOpen}
                    onOpenChange={setShareDialogOpen}
                  >
                    <DialogTrigger asChild>
                      <Button className="bg-primary text-primary-foreground px-6 sm:px-8 py-3 sm:py-4 rounded-full font-medium text-base sm:text-lg transition-all duration-200 hover:scale-105">
                        <Share2 className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                        share
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-2xl">
                      <DialogHeader>
                        <DialogTitle>Share Your Jeet Card</DialogTitle>
                        <DialogDescription>
                          Download your jeet card or share it on X
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        {/* Preview Card */}
                        <div className="overflow-hidden rounded-lg border bg-card/50">
                          <div
                            style={{
                              width: "100%",
                              aspectRatio: "2/1",
                              padding: "24px",
                              display: "flex",
                              background:
                                "linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 100%)",
                              fontFamily:
                                "Inter, system-ui, -apple-system, sans-serif",
                              position: "relative",
                            }}
                          >
                            {/* Left Content */}
                            <div
                              style={{
                                flex: 1,
                                display: "flex",
                                flexDirection: "column",
                                justifyContent: "space-between",
                              }}
                            >
                              {/* Header */}
                              <div>
                                <div
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "8px",
                                    marginBottom: "16px",
                                  }}
                                >
                                  <span style={{ fontSize: "24px" }}>🧻</span>
                                  <h2
                                    style={{
                                      fontSize: "20px",
                                      fontWeight: "900",
                                      color: "#ff4444",
                                      margin: 0,
                                    }}
                                  >
                                    PAPERHANDED
                                  </h2>
                                </div>

                                {/* Token Info */}
                                <div style={{ marginBottom: "16px" }}>
                                  <div
                                    style={{
                                      display: "flex",
                                      alignItems: "center",
                                      gap: "8px",
                                      marginBottom: "8px",
                                    }}
                                  >
                                    <div>
                                      <TokenImage token={tokens[0]} size={32} />
                                    </div>
                                    <div>
                                      <h3
                                        style={{
                                          fontSize: "18px",
                                          fontWeight: "800",
                                          color: "#ffffff",
                                          margin: 0,
                                        }}
                                      >
                                        {tokens[0]?.name}
                                      </h3>
                                      <p
                                        style={{
                                          fontSize: "12px",
                                          color: "#888888",
                                          margin: 0,
                                        }}
                                      >
                                        {tokens[0]?.symbol}
                                      </p>
                                    </div>
                                  </div>
                                </div>

                                {/* Fumbled Amount */}
                                <div style={{ marginBottom: "16px" }}>
                                  <p
                                    style={{
                                      fontSize: "32px",
                                      fontWeight: "900",
                                      color: "#ff4444",
                                      lineHeight: "1",
                                      marginBottom: "4px",
                                    }}
                                  >
                                    {formatCurrency(
                                      tokens[0]?.fumbledAmount || 0
                                    )}
                                  </p>
                                  <p
                                    style={{
                                      fontSize: "12px",
                                      color: "#ff6666",
                                    }}
                                  >
                                    fumbled (+
                                    {tokens[0]?.fumbledPercentage.toLocaleString()}
                                    %)
                                  </p>
                                </div>

                                {/* Price Details */}
                                <div
                                  style={{
                                    display: "grid",
                                    gridTemplateColumns: "repeat(3, 1fr)",
                                    gap: "8px",
                                    marginBottom: "12px",
                                  }}
                                >
                                  <div
                                    style={{
                                      background: "rgba(255,255,255,0.05)",
                                      borderRadius: "8px",
                                      padding: "8px",
                                    }}
                                  >
                                    <p
                                      style={{
                                        color: "#888888",
                                        fontSize: "10px",
                                        marginBottom: "2px",
                                      }}
                                    >
                                      Bought at
                                    </p>
                                    <p
                                      style={{
                                        color: "#ffffff",
                                        fontSize: "12px",
                                        fontWeight: "700",
                                      }}
                                    >
                                      ${formatPrice(tokens[0]?.buyPrice || 0)}
                                    </p>
                                  </div>
                                  <div
                                    style={{
                                      background: "rgba(255,255,255,0.05)",
                                      borderRadius: "8px",
                                      padding: "8px",
                                    }}
                                  >
                                    <p
                                      style={{
                                        color: "#888888",
                                        fontSize: "10px",
                                        marginBottom: "2px",
                                      }}
                                    >
                                      Sold at
                                    </p>
                                    <p
                                      style={{
                                        color: "#ffffff",
                                        fontSize: "12px",
                                        fontWeight: "700",
                                      }}
                                    >
                                      ${formatPrice(tokens[0]?.sellPrice || 0)}
                                    </p>
                                  </div>
                                  <div
                                    style={{
                                      background: "rgba(255,209,103,0.1)",
                                      borderRadius: "8px",
                                      padding: "8px",
                                    }}
                                  >
                                    <p
                                      style={{
                                        color: "#ffd167",
                                        fontSize: "10px",
                                        marginBottom: "2px",
                                      }}
                                    >
                                      Worth now
                                    </p>
                                    <p
                                      style={{
                                        color: "#ffd167",
                                        fontSize: "12px",
                                        fontWeight: "700",
                                      }}
                                    >
                                      $
                                      {formatPrice(
                                        tokens[0]?.currentPrice || 0
                                      )}
                                    </p>
                                  </div>
                                </div>
                              </div>

                              {/* Footer */}
                              <div
                                style={{
                                  display: "flex",
                                  justifyContent: "space-between",
                                  alignItems: "center",
                                  fontSize: "10px",
                                }}
                              >
                                <span
                                  style={{
                                    color: "#888888",
                                    fontWeight: "600",
                                  }}
                                >
                                  {typeof window !== "undefined"
                                    ? `${window.location.host}/jeet`
                                    : "sprig.so/jeet"}
                                </span>
                                <span
                                  style={{
                                    color: "#666666",
                                    fontFamily: "monospace",
                                  }}
                                >
                                  {walletAddress.slice(0, 8)}...
                                  {walletAddress.slice(-6)}
                                </span>
                              </div>
                            </div>

                            {/* Right Image */}
                            <div
                              style={{
                                width: "180px",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                              }}
                            >
                              <img
                                src="/stickers/alfie_shok.webp"
                                alt="Sprig shocked"
                                style={{
                                  width: "140px",
                                  height: "140px",
                                  objectFit: "contain",
                                }}
                              />
                            </div>
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="grid gap-3">
                          <Button
                            onClick={downloadImage}
                            className="w-full rounded-full"
                            variant="outline"
                          >
                            <Download className="w-4 h-4 mr-2" />
                            Download Image
                          </Button>
                          <Button
                            onClick={shareOnTwitter}
                            className="w-full rounded-full bg-[#1DA1F2] hover:bg-[#1a8cd8] text-white"
                          >
                            <Twitter className="w-4 h-4 mr-2" />
                            Share on X
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>

                  <Button
                    onClick={() => {
                      setShowResults(false);
                      setWalletAddress("");
                      setAnalysisResult(null);
                      setAnalysisError(null);
                      setExpandedToken("0");
                      setShowAllTokens(false);
                    }}
                    variant="outline"
                    className="px-6 sm:px-8 py-3 sm:py-4 rounded-full font-medium text-base sm:text-lg transition-all duration-200 hover:scale-105"
                  >
                    try another
                  </Button>
                </section>
              </div>
            )}
          </div>
        </main>

        {/* Footer Links - SAME AS OTHER PAGES */}
        <footer className="fixed bottom-0 left-0 right-0 p-4 sm:p-6 bg-gradient-to-t from-background to-transparent">
          <div className="container mx-auto">
            <div className="flex justify-center gap-4 sm:gap-6">
              <Link
                to="/"
                className="text-xs sm:text-sm text-muted-foreground hover:text-primary-color transition-colors"
              >
                home
              </Link>
              <Link
                to="/burn"
                className="text-xs sm:text-sm text-muted-foreground hover:text-primary-color transition-colors"
              >
                burn tool
              </Link>
            </div>
          </div>
        </footer>

        {/* Back to Top Button */}
        {showBackToTop && (
          <button
            onClick={scrollToTop}
            className="fixed bottom-16 sm:bottom-20 right-4 sm:right-6 w-10 h-10 sm:w-12 sm:h-12 bg-primary-color/20 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-primary-color/30 transition-all duration-300 hover:scale-110"
            aria-label="Back to top"
          >
            <ArrowUp className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        )}
      </div>

      {/* Custom animations */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
          @keyframes fade-in-up {
            from {
              opacity: 0;
              transform: translateY(20px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
          
          .animate-fade-in-up {
            animation: fade-in-up 0.8s ease-out;
          }
        `,
        }}
      />
    </div>
  );
};

export default JeetAnalyzer;
