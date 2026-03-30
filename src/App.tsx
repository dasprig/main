import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { lazy, Suspense } from "react";
import { WalletProvider } from "./components/WalletProvider";

// Lazy load pages for better performance
const Index = lazy(() => import("./pages/Index"));
const TokenBurnTool = lazy(() => import("./pages/TokenBurnTool"));
const JeetAnalyzer = lazy(() => import("./pages/JeetAnalyzer"));
const NotFound = lazy(() => import("./pages/NotFound"));

// Loading component
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="text-center">
      <div className="w-16 h-16 border-4 border-primary-color border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
      <p className="text-muted-foreground">Loading...</p>
    </div>
  </div>
);

const App = () => (
  <TooltipProvider>
    <Toaster />
    <Sonner />
    <BrowserRouter>
      <WalletProvider>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            
            <Route path="/" element={<Index />} />
            <Route path="/burn" element={<TokenBurnTool />} />
            {/* <Route path="/jeet" element={<JeetAnalyzer />} /> */}
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </WalletProvider>
    </BrowserRouter>
  </TooltipProvider>
);

export default App;
