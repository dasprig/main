import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { SITE_DISPLAY_NAME, SITE_NAME_LOWER } from "@/config/siteBrand";
import { forwardRef, useState } from "react";

const FooterSection = forwardRef<HTMLElement>((_, ref) => {
  const [disclaimerOpen, setDisclaimerOpen] = useState(false);

  return (
    <footer
      ref={ref}
      className="py-16 sm:py-20 md:py-24 px-4 border-t border-border/50 opacity-0"
    >
      <div className="w-full max-w-7xl mx-auto">
        <div className="text-center py-8 sm:py-12">
          <h2 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-black leading-none text-primary-color">
            just {SITE_NAME_LOWER}
          </h2>
        </div>

        <div className="text-center pt-8 border-t border-border/30">
          <p className="text-xs sm:text-sm text-muted-foreground italic">
            not financial advice. {SITE_DISPLAY_NAME} is just art on-chain.
          </p>
          <Dialog open={disclaimerOpen} onOpenChange={setDisclaimerOpen}>
            <DialogTrigger asChild>
              <button className="text-xs sm:text-sm text-muted-foreground hover:text-primary-color underline underline-offset-2 mt-2 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary/50 rounded px-2 py-1">
                Read Full Disclaimer
              </button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh] p-0 bg-background/95 backdrop-blur-md">
              <DialogHeader className="px-6 pt-6 pb-4 border-b border-border/50">
                <DialogTitle className="text-2xl font-bold text-primary-color">
                  COMPREHENSIVE DISCLAIMER & RISK WARNING
                </DialogTitle>
                <DialogDescription className="text-sm text-muted-foreground">
                  PLEASE READ THIS ENTIRE DISCLAIMER CAREFULLY BEFORE MINTING OR
                  OTHERWISE INTERACTING WITH THIS NFT COLLECTION OR WEBSITE.
                </DialogDescription>
              </DialogHeader>
              <ScrollArea className="h-[60vh] px-6 py-4">
                <div className="space-y-6 text-sm leading-relaxed">
                  <div>
                    <p className="text-muted-foreground mb-4">
                      BY MINTING, PURCHASING, HOLDING, SELLING, OR OTHERWISE
                      INTERACTING WITH NFTS ASSOCIATED WITH {SITE_DISPLAY_NAME},
                      YOU ACKNOWLEDGE THAT YOU HAVE READ, UNDERSTOOD, AND AGREED
                      TO ALL TERMS HEREIN.
                    </p>
                  </div>

                  <div>
                    <h3 className="font-bold text-primary-color mb-2">
                      NATURE OF NFTS
                    </h3>
                    <p className="text-muted-foreground">
                      Digital collectibles may have no intrinsic value. They are
                      not investments, securities, or financial instruments.
                      Artwork and metadata may change or become unavailable.
                      Smart contracts and third-party services can fail or behave
                      unexpectedly.
                    </p>
                  </div>

                  <div>
                    <h3 className="font-bold text-destructive mb-2">
                      EXTREME FINANCIAL RISK WARNING
                    </h3>
                    <p className="text-muted-foreground">
                      Cryptocurrency and NFT markets involve extreme risk of
                      total loss. Prices are volatile. You may lose all funds
                      used for minting, gas, or trading. You should only
                      participate with money you can afford to lose entirely.
                    </p>
                  </div>

                  <div className="bg-destructive/10 rounded-lg p-4">
                    <h3 className="font-bold text-destructive mb-2">
                      FINAL WARNINGS
                    </h3>
                    <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-4">
                      <li>NFTS MAY HAVE ZERO RESALE VALUE</li>
                      <li>YOU MAY LOSE ALL FUNDS YOU SPEND</li>
                      <li>SMART CONTRACT AND PROTOCOL RISKS APPLY</li>
                      <li>THERE IS NO GUARANTEE OF FUTURE UTILITY OR ROYALTIES</li>
                      <li>THIS IS NOT FINANCIAL OR LEGAL ADVICE</li>
                      <li>WE ARE NOT RESPONSIBLE FOR THIRD-PARTY SERVICES</li>
                      <li>PROCEED AT YOUR OWN RISK</li>
                    </ul>
                  </div>

                  <div className="text-center space-y-4 py-4">
                    <p className="text-primary-color italic">
                      {SITE_DISPLAY_NAME} is a creative project. Please be
                      responsible and verify everything on-chain yourself.
                    </p>
                  </div>

                  <div className="bg-destructive/20 rounded-lg p-4 text-center">
                    <p className="font-bold text-destructive uppercase mb-2">
                      IF YOU ARE UNSURE WHETHER TO MINT, DO NOT MINT.
                    </p>
                    <p className="text-muted-foreground">
                      ONLY PARTICIPATE IF YOU UNDERSTAND BLOCKCHAIN RISKS AND
                      ACCEPT THAT YOU MAY RECEIVE NO RETURN.
                    </p>
                  </div>

                  <div className="text-center py-4">
                    <p className="text-accent-color italic">
                      Thanks for checking out {SITE_DISPLAY_NAME}. Stay safe out
                      there.
                    </p>
                  </div>
                </div>
              </ScrollArea>
              <div className="px-6 py-4 border-t border-border/50 bg-background/95">
                <Button
                  onClick={() => setDisclaimerOpen(false)}
                  className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  I Understand the Risks
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </footer>
  );
});

FooterSection.displayName = "FooterSection";

export default FooterSection;
