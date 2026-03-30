import { Button } from "@/components/ui/button";
import { SITE_NAME_LOWER } from "@/config/siteBrand";
import { memo, useCallback, useMemo } from "react";
import LazyImage from "./LazyImage";

interface OptimizedHeroSectionProps {
  heroVisible: boolean;
  imagesLoaded: Set<string>;
  scrollToSection: (ref: React.RefObject<HTMLElement>) => void;
  contractRef: React.RefObject<HTMLElement>;
  galleryRef: React.RefObject<HTMLElement>;
  oneOfOnesRef: React.RefObject<HTMLElement>;
  stickersRef: React.RefObject<HTMLElement>;
  v1SprigRef: React.RefObject<HTMLElement>;
  tokenomicsRef: React.RefObject<HTMLElement>;
  handleSocialClick: (platform: string, url?: string) => void;
  handleKeyDown: (event: React.KeyboardEvent, action: () => void) => void;
}

// Memoized social button to prevent re-renders
const SocialButton = memo(
  ({
    platform,
    url,
    ariaLabel,
    onClick,
    children,
  }: {
    platform: string;
    url?: string;
    ariaLabel: string;
    onClick: (platform: string, url?: string) => void;
    children: React.ReactNode;
  }) => {
    const handleClick = useCallback(() => {
      onClick(platform, url);
    }, [platform, url, onClick]);

    return (
      <button
        onClick={handleClick}
        className="w-6 h-6 sm:w-8 sm:h-8 text-muted-foreground hover:text-primary transition-all duration-200 hover:scale-110 focus:outline-none focus:ring-2 focus:ring-primary/50 rounded will-change-transform"
        aria-label={ariaLabel}
      >
        {children}
      </button>
    );
  }
);

SocialButton.displayName = "SocialButton";

// Memoized navigation button
const NavButton = memo(
  ({
    text,
    onClick,
    targetRef,
  }: {
    text: string;
    onClick: (ref: React.RefObject<HTMLElement>) => void;
    targetRef: React.RefObject<HTMLElement>;
  }) => {
    const handleClick = useCallback(() => {
      onClick(targetRef);
    }, [onClick, targetRef]);

    return (
      <button
        onClick={handleClick}
        className="bg-card/30 backdrop-blur-sm px-4 py-2 rounded-full text-sm font-medium text-foreground hover:bg-card/50 hover:text-primary transition-all duration-200 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-primary/50 will-change-transform"
      >
        {text}
      </button>
    );
  }
);

NavButton.displayName = "NavButton";

const OptimizedHeroSection = memo(
  ({
    heroVisible,
    imagesLoaded,
    scrollToSection,
    contractRef,
    galleryRef,
    oneOfOnesRef,
    stickersRef,
    v1SprigRef,
    tokenomicsRef,
    handleSocialClick,
    handleKeyDown,
  }: OptimizedHeroSectionProps) => {
    // Memoize animation classes
    const sectionClasses = useMemo(
      () =>
        `min-h-screen flex flex-col transition-all duration-1000 ease-out ${
          heroVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
        }`,
      [heroVisible]
    );

    const headerClasses = useMemo(
      () =>
        `py-6 text-center transition-all duration-1000 delay-100 ease-out ${
          heroVisible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-4"
        }`,
      [heroVisible]
    );

    const imageContainerClasses = useMemo(
      () =>
        `relative transition-all duration-1200 delay-300 ease-out ${
          heroVisible
            ? "opacity-100 translate-y-0 scale-100"
            : "opacity-0 translate-y-12 scale-95"
        }`,
      [heroVisible]
    );

    const titleClasses = useMemo(
      () =>
        `text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-bold transition-all duration-1000 delay-500 ease-out hover:text-primary/90 ${
          heroVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
        }`,
      [heroVisible]
    );

    const buttonContainerClasses = useMemo(
      () =>
        `py-4 transition-all duration-1000 delay-700 ease-out ${
          heroVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
        }`,
      [heroVisible]
    );

    const navLinksClasses = useMemo(
      () =>
        `flex flex-wrap justify-center gap-3 sm:gap-4 mb-6 transition-all duration-1000 delay-900 ease-out ${
          heroVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
        }`,
      [heroVisible]
    );

    const socialIconsClasses = useMemo(
      () =>
        `flex justify-center gap-4 sm:gap-6 transition-all duration-1000 delay-1100 ease-out ${
          heroVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
        }`,
      [heroVisible]
    );

    // Memoize navigation items
    const navigationItems = useMemo(
      () => [
        { text: "gallery", ref: galleryRef },
        { text: "stickers", ref: stickersRef },
        { text: "1/1's", ref: oneOfOnesRef },
        { text: `v1 ${SITE_NAME_LOWER}`, ref: v1SprigRef },
        { text: "tokenomics", ref: tokenomicsRef },
      ],
      [galleryRef, stickersRef, oneOfOnesRef, v1SprigRef, tokenomicsRef]
    );

    // Memoize social items
    const socialItems = useMemo(
      () => [
        {
          platform: "Twitter",
          url: "https://x.com/alfiedotso",
          ariaLabel: "Twitter",
          icon: (
            <svg fill="currentColor" viewBox="0 0 24 24">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
          ),
        },
        {
          platform: "Telegram",
          url: "https://t.me/alfiedotso",
          ariaLabel: "Telegram",
          icon: (
            <svg fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.15-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z" />
            </svg>
          ),
        },
        {
          platform: "DexScreener",
          url: "https://dexscreener.com/solana/E8HYPNXeXk5tjd1z3Se1qDBuVkjKvj7gEsKriRYtjups",
          ariaLabel: "DexScreener",
          icon: (
            <img
              src="/icons/dex-screener-seeklogo.svg"
              alt="DexScreener"
              className="w-full h-full object-contain opacity-60 hover:opacity-100 transition-opacity duration-200"
            />
          ),
        },
      ],
      []
    );

    const handleScrollToContract = useCallback(() => {
      scrollToSection(contractRef);
    }, [scrollToSection, contractRef]);

    return (
      <section
        className={sectionClasses}
        style={{
          willChange: heroVisible ? "auto" : "opacity, transform",
          backfaceVisibility: "hidden",
          transform: "translateZ(0)",
        }}
      >
        {/* Header */}
        <header className={headerClasses}>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold">
            {SITE_NAME_LOWER}
          </h1>
        </header>

        {/* Main Content */}
        <div className="flex-1 flex flex-col items-center justify-center px-4 py-8">
          <div className="w-full max-w-4xl mx-auto text-center space-y-8">
            {/* Hero image */}
            <div className={imageContainerClasses}>
              <LazyImage
                src="/alfie.jpg"
                alt={`${SITE_NAME_LOWER} memecoin`}
                className="w-48 h-48 sm:w-56 sm:h-56 md:w-72 md:h-72 lg:w-80 lg:h-80 mx-auto rounded-full hover:scale-105 focus:scale-105 transition-transform duration-500"
                style={{
                  filter: "drop-shadow(0 4px 20px rgba(224, 122, 93, 0.15))",
                }}
                priority="high"
                onLoad={() => {}}
              />
            </div>

            {/* Main Title */}
            <h2 className={titleClasses}>hey anon</h2>

            {/* CTA Button */}
            <div className={buttonContainerClasses}>
              <Button
                onClick={handleScrollToContract}
                className="bg-primary text-primary-foreground px-6 sm:px-8 py-3 sm:py-4 rounded-full font-medium text-base sm:text-lg transition-all duration-200 hover:scale-105 active:scale-100 shadow-sm hover:shadow-md focus:outline-none focus:ring-4 focus:ring-primary/30 will-change-transform"
              >
                its {SITE_NAME_LOWER}
              </Button>
            </div>

            {/* Navigation Links */}
            <div className={navLinksClasses}>
              {navigationItems.map((item) => (
                <NavButton
                  key={item.text}
                  text={item.text}
                  onClick={scrollToSection}
                  targetRef={item.ref}
                />
              ))}
            </div>

            {/* Social Icons */}
            <div className={socialIconsClasses}>
              {socialItems.map((item) => (
                <SocialButton
                  key={item.platform}
                  platform={item.platform}
                  url={item.url}
                  ariaLabel={item.ariaLabel}
                  onClick={handleSocialClick}
                >
                  {item.icon}
                </SocialButton>
              ))}
            </div>
          </div>
        </div>
      </section>
    );
  }
);

OptimizedHeroSection.displayName = "OptimizedHeroSection";

export default OptimizedHeroSection;
