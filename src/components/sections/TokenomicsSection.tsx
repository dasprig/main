import { forwardRef } from "react";

const TokenomicsSection = forwardRef<HTMLElement>((_, ref) => {
  return (
    <section ref={ref} className="py-12 sm:py-16 md:py-20 px-4 opacity-0">
      <div className="w-full max-w-4xl mx-auto">
        <h3 className="text-2xl sm:text-3xl md:text-4xl font-bold text-center text-primary-color mb-8 sm:mb-12">
          tokenomics
        </h3>

        {/* Simple Distribution */}
        <div className="space-y-8 mb-12">
          {/* Total Supply */}
          <div className="text-center">
            <p className="text-3xl sm:text-4xl md:text-5xl font-bold text-primary-color mb-2">
              1,000,000,000
            </p>
            <p className="text-lg sm:text-xl text-muted-foreground">
              total supply
            </p>
          </div>

          {/* Distribution Bars */}
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between items-baseline">
                <span className="text-base sm:text-lg font-medium">
                  public liquidity
                </span>
                <span className="text-2xl sm:text-3xl font-bold text-primary-color">
                  50%
                </span>
              </div>
              <div className="h-12 bg-card/30 rounded-xl overflow-hidden">
                <div
                  className="h-full bg-primary/80 rounded-xl"
                  style={{ width: "50%" }}
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-baseline">
                <span className="text-base sm:text-lg font-medium">
                  daily burn pool
                </span>
                <span className="text-2xl sm:text-3xl font-bold text-accent-color">
                  50%
                </span>
              </div>
              <div className="h-12 bg-card/30 rounded-xl overflow-hidden">
                <div
                  className="h-full bg-accent/80 rounded-xl"
                  style={{ width: "50%" }}
                />
              </div>
              <p className="text-sm text-muted-foreground">
                burns 0.28% daily for 6 months
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
});

TokenomicsSection.displayName = "TokenomicsSection";

export default TokenomicsSection;
