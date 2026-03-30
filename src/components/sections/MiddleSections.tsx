import { forwardRef } from "react";
import { SITE_NAME_LOWER } from "@/config/siteBrand";

interface MiddleSectionsProps {
  contractRef: React.RefObject<HTMLElement | null>;
  wordsRef: React.RefObject<HTMLElement | null>;
}

const MiddleSections = forwardRef<HTMLDivElement, MiddleSectionsProps>(
  ({ contractRef, wordsRef }, ref) => {
    return (
      <div ref={ref}>
        <section
          ref={contractRef}
          id="contract-section"
          className="py-12 sm:py-16 px-4 opacity-0"
        >
          <div className="w-full max-w-4xl mx-auto">
            <div className="bg-card/30 backdrop-blur-sm rounded-2xl p-6 sm:p-8 text-center transition-all duration-300 hover:bg-card/40">
              <h3 className="text-xl sm:text-2xl md:text-3xl font-bold text-primary-color mb-4">
                Contract address (CA)
              </h3>
              <p
                className="inline-block rounded-full border border-primary-color/40 bg-primary/10 px-6 py-2 text-base sm:text-lg font-semibold uppercase tracking-widest text-primary-color"
                aria-live="polite"
              >
                Coming soon
              </p>
              <p className="text-sm text-muted-foreground mt-5 max-w-md mx-auto">
                The token contract address will be shared here when it goes
                live.
              </p>
            </div>
          </div>
        </section>

        {/* Words Section */}
        <section
          ref={wordsRef}
          className="py-12 sm:py-16 md:py-20 px-4 opacity-0"
        >
          <div className="w-full max-w-6xl mx-auto">
            <div className="text-center space-y-8 sm:space-y-12 md:space-y-16">
              <div className="flex flex-wrap justify-center items-center gap-2 sm:gap-3 md:gap-4 text-xl sm:text-2xl md:text-3xl lg:text-4xl xl:text-5xl font-medium">
                <span
                  className="text-primary-color px-2 sm:px-3 py-1 rounded-full transition-all duration-300 hover:bg-primary/10 hover:scale-110 cursor-default focus:outline-none focus:ring-2 focus:ring-primary/50"
                  tabIndex={0}
                >
                  diamond
                </span>
                <span className="text-secondary-color text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl">
                  ×
                </span>
                <span
                  className="px-2 sm:px-3 py-1 rounded-full transition-all duration-300 hover:bg-primary/10 hover:scale-110 cursor-default focus:outline-none focus:ring-2 focus:ring-primary/50"
                  tabIndex={0}
                >
                  hands
                </span>
                <span className="text-accent-color text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl">
                  ×
                </span>
                <span
                  className="text-secondary-color px-2 sm:px-3 py-1 rounded-full transition-all duration-300 hover:bg-primary/10 hover:scale-110 cursor-default focus:outline-none focus:ring-2 focus:ring-primary/50"
                  tabIndex={0}
                >
                  moon
                </span>
              </div>

              <div className="flex flex-wrap justify-center items-center gap-2 sm:gap-3 md:gap-4 text-xl sm:text-2xl md:text-3xl lg:text-4xl xl:text-5xl font-medium">
                <span
                  className="text-accent-color px-2 sm:px-3 py-1 rounded-full transition-all duration-300 hover:bg-primary/10 hover:scale-110 cursor-default focus:outline-none focus:ring-2 focus:ring-primary/50"
                  tabIndex={0}
                >
                  community
                </span>
                <span className="text-primary-color text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl">
                  ×
                </span>
                <span
                  className="px-2 sm:px-3 py-1 rounded-full transition-all duration-300 hover:bg-primary/10 hover:scale-110 cursor-default focus:outline-none focus:ring-2 focus:ring-primary/50"
                  tabIndex={0}
                >
                  first
                </span>
                <span className="text-secondary-color text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl">
                  ×
                </span>
                <span
                  className="px-2 sm:px-3 py-1 rounded-full transition-all duration-300 hover:bg-primary/10 hover:scale-110 cursor-default focus:outline-none focus:ring-2 focus:ring-primary/50"
                  tabIndex={0}
                >
                  always
                </span>
              </div>

              <div className="flex flex-wrap justify-center items-center gap-2 sm:gap-3 md:gap-4 text-xl sm:text-2xl md:text-3xl lg:text-4xl xl:text-5xl font-medium">
                <span
                  className="px-2 sm:px-3 py-1 rounded-full transition-all duration-300 hover:bg-primary/10 hover:scale-110 cursor-default focus:outline-none focus:ring-2 focus:ring-primary/50"
                  tabIndex={0}
                >
                  wagmi
                </span>
                <span className="text-accent-color text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl">
                  ×
                </span>
                <span
                  className="text-primary-color px-2 sm:px-3 py-1 rounded-full transition-all duration-300 hover:bg-primary/10 hover:scale-110 cursor-default focus:outline-none focus:ring-2 focus:ring-primary/50"
                  tabIndex={0}
                >
                  together
                </span>
                <span className="text-secondary-color text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl">
                  ×
                </span>
                <span
                  className="px-2 sm:px-3 py-1 rounded-full transition-all duration-300 hover:bg-primary/10 hover:scale-110 cursor-default focus:outline-none focus:ring-2 focus:ring-primary/50"
                  tabIndex={0}
                >
                  strong
                </span>
              </div>

              <div className="flex flex-wrap justify-center items-center gap-2 sm:gap-3 md:gap-4 text-xl sm:text-2xl md:text-3xl lg:text-4xl xl:text-5xl font-medium">
                <span
                  className="text-secondary-color px-2 sm:px-3 py-1 rounded-full transition-all duration-300 hover:bg-primary/10 hover:scale-110 cursor-default focus:outline-none focus:ring-2 focus:ring-primary/50"
                  tabIndex={0}
                >
                  {SITE_NAME_LOWER}
                </span>
                <span className="text-primary-color text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl">
                  ×
                </span>
                <span
                  className="text-accent-color px-2 sm:px-3 py-1 rounded-full transition-all duration-300 hover:bg-primary/10 hover:scale-110 cursor-default focus:outline-none focus:ring-2 focus:ring-primary/50"
                  tabIndex={0}
                >
                  vibes
                </span>
                <span className="text-accent-color text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl">
                  ×
                </span>
                <span
                  className="px-2 sm:px-3 py-1 rounded-full transition-all duration-300 hover:bg-primary/10 hover:scale-110 cursor-default focus:outline-none focus:ring-2 focus:ring-primary/50"
                  tabIndex={0}
                >
                  only
                </span>
              </div>
            </div>
          </div>
        </section>
      </div>
    );
  }
);

MiddleSections.displayName = "MiddleSections";

export default MiddleSections;
